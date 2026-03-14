/**
 * 批量导入商品（品名、价格、简介）到指定店铺下的指定分类
 *
 * 使用前：确保 .env 中数据库配置正确，在项目根目录执行。
 *
 * 用法一：指定数据文件 + 店铺 ID + 分类 ID
 *   node scripts/bulk-import-products.js --file=scripts/products-to-import.json --shop-id=1 --category-id=2
 *
 * 用法二：指定数据文件 + 店铺 ID + 分类名称（按名称查找分类）
 *   node scripts/bulk-import-products.js --file=scripts/products-to-import.json --shop-id=1 --category-name=热菜
 *
 * 用法三：数据文件内包含 shopId / categoryId 或 categoryName
 *   node scripts/bulk-import-products.js --file=scripts/products-to-import.json
 *   文件格式见 products-to-import.example.json
 *
 * 数据文件格式（二选一）：
 *   A) 纯数组，需配合 --shop-id 与 --category-id/--category-name：
 *      [ { "name": "宫保鸡丁", "price": 12.5, "description": "经典川菜" }, ... ]
 *   B) 带元数据的对象：
 *      { "shopId": 1, "categoryId": 2, "products": [ { "name": "...", "price": 10, "description": "..." }, ... ] }
 *      或 "categoryName": "热菜" 代替 "categoryId"
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../database');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { file: path.join(__dirname, 'products-to-import.json'), shopId: null, categoryId: null, categoryName: null };
  for (const a of args) {
    if (a.startsWith('--file=')) out.file = a.slice(7).trim();
    else if (a.startsWith('--shop-id=')) out.shopId = parseInt(a.slice(10), 10);
    else if (a.startsWith('--category-id=')) out.categoryId = parseInt(a.slice(14), 10);
    else if (a.startsWith('--category-name=')) out.categoryName = a.slice(16).trim();
  }
  return out;
}

function loadData(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error('文件不存在:', abs);
    process.exit(1);
  }
  const raw = fs.readFileSync(abs, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('JSON 解析失败:', e.message);
    process.exit(1);
  }
}

function normalizeProducts(data) {
  if (Array.isArray(data)) {
    return { products: data, shopId: null, categoryId: null, categoryName: null };
  }
  if (data && typeof data === 'object' && Array.isArray(data.products)) {
    return {
      products: data.products,
      shopId: data.shopId != null ? data.shopId : null,
      categoryId: data.categoryId != null ? data.categoryId : null,
      categoryName: data.categoryName != null ? String(data.categoryName).trim() : null
    };
  }
  console.error('数据格式错误：应为数组或 { products: [...] }，且每项包含 name');
  process.exit(1);
}

async function resolveCategoryId(shopId, categoryId, categoryName) {
  if (categoryId) {
    const rows = await query(
      'SELECT id FROM product_categories WHERE id = ? AND shop_id = ? AND deleted_at IS NULL',
      [categoryId, shopId]
    );
    if (!rows || rows.length === 0) {
      console.error('分类不存在或不属于该店铺: categoryId=', categoryId, 'shopId=', shopId);
      process.exit(1);
    }
    return categoryId;
  }
  if (categoryName) {
    const rows = await query(
      'SELECT id FROM product_categories WHERE shop_id = ? AND name = ? AND deleted_at IS NULL',
      [shopId, categoryName]
    );
    if (!rows || rows.length === 0) {
      console.error('分类不存在: shopId=', shopId, 'categoryName=', categoryName);
      process.exit(1);
    }
    return rows[0].id;
  }
  console.error('必须指定 --category-id 或 --category-name，或在数据文件中提供 categoryId/categoryName');
  process.exit(1);
}

async function main() {
  const args = parseArgs();
  const data = loadData(args.file);
  const { products, shopId: dataShopId, categoryId: dataCategoryId, categoryName: dataCategoryName } = normalizeProducts(data);

  const shopId = args.shopId != null ? args.shopId : dataShopId;
  if (shopId == null || !Number.isInteger(shopId)) {
    console.error('请指定 --shop-id=数字 或在数据文件中提供 shopId');
    process.exit(1);
  }

  const categoryId = await resolveCategoryId(
    shopId,
    args.categoryId != null ? args.categoryId : dataCategoryId,
    args.categoryName || dataCategoryName
  );

  const shops = await query('SELECT id FROM shops WHERE id = ? AND deleted_at IS NULL', [shopId]);
  if (!shops || shops.length === 0) {
    console.error('店铺不存在: shopId=', shopId);
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    const name = row && (row.name != null) ? String(row.name).trim() : '';
    if (!name) {
      skipped++;
      continue;
    }
    const description = row.description != null ? String(row.description).trim() : null;
    const price = row.price != null && row.price !== '' ? parseFloat(row.price) : null;
    const priceValid = price === null || Number.isFinite(price);

    try {
      if (priceValid) {
        await query(
          'INSERT INTO products (shop_id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)',
          [shopId, categoryId, name, description || null, price]
        );
      } else {
        await query(
          'INSERT INTO products (shop_id, category_id, name, description) VALUES (?, ?, ?, ?)',
          [shopId, categoryId, name, description || null]
        );
      }
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      if (msg.includes('Duplicate') || msg.includes('ER_DUP_ENTRY')) {
        skipped++;
        continue;
      }
      console.error('插入失败:', name, err.message);
      process.exit(1);
    }
    inserted++;
  }

  console.log(`✅ 导入完成：成功 ${inserted} 条，跳过 ${skipped} 条（无名称或重复）。店铺 ID=${shopId}，分类 ID=${categoryId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
