-- ============================================
-- Clubs admin system (社团管理员/成员/分类/联系方式)
-- ============================================

USE jack_campus;

-- clubs: add category + socials
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND COLUMN_NAME = 'category'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE clubs ADD COLUMN category VARCHAR(20) NULL AFTER name', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND COLUMN_NAME = 'ig'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE clubs ADD COLUMN ig VARCHAR(80) NULL AFTER signup_link', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND COLUMN_NAME = 'xhs'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE clubs ADD COLUMN xhs VARCHAR(120) NULL AFTER ig', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- club members / admins
CREATE TABLE IF NOT EXISTS club_members (
  club_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'member' COMMENT 'admin/member',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (club_id, user_id),
  INDEX idx_club_members_user (user_id),
  CONSTRAINT fk_club_members_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_club_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团成员';

-- activities: allow explicit status override
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_activities' AND COLUMN_NAME = 'status'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE club_activities ADD COLUMN status VARCHAR(12) NULL COMMENT ''upcoming/ongoing/ended (optional override)'' AFTER signup_link', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- activities: tag/category (for filtering)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_activities' AND COLUMN_NAME = 'tag'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE club_activities ADD COLUMN tag VARCHAR(20) NULL AFTER title', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

