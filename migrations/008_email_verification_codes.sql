-- 008_email_verification_codes.sql
-- 邮箱验证码表：记录注册等场景下发送到邮箱的验证码

USE jack_campus;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL COMMENT '接收验证码的邮箱',
  scene VARCHAR(32) NOT NULL COMMENT '使用场景，如 register',
  code_hash VARCHAR(255) NOT NULL COMMENT '验证码哈希',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  used_at DATETIME NULL DEFAULT NULL COMMENT '实际使用时间，NULL=未使用',
  sent_count TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '当日发送次数计数，可选',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_scene_created_at (email, scene, created_at DESC),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码记录';

