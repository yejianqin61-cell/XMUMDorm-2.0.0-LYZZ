-- ============================================
-- 社团资料页 GET /api/clubs/:id 列表查询优化
-- WHERE club_id = ? ORDER BY start_time/created_at
-- （使用当前连接默认库 DATABASE()，勿写死库名）
-- ============================================

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_activities' AND INDEX_NAME = 'idx_club_act_profile'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE club_activities ADD INDEX idx_club_act_profile (club_id, start_time, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2 := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_posts' AND INDEX_NAME = 'idx_club_post_profile'
);
SET @sql2 := IF(@idx2 = 0,
  'ALTER TABLE club_posts ADD INDEX idx_club_post_profile (club_id, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql2; EXECUTE stmt; DEALLOCATE PREPARE stmt;
