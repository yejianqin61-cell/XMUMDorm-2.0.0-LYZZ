-- ============================================
-- 帖子/互动性能索引（瀑布流 + 点赞/评论计数）
-- ============================================
-- 说明：
-- - 你的 slow-sql 大头在 /api/posts 列表：WHERE 过滤 + created_at 排序 + 子查询计数 + post_images join
-- - 这些索引能显著降低远程 DB 延迟放大效应
--
-- 使用示例：
-- mysql -u root -p jack_campus < migrations/015_posts_perf_indexes.sql
--
USE jack_campus;

-- 帖子列表常用过滤 + 排序
-- WHERE deleted_at IS NULL AND type <> 'announcement' AND hidden_by_admin = 0
-- ORDER BY created_at DESC
CREATE INDEX idx_posts_list_visible_created_at
  ON posts(deleted_at, hidden_by_admin, type, created_at);

-- 点赞子查询：WHERE post_id = ? 以及 WHERE post_id = ? AND user_id = ?
CREATE INDEX idx_post_likes_post_user
  ON post_likes(post_id, user_id);

-- 评论计数子查询：WHERE post_id = ? AND deleted_at IS NULL
CREATE INDEX idx_comments_post_deleted
  ON comments(post_id, deleted_at);

-- 标签筛选 EXISTS：post_tag_map(post_id, tag_id) / (tag_id, post_id) 两种都用得到
CREATE INDEX idx_post_tag_map_post_tag
  ON post_tag_map(post_id, tag_id);

CREATE INDEX idx_post_tag_map_tag_post
  ON post_tag_map(tag_id, post_id);

