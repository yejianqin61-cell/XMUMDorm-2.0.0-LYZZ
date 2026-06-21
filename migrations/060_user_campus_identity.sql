-- Task006: 校园身份字段与可见性开关

SET @has_grade := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'grade'
);
SET @sql_grade := IF(
  @has_grade = 0,
  "ALTER TABLE users ADD COLUMN grade VARCHAR(50) NULL COMMENT '年级' AFTER college",
  'SELECT 1'
);
PREPARE stmt_grade FROM @sql_grade;
EXECUTE stmt_grade;
DEALLOCATE PREPARE stmt_grade;

SET @has_major := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'major'
);
SET @sql_major := IF(
  @has_major = 0,
  "ALTER TABLE users ADD COLUMN major VARCHAR(100) NULL COMMENT '专业' AFTER grade",
  'SELECT 1'
);
PREPARE stmt_major FROM @sql_major;
EXECUTE stmt_major;
DEALLOCATE PREPARE stmt_major;

SET @has_show_college := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'show_college'
);
SET @sql_show_college := IF(
  @has_show_college = 0,
  "ALTER TABLE users ADD COLUMN show_college TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否公开学院' AFTER major",
  'SELECT 1'
);
PREPARE stmt_show_college FROM @sql_show_college;
EXECUTE stmt_show_college;
DEALLOCATE PREPARE stmt_show_college;

SET @has_show_grade := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'show_grade'
);
SET @sql_show_grade := IF(
  @has_show_grade = 0,
  "ALTER TABLE users ADD COLUMN show_grade TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否公开年级' AFTER show_college",
  'SELECT 1'
);
PREPARE stmt_show_grade FROM @sql_show_grade;
EXECUTE stmt_show_grade;
DEALLOCATE PREPARE stmt_show_grade;

SET @has_show_major := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'show_major'
);
SET @sql_show_major := IF(
  @has_show_major = 0,
  "ALTER TABLE users ADD COLUMN show_major TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否公开专业' AFTER show_grade",
  'SELECT 1'
);
PREPARE stmt_show_major FROM @sql_show_major;
EXECUTE stmt_show_major;
DEALLOCATE PREPARE stmt_show_major;
