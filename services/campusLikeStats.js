'use strict';
// Shared read model. IDs always belong to campus_posts, never posts/trending_posts.
async function campusLikeStats(sql, postIds, actorId) {
  const ids = [...new Set(postIds.map(Number))];
  if (!ids.length) return new Map();
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0 || id > 2147483647)) throw new Error('Invalid campus statistics IDs');
  const placeholders = ids.map(() => '?').join(',');
  const likes = await sql(`SELECT post_id,COUNT(*) AS cnt FROM campus_post_likes WHERE post_id IN (${placeholders}) GROUP BY post_id`, ids);
  const comments = await sql(`SELECT post_id,COUNT(*) AS cnt FROM campus_post_comments WHERE post_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY post_id`, ids);
  const own = actorId == null ? [] : await sql(`SELECT post_id FROM campus_post_likes WHERE post_id IN (${placeholders}) AND user_id=?`, [...ids, actorId]);
  const liked = new Set(own.map(row => Number(row.post_id)));
  const counts = rows => new Map(rows.map(row => {
    const count = Number(row.cnt);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid campus count');
    return [Number(row.post_id), count];
  }));
  const likeCounts = counts(likes), commentCounts = counts(comments);
  return new Map(ids.map(id => [String(id), { target_type: 'campus_post', post_id: String(id),
    liked: actorId == null ? null : liked.has(id), like_count: likeCounts.get(id) || 0, comment_count: commentCounts.get(id) || 0 }]));
}
module.exports = { campusLikeStats };
