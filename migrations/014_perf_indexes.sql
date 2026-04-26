-- ============================================
-- 性能优化索引（减少远程 DB 往返的放大效应）
-- ============================================
-- 使用: mysql -u root -p jack_campus < migrations/014_perf_indexes.sql

USE jack_campus;

-- 通知：未读公告/通知列表常用过滤 + created_at 排序
CREATE INDEX idx_notifications_user_type_read_created_at
  ON notifications(user_id, type, is_read, created_at);

-- 帖子图片：按 post_id IN (...) 并按 sort_order 输出
CREATE INDEX idx_post_images_post_sort
  ON post_images(post_id, sort_order);

