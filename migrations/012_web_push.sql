-- Web Push 订阅 + 上课提醒去重（使用当前连接的数据库）

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint VARCHAR(768) NOT NULL COMMENT 'Push service URL，较长',
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_push_endpoint (endpoint(191)),
  KEY idx_push_user (user_id),
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Web Push 订阅';

CREATE TABLE IF NOT EXISTS class_reminder_sent (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  meeting_id BIGINT UNSIGNED NOT NULL,
  remind_at_date DATE NOT NULL COMMENT '吉隆坡日历日，用于同日去重',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_remind_dedup (user_id, meeting_id, remind_at_date),
  KEY idx_remind_user_date (user_id, remind_at_date),
  CONSTRAINT fk_class_reminder_meeting FOREIGN KEY (meeting_id) REFERENCES timetable_meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_reminder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课前推送去重';
