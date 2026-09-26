/**
 * Read the remote canteen catalogue and prepare synthetic review examples.
 * This script only reads shops/products and writes a local JSON/CSV extract.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
const OUTPUT_DIR = path.join(ROOT, 'data/canteen-product-reviews');

function dbConfig() {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.RAILWAY_MYSQL_URL;
  if (uri) return { uri, multipleStatements: true };
  return {
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jack_campus', multipleStatements: true,
  };
}

const COMPONENTS = [
  ['牛肉|牛腩|牛柳|牛排|beef', '牛肉'], ['鸡肉|鸡丁|鸡扒|鸡排|chicken', '鸡肉'], ['猪肉|猪扒|叉烧|pork', '猪肉'], ['鸭|duck', '鸭肉'],
  ['鱼|fish|salmon|tuna|saba', '鱼肉'], ['虾|shrimp|prawn|ebi', '虾'], ['蟹|crab|kani', '蟹肉'],
  ['鱿鱼|squid|idako', '鱿鱼'], ['鳗鱼|unagi|eel', '鳗鱼'], ['鸡蛋|egg|tamago', '鸡蛋'],
  ['番茄|tomato', '番茄'], ['土豆|potato', '土豆'], ['玉米|corn', '玉米'], ['蘑菇|mushroom', '蘑菇'],
  ['芒果|mango', '芒果'], ['苹果|apple', '苹果'], ['橙|orange', '橙子'], ['西瓜|watermelon', '西瓜'],
  ['香蕉|banana', '香蕉'], ['牛油果|avocado', '牛油果'], ['草莓|strawberry', '草莓'], ['奇异果|kiwi', '奇异果'],
  ['面|noodle|ramen|spaghetti|pasta|mee', '面条'], ['饭|rice|don|bowl|fried rice', '米饭'],
  ['寿司|sushi|maki|sashimi', '寿司'], ['咖啡|coffee|latte|espresso', '咖啡'], ['茶|tea|matcha', '茶'],
  ['果汁|juice', '果汁'], ['汉堡|burger', '汉堡'], ['披萨|pizza', '披萨'], ['火锅|hotpot|claypot', '锅物'],
  ['汤|soup', '汤'], ['炸|fried|tempura|crispy|katsu', '酥脆口感'], ['烤|grilled|roast|yaki', '烤制香气'],
  ['辣|spicy|chili|curry|sambal', '辣味'], ['奶|milk|yogurt', '奶香'], ['甜|sweet|dessert|cake|chocolate', '甜味'],
];

const REVIEW_TEMPLATES = [
  ['第一口印象', ({ name, focus }) => `第一口先尝到${focus}的味道，层次很清楚；${name}适合趁热吃，香气会更完整。`],
  ['风味平衡', ({ name, focus }) => `${name}把${focus}的味道收得比较平衡，不会只剩单一的咸或甜；喜欢清爽口味的话可以少加酱汁。`],
  ['口感变化', ({ name, focus }) => `这道${name}有意思的地方在口感变化：${focus}带来不同的咀嚼感，慢慢吃比急着吞更能尝出细节。`],
  ['香气表现', ({ name, focus }) => `端上来时${focus}的香气很先声夺人，入口后味道也跟得上；作为一餐里的主角很合适。`],
  ['食材搭配', ({ name, focus }) => `从${focus}的搭配看，食材之间没有互相抢味，${name}吃起来有自己的重点，配一杯清饮会更舒服。`],
  ['收尾回味', ({ name, focus }) => `咽下去以后还能留住一点${focus}的回味，${name}不是只靠第一口取胜，后段味道也有记忆点。`],
  ['日常满足', ({ name, focus }) => `想吃得踏实的时候可以点${name}：${focus}让味道有内容，分量和满足感也比较适合日常解决一餐。`],
  ['口味建议', ({ name, focus }) => `如果平时喜欢${focus}，这道${name}值得试试；怕重口的话先从少辣、少酱开始，更容易吃到原本的味道。`],
  ['场景感受', ({ name, focus }) => `一个人吃${name}很顺手，和朋友分着吃也不会无聊；${focus}的味道够明确，聊天间隙也能吃出滋味。`],
  ['复购判断', ({ name, focus }) => `这道${name}的优点是${focus}各有分工，吃完不会觉得味道散；如果这次合口味，下次还会想再点。`],
];

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function hash(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function scoreFor(productId, variant) { return 6 + (parseInt(hash(`${productId}:${variant}`).slice(0, 8), 16) % 5); }
function ratingFor(score) { return ['拉完了', 'NPC', '人上人', '顶级', '夯爆了'][score - 6]; }
function componentsFor(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();
  const found = COMPONENTS.filter(([pattern]) => new RegExp(pattern, 'i').test(text)).map(([, label]) => label);
  return [...new Set(found)].slice(0, 4);
}
function buildComment(product, variant) {
  const name = clean(product.product_name);
  const components = componentsFor(name, product.description);
  const focus = components.length ? components.join('、') : '整体风味';
  const baseTemplateIndex = parseInt(hash(`${product.id}:template`).slice(0, 8), 16) % REVIEW_TEMPLATES.length;
  const templateIndex = (baseTemplateIndex + variant) % REVIEW_TEMPLATES.length;
  const [templateName, template] = REVIEW_TEMPLATES[templateIndex];
  return { content: `[示例评价] ${template({ name, focus })}`, template_index: templateIndex + 1, template_name: templateName };
}

async function main() {
  const conn = await mysql.createConnection(dbConfig());
  try {
    const [shops] = await conn.query(`
      SELECT s.id, s.name, r.code AS region_code, COUNT(p.id) AS product_count
      FROM shops s
      LEFT JOIN regions r ON r.id = s.region_id
      LEFT JOIN products p ON p.shop_id = s.id AND p.deleted_at IS NULL
      WHERE s.deleted_at IS NULL
      GROUP BY s.id, s.name, r.code
      ORDER BY s.id`);
    const [products] = await conn.query(`
      SELECT p.id, p.shop_id, s.name AS shop_name, p.name AS product_name, p.description, p.price
      FROM products p
      INNER JOIN shops s ON s.id = p.shop_id AND s.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      ORDER BY p.shop_id, p.id`);
    const byShop = new Map();
    for (const product of products) {
      if (!byShop.has(product.shop_id)) byShop.set(product.shop_id, []);
      byShop.get(product.shop_id).push(product);
    }

    const records = [];
    const shopReport = shops.map((shop) => {
      const selected = (byShop.get(shop.id) || []).slice(0, 5);
      for (const product of selected) {
        for (let variant = 0; variant < 2; variant += 1) {
          const score = scoreFor(product.id, variant);
          records.push({
            shop_id: product.shop_id,
            shop_name: product.shop_name,
            region_code: shop.region_code,
            product_id: product.id,
            product_name: clean(product.product_name),
            teacher: null,
            score,
            rating: ratingFor(score),
            variant: variant + 1,
            ...buildComment(product, variant),
            source_key: hash(`canteen-product:${product.id}:${variant + 1}`).slice(0, 24),
          });
        }
      }
      return { shop_id: shop.id, shop_name: shop.name, available_products: Number(shop.product_count), selected_products: selected.length, shortfall: Math.max(0, 5 - selected.length) };
    });
    const report = {
      generated_at: new Date().toISOString(),
      shop_count: shops.length,
      product_count: products.length,
      selected_shop_count: shopReport.length,
      selected_product_count: shopReport.reduce((sum, item) => sum + item.selected_products, 0),
      review_count: records.length,
      expected_reviews_per_selected_product: 2,
      shortfall_shops: shopReport.filter((item) => item.shortfall > 0),
      score_range: [6, 10],
      rating_mapping: { 6: '拉完了', 7: 'NPC', 8: '人上人', 9: '顶级', 10: '夯爆了' },
      review_template_count: REVIEW_TEMPLATES.length,
      review_templates: REVIEW_TEMPLATES.map(([name]) => name),
      notes: [
        '评价为根据菜品名称/说明生成的示例文本，统一带有“示例评价”标记，不代表真实用餐体验。',
        '文案模板参考 docs/research/food-review-copy-templates.md；同一道菜的两条评价使用不同模板。',
        '每家店最多选择前 5 道未删除菜品，按 product_id 稳定选择。',
        '3 家店不足 5 道菜，未重复伪造菜品，实际按可用数量生成。',
      ],
      shops: shopReport,
    };
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'canteen-product-reviews.json'), JSON.stringify(records, null, 2), 'utf8');
    const header = ['shop_id', 'shop_name', 'region_code', 'product_id', 'product_name', 'score', 'rating', 'variant', 'template_index', 'template_name', 'content', 'source_key'];
    const csv = [header.join(','), ...records.map((row) => header.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'canteen-product-reviews.csv'), `\ufeff${csv}\n`, 'utf8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'canteen-product-reviews.report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ shopCount: shops.length, productCount: products.length, selectedProducts: report.selected_product_count, reviewCount: records.length, shortfallShops: report.shortfall_shops }, null, 2));
  } finally { await conn.end(); }
}

main().catch((error) => { console.error(`[canteen-prepare] ${error.message}`); process.exitCode = 1; });
