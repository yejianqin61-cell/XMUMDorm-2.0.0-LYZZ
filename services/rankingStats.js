/**
 * 排行榜统计：点评后更新商品/店铺/用户计数与综合评分
 * 仅一级点评（parent_id IS NULL）参与；逻辑删除时 delta=-1
 */

const { query } = require('../database');

// 等级顺序与分值：夯爆了=10, 顶级=7, 人上人=4, NPC=1, 拉完了=-1
const RATING_TO_INDEX = { '夯爆了': 1, '顶级': 2, '人上人': 3, 'NPC': 4, '拉完了': 5 };
const RATING_POINTS = [0, 10, 7, 4, 1, -1]; // index 0 unused

function ratingToCol(idx) {
  return `count_rating_${idx}`;
}

/** 更新单个商品的各等级数、总点评数、S_dish（累计综合评分） */
async function updateProductStats(productId, rating, delta) {
  const idx = RATING_TO_INDEX[rating];
  if (!idx) return;
  const col = ratingToCol(idx);
  await query(
    `UPDATE products SET ${col} = GREATEST(0, ${col} + ?), review_count = GREATEST(0, review_count + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [delta, delta, productId]
  );
  const rows = await query(
    'SELECT count_rating_1, count_rating_2, count_rating_3, count_rating_4, count_rating_5, review_count FROM products WHERE id = ?',
    [productId]
  );
  if (!rows || !rows.length) return;
  const r = rows[0];
  const total = r.review_count || 0;
  let score = null;
  if (total > 0) {
    const sum = (r.count_rating_1 || 0) * 10 + (r.count_rating_2 || 0) * 7 + (r.count_rating_3 || 0) * 4 + (r.count_rating_4 || 0) * 1 + (r.count_rating_5 || 0) * -1;
    score = Math.round((sum / total) * 100) / 100;
  }
  await query('UPDATE products SET comprehensive_score = ? WHERE id = ?', [score, productId]);
}

/** 重算店铺的 S_shop（按旗下商品 S_dish 与 review_count 加权平均） */
async function recomputeShopScore(shopId) {
  const rows = await query(
    'SELECT comprehensive_score, review_count FROM products WHERE shop_id = ? AND deleted_at IS NULL AND review_count > 0',
    [shopId]
  );
  let totalWeight = 0;
  let totalScore = 0;
  for (const p of rows || []) {
    if (p.comprehensive_score != null && p.review_count > 0) {
      totalScore += p.comprehensive_score * p.review_count;
      totalWeight += p.review_count;
    }
  }
  const S_shop = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : null;
  await query('UPDATE shops SET comprehensive_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [S_shop, shopId]);
}

/** 更新店铺各等级数、总点评数，并重算 S_shop */
async function updateShopStats(shopId, rating, delta) {
  const idx = RATING_TO_INDEX[rating];
  if (!idx) return;
  const col = ratingToCol(idx);
  await query(
    `UPDATE shops SET ${col} = GREATEST(0, ${col} + ?), review_count = GREATEST(0, review_count + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [delta, delta, shopId]
  );
  await recomputeShopScore(shopId);
}

/** 店铺当周点评数 ±1 */
async function updateShopWeeklyCount(shopId, delta) {
  await query(
    'UPDATE shops SET weekly_review_count = GREATEST(0, weekly_review_count + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [delta, shopId]
  );
}

/** 用户当周点评数 ±1 */
async function updateUserWeeklyCount(userId, delta) {
  await query(
    'UPDATE users SET weekly_comment_count = GREATEST(0, weekly_comment_count + ?) WHERE id = ?',
    [delta, userId]
  );
}

/**
 * 一条一级点评新增或逻辑删除时调用
 * @param {number} productId - 商品 ID
 * @param {number} shopId - 店铺 ID（可从 product 查）
 * @param {number} userId - 评论者 ID
 * @param {string} rating - 等级：夯爆了/顶级/人上人/NPC/拉完了
 * @param {number} delta - +1 新增，-1 逻辑删除
 */
async function onPrimaryCommentChange(productId, shopId, userId, rating, delta) {
  await updateProductStats(productId, rating, delta);
  await updateShopStats(shopId, rating, delta);
  await updateShopWeeklyCount(shopId, delta);
  await updateUserWeeklyCount(userId, delta);
}

/** 每周一 0 点东八区：重置店铺与用户的当周点评数 */
async function resetWeeklyCounts() {
  await query('UPDATE shops SET weekly_review_count = 0, updated_at = CURRENT_TIMESTAMP WHERE 1=1');
  await query('UPDATE users SET weekly_comment_count = 0 WHERE 1=1');
}

module.exports = {
  RATING_TO_INDEX,
  RATING_POINTS,
  updateProductStats,
  updateShopStats,
  updateShopWeeklyCount,
  updateUserWeeklyCount,
  onPrimaryCommentChange,
  resetWeeklyCounts,
  recomputeShopScore
};
