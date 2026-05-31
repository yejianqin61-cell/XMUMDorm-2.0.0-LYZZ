-- 056_admin_system.sql
-- 管理员后台系统：举报表 / 制裁表 / 敏感词表 / 系统配置表
-- 幂等：表已存在则跳过，可重复执行

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '举报ID',
  reporter_id BIGINT UNSIGNED NOT NULL COMMENT '举报人用户ID',
  target_type VARCHAR(32) NOT NULL COMMENT '被举报内容类型：post/comment/product_comment/club_activity/club_post/marketplace/errand/handbook_article/handbook_comment/course_review/trending_post/campus_post',
  target_id BIGINT UNSIGNED NOT NULL COMMENT '被举报内容ID',
  reason VARCHAR(64) NOT NULL COMMENT '举报原因：spam/fraud/abuse/nsfw/trolling/privacy/illegal_trade/other',
  detail TEXT NULL COMMENT '补充说明',
  screenshots JSON NULL COMMENT '举报截图URL数组',
  reported_user_id BIGINT UNSIGNED NULL COMMENT '被举报人用户ID',
  status ENUM('pending','processing','resolved','dismissed') NOT NULL DEFAULT 'pending' COMMENT '处理状态',
  handler_id BIGINT UNSIGNED NULL COMMENT '处理人ID（管理员）',
  handler_note TEXT NULL COMMENT '处理备注',
  handled_at DATETIME NULL COMMENT '处理时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '举报时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_reports_status (status),
  INDEX idx_reports_target (target_type, target_id),
  INDEX idx_reports_reporter (reporter_id),
  INDEX idx_reports_reported_user (reported_user_id),
  INDEX idx_reports_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='举报表';

CREATE TABLE IF NOT EXISTS user_sanctions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '制裁ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '被制裁用户ID',
  type ENUM('ban','mute') NOT NULL COMMENT '制裁类型：ban=封禁/mute=禁言',
  duration_days INT UNSIGNED NULL COMMENT '时长（天），NULL=永久',
  reason VARCHAR(255) NULL COMMENT '制裁原因',
  operator_id BIGINT UNSIGNED NULL COMMENT '操作管理员ID',
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  ends_at DATETIME NULL COMMENT '结束时间，NULL=永久',
  revoked_at DATETIME NULL COMMENT '提前解除时间',
  revoked_by BIGINT UNSIGNED NULL COMMENT '解除操作人ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_sanctions_user (user_id),
  INDEX idx_sanctions_active (user_id, type, ends_at),
  INDEX idx_sanctions_operator (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户封禁/禁言记录表';

CREATE TABLE IF NOT EXISTS sensitive_words (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '敏感词ID',
  word VARCHAR(128) NOT NULL COMMENT '敏感词',
  category VARCHAR(32) DEFAULT 'general' COMMENT '分类',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_by BIGINT UNSIGNED NULL COMMENT '创建人ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_sensitive_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词表';

CREATE TABLE IF NOT EXISTS system_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  config_key VARCHAR(64) NOT NULL UNIQUE COMMENT '配置键',
  config_value TEXT NOT NULL COMMENT '配置值',
  description VARCHAR(255) NULL COMMENT '说明',
  updated_by BIGINT UNSIGNED NULL COMMENT '更新人ID',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入默认举报规则配置（幂等：INSERT IGNORE）
INSERT IGNORE INTO system_configs (config_key, config_value, description) VALUES
  ('report_auto_hide_threshold', '3', '达到该举报次数自动隐藏内容'),
  ('report_auto_review_threshold', '10', '达到该举报次数自动进入审核队列'),
  ('report_auto_delist_threshold', '5', '达到该举报次数自动下架（二手/跑腿）');
