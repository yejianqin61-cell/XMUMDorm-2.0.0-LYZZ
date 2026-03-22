/**
 * 诊断分区商品榜为何为空：各 region 下店铺数、带一级点评的商品数、rating 分布等。
 * 在项目根目录执行：node scripts/debug-region-ranking.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../database');

async function main() {
  console.log('--- regions ---');
  const regions = await query(
    'SELECT id, code, name FROM regions ORDER BY sort_order ASC, id ASC'
  );
  console.table(regions);

  console.log('\n--- 各分区：未删除店铺数 ---');
  const shops = await query(
    `SELECT r.code, COUNT(*) AS shops
     FROM shops s
     JOIN regions r ON r.id = s.region_id
     WHERE s.deleted_at IS NULL
     GROUP BY r.id, r.code
     ORDER BY r.id`
  );
  console.table(shops);

  console.log('\n--- 一级点评（parent_id IS NULL，未删除）条数、按 rating ---');
  const ratings = await query(
    `SELECT rating, COUNT(*) AS cnt
     FROM product_comments
     WHERE (parent_id IS NULL OR parent_id = 0)
       AND (deleted_at IS NULL)
     GROUP BY rating
     ORDER BY cnt DESC`
  );
  console.table(ratings);

  console.log('\n--- 各分区：可上榜商品数（与榜单 SQL 条件一致）---');
  for (const reg of regions || []) {
    const rid = reg.id;
    const rows = await query(
      `SELECT COUNT(*) AS cnt
       FROM products p
       INNER JOIN shops s ON p.shop_id = s.id AND s.deleted_at IS NULL AND s.region_id = ?
       LEFT JOIN (
         SELECT product_id, COUNT(*) AS cc
         FROM product_comments
         WHERE (parent_id IS NULL OR parent_id = 0) AND deleted_at IS NULL
           AND rating IN ('夯爆了','顶级','人上人','NPC','拉完了')
         GROUP BY product_id
       ) ca ON ca.product_id = p.id
       WHERE p.deleted_at IS NULL
         AND (
           (ca.cc IS NOT NULL AND ca.cc > 0)
           OR (p.review_count > 0 AND p.comprehensive_score IS NOT NULL)
         )`,
      [rid]
    );
    const cnt = rows && rows[0] ? rows[0].cnt : 0;
    console.log(`  ${reg.code} (id=${rid}): ${cnt}`);
  }

  console.log('\n--- 若上面全是 0：检查「点评所在店铺」的 region_id 是否与预期分区一致 ---');
  const sample = await query(
    `SELECT r.code AS shop_region, COUNT(DISTINCT pc.product_id) AS products_with_primary_comments
     FROM product_comments pc
     JOIN products p ON p.id = pc.product_id AND p.deleted_at IS NULL
     JOIN shops s ON s.id = p.shop_id AND s.deleted_at IS NULL
     JOIN regions r ON r.id = s.region_id
     WHERE (pc.parent_id IS NULL OR pc.parent_id = 0) AND pc.deleted_at IS NULL
     GROUP BY r.id, r.code
     ORDER BY r.id`
  );
  console.table(sample);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
