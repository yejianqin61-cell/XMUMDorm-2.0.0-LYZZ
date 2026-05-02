-- ============================================
-- 社团混合流 GET /api/clubs/feed：活动按 created_at 排序缺索引时全表扫
-- 032 仅有 idx_club_activities_time(start_time)，补 created_at 索引
-- （club_posts 已有 idx_club_posts_created，不再重复加）
-- 执行: node scripts/apply-sql-file.js migrations/039_club_feed_perf_indexes.sql
-- ============================================

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_activities' AND INDEX_NAME = 'idx_club_activities_feed_created'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE club_activities ADD INDEX idx_club_activities_feed_created (created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
