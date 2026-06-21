USE jack_campus;

CREATE TABLE IF NOT EXISTS club_activity_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL COMMENT '社团活动 ID',
  user_id INT NOT NULL COMMENT '报名用户 ID',
  status ENUM('registered', 'cancelled') NOT NULL DEFAULT 'registered' COMMENT '报名状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_activity_user (activity_id, user_id),
  KEY idx_activity_status (activity_id, status),
  KEY idx_user_status (user_id, status),
  CONSTRAINT fk_club_activity_registrations_activity
    FOREIGN KEY (activity_id) REFERENCES club_activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_club_activity_registrations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团活动报名表';
