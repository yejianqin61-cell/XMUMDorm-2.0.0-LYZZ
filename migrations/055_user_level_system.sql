-- 用户等级 / 经验 / 徽章（V1）
-- 幂等：列已存在或表已存在时跳过，可重复执行

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'level'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN level TINYINT NOT NULL DEFAULT 1 COMMENT ''等级 1-6'' AFTER role',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'exp'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN exp INT NOT NULL DEFAULT 0 COMMENT ''累计经验'' AFTER level',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'badge'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN badge VARCHAR(32) NULL DEFAULT ''freshman'' COMMENT ''徽章 key'' AFTER exp',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS exp_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  exp INT NOT NULL COMMENT '正增负减',
  ref_type VARCHAR(32) NULL,
  ref_id BIGINT NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_exp_logs_user_created (user_id, created_at),
  INDEX idx_exp_logs_user_action_ref (user_id, action, ref_type, ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_exp_daily (
  user_id INT NOT NULL,
  day DATE NOT NULL,
  action VARCHAR(32) NOT NULL,
  exp_sum INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, action),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_exp_rewards (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  post_kind ENUM('treehole', 'trending') NOT NULL,
  post_id BIGINT NOT NULL,
  reward_type ENUM('likes_10', 'comments_10') NOT NULL,
  user_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_post_exp_reward (post_kind, post_id, reward_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
