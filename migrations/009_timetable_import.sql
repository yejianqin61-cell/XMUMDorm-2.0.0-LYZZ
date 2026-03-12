-- 009_timetable_import.sql
-- 课程表导入（Dorm 2.0 最后一个功能）
-- 表结构：
-- - timetable_courses：一门课的基础信息（按用户隔离）
-- - timetable_meetings：一门课的具体上课时间/地点/周次（可多条）
-- - timetable_import_logs：导入日志（便于排查解析问题）

USE jack_campus;

CREATE TABLE IF NOT EXISTS timetable_courses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '所属用户（users.id）',
  course_code VARCHAR(32) NOT NULL COMMENT '如 G0173',
  course_name VARCHAR(255) NOT NULL,
  credit TINYINT NULL,
  lecturer VARCHAR(255) NULL,
  raw_block TEXT NULL COMMENT '原始文本块（该课程对应的整段）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_user_course_code (user_id, course_code),
  KEY idx_user_id (user_id),
  CONSTRAINT fk_timetable_courses_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表-课程';

CREATE TABLE IF NOT EXISTS timetable_meetings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT UNSIGNED NOT NULL COMMENT 'timetable_courses.id',
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '1=Mon .. 7=Sun',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue VARCHAR(255) NULL COMMENT '如 A5#G11',
  week_start SMALLINT UNSIGNED NULL,
  week_end SMALLINT UNSIGNED NULL,
  raw_line VARCHAR(500) NULL COMMENT '原始时间行（便于定位解析）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_course_id (course_id),
  KEY idx_course_day_time (day_of_week, start_time),
  CONSTRAINT fk_timetable_meetings_course_id FOREIGN KEY (course_id) REFERENCES timetable_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表-上课时间';

CREATE TABLE IF NOT EXISTS timetable_import_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'text' COMMENT '导入来源',
  raw_text MEDIUMTEXT NOT NULL,
  parsed_course_count INT NOT NULL DEFAULT 0,
  parsed_meeting_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id_created_at (user_id, created_at DESC),
  CONSTRAINT fk_timetable_import_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表-导入日志';

