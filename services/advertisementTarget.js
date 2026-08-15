const { query } = require('../database');

async function validateAdvertisementTarget(target) {
  const postId = Number.parseInt(target, 10);
  if (!Number.isInteger(postId) || postId <= 0 || String(postId) !== String(target).trim()) {
    return { ok: false, message: '广告轮播必须选择有效的广告内容' };
  }
  const rows = await query(
    `SELECT ap.post_id, ap.status, p.deleted_at
     FROM advertisement_posts ap
     INNER JOIN posts p ON p.id = ap.post_id
     WHERE ap.post_id = ?
     LIMIT 1`,
    [postId]
  );
  if (!rows.length || rows[0].deleted_at || rows[0].status === 'archived') {
    return { ok: false, message: '广告不存在、已归档或已删除' };
  }
  return { ok: true, postId };
}

module.exports = { validateAdvertisementTarget };
