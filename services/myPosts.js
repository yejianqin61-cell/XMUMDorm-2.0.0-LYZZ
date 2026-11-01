const { query } = require('../database');
const { assetUrl } = require('../utils/assets');

// Private treehole listing: the caller supplies only the authenticated identity.
async function getMyPosts(userId, page, pageSize) {
  const where = `p.user_id = ? AND p.type = 'normal' AND p.deleted_at IS NULL
    AND p.hidden_by_admin = 0
    AND NOT EXISTS (SELECT 1 FROM advertisement_posts ap WHERE ap.post_id = p.id)`;
  const offset = (page - 1) * pageSize;
  const [rows, counts] = await Promise.all([
    query(`SELECT p.id, p.title, p.content, p.type, p.content_origin, p.repost_source, p.created_at,
      EXISTS(SELECT 1 FROM post_likes own_like WHERE own_like.post_id = p.id AND own_like.user_id = p.user_id) AS user_liked,
      (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
      FROM posts p WHERE ${where} ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${pageSize} OFFSET ${offset}`, [userId]),
    query(`SELECT COUNT(*) AS total FROM posts p WHERE ${where}`, [userId]),
  ]);
  const images = rows.length ? await query(`SELECT post_id, file_path, sort_order FROM post_images
    WHERE post_id IN (${rows.map(() => '?').join(',')}) ORDER BY sort_order, id`, rows.map(p => p.id)) : [];
  const total = Number(counts[0].total);
  return { list: rows.map(p => ({ ...p, images: images.filter(i => i.post_id === p.id).map(i => ({ url: assetUrl(i.file_path), sort_order: i.sort_order })) })), total, page, pageSize, hasMore: offset + rows.length < total };
}
module.exports = { getMyPosts };
