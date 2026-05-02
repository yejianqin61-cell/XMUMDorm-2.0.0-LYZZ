-- ============================================
-- Feed：ORDER BY created_at DESC LIMIT … 与回表优化
-- 在已有单列 created_at 索引外，增加 (created_at, id) 复合索引（若不存在）
-- 执行: node scripts/apply-sql-file.js migrations/040_club_feed_sort_covering.sql
-- ============================================

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_activities' AND INDEX_NAME = 'idx_club_act_created_id'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE club_activities ADD INDEX idx_club_act_created_id (created_at, id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2 := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_posts' AND INDEX_NAME = 'idx_club_post_created_id'
);
SET @sql2 := IF(@idx2 = 0,
  'ALTER TABLE club_posts ADD INDEX idx_club_post_created_id (created_at, id)',
  'SELECT 1');
PREPARE stmt FROM @sql2; EXECUTE stmt; DEALLOCATE PREPARE stmt;
