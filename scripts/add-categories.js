/**
 * 为指定店铺插入新分类（直接写库）
 * 用法：node scripts/add-categories.js <shopId> "分类名1" "分类名2" ...
 * 示例：node scripts/add-categories.js 3 "dumplings饺子" "add on加料" "beverage饮料"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../database');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('用法: node scripts/add-categories.js <shopId> "分类名1" "分类名2" ...');
    process.exit(1);
  }
  const shopId = parseInt(args[0], 10);
  if (!shopId) {
    console.error('shopId 必须为正整数');
    process.exit(1);
  }
  const names = args.slice(1).map((s) => String(s).trim()).filter(Boolean);
  if (names.length === 0) {
    console.error('请至少提供一个分类名');
    process.exit(1);
  }

  const shops = await query('SELECT id FROM shops WHERE id = ? AND deleted_at IS NULL', [shopId]);
  if (!shops || shops.length === 0) {
    console.error('店铺不存在: shopId=', shopId);
    process.exit(1);
  }

  const maxOrder = await query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM product_categories WHERE shop_id = ? AND deleted_at IS NULL',
    [shopId]
  );
  let sortOrder = (maxOrder && maxOrder[0] && maxOrder[0].next_order != null) ? maxOrder[0].next_order : 0;

  for (const name of names) {
    await query('INSERT INTO product_categories (shop_id, name, sort_order) VALUES (?, ?, ?)', [shopId, name, sortOrder]);
    sortOrder++;
  }

  const rows = await query(
    'SELECT id, name, sort_order FROM product_categories WHERE shop_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC',
    [shopId]
  );
  console.log('✅ 已为店铺', shopId, '添加', names.length, '个分类，当前该店铺全部分类：');
  rows.forEach((r) => console.log('  id=', r.id, ' sort_order=', r.sort_order, ' name=', r.name));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
