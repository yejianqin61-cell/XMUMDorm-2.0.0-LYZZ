-- ============================================
-- Club activities: multi-image gallery (max 4 keys in JSON)
-- ============================================

USE jack_campus;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_activities' AND COLUMN_NAME = 'images'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE club_activities ADD COLUMN images JSON NULL COMMENT ''array of storage keys, max 4'' AFTER cover', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
