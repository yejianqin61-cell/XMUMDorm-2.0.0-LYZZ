-- 057_user_status.sql
-- users 表增加账号状态字段，支持封禁/禁言管理
-- 幂等：列已存在时跳过，可重复执行

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN status ENUM(''active'',''banned'',''deactivated'') NOT NULL DEFAULT ''active'' COMMENT ''账号状态'' AFTER role',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'banned_until'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN banned_until DATETIME NULL COMMENT ''封禁截止时间，NULL=未封禁'' AFTER status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'muted_until'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN muted_until DATETIME NULL COMMENT ''禁言截止时间，NULL=未禁言'' AFTER banned_until',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL COMMENT ''最后登录时间'' AFTER updated_at',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'college'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN college VARCHAR(100) NULL COMMENT ''学院'' AFTER email',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
