-- ============================================
-- V3.0 热搜系统：trending_posts 表（与树洞隔离）
-- ============================================
USE jack_campus;

CREATE TABLE IF NOT EXISTS trending_posts (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '热搜帖ID',
  topic_id INT NOT NULL COMMENT '绑定热搜话题',
  user_id INT NOT NULL COMMENT '发帖用户',
  content TEXT NOT NULL COMMENT '正文',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除',
  hidden_by_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '管理员隐藏',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_topic_id (topic_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (topic_id) REFERENCES trending_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热搜讨论帖（独立于树洞 posts 表）';
