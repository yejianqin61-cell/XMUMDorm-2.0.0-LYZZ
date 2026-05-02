-- 若 club_comments 已存在但缺少 deleted_at（与 037 不一致），补齐列，避免接口 SQL 报错。
-- 执行: node scripts/apply-sql-file.js migrations/038_club_comments_deleted_at_backfill.sql

SET @db := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'club_comments' AND COLUMN_NAME = 'deleted_at'
);
SET @tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'club_comments'
);
SET @sql := IF(@exists = 0 AND @tbl > 0,
  'ALTER TABLE club_comments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER content',
  'SELECT 1 AS skipped'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
