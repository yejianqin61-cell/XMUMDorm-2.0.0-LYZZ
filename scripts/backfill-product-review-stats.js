/**
 * 根据一级点评（product_comments）回填 products 的 review_count、各等级计数、comprehensive_score。
 * 用于：历史数据在接入 rankingStats 前已有点评，导致榜单依赖缓存字段时为空。
 *
 * 在项目根目录执行：node scripts/backfill-product-review-stats.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../database');

async function main() {
  console.log('正在根据一级点评回填商品统计字段…');
  const result = await query(
    `UPDATE products p
     INNER JOIN (
       SELECT
         product_id,
         COUNT(*) AS rc,
         SUM(CASE WHEN rating = '夯爆了' THEN 1 ELSE 0 END) AS n1,
         SUM(CASE WHEN rating = '顶级' THEN 1 ELSE 0 END) AS n2,
         SUM(CASE WHEN rating = '人上人' THEN 1 ELSE 0 END) AS n3,
         SUM(CASE WHEN rating = 'NPC' THEN 1 ELSE 0 END) AS n4,
         SUM(CASE WHEN rating = '拉完了' THEN 1 ELSE 0 END) AS n5,
         ROUND(
           (
             SUM(CASE rating
               WHEN '夯爆了' THEN 10
               WHEN '顶级' THEN 7
               WHEN '人上人' THEN 4
               WHEN 'NPC' THEN 1
               WHEN '拉完了' THEN -1
             END) / NULLIF(COUNT(*), 0)
           ),
           2
         ) AS sc
       FROM product_comments
       WHERE (parent_id IS NULL OR parent_id = 0) AND deleted_at IS NULL
         AND rating IN ('夯爆了', '顶级', '人上人', 'NPC', '拉完了')
       GROUP BY product_id
     ) t ON t.product_id = p.id
     SET
       p.review_count = t.rc,
       p.count_rating_1 = t.n1,
       p.count_rating_2 = t.n2,
       p.count_rating_3 = t.n3,
       p.count_rating_4 = t.n4,
       p.count_rating_5 = t.n5,
       p.comprehensive_score = t.sc,
       p.updated_at = CURRENT_TIMESTAMP`
  );
  const affected = result && (result.affectedRows ?? result.changedRows ?? 0);
  console.log('完成。更新行数（若驱动未返回则可能为 0）:', affected);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
