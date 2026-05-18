-- ============================================
-- V3.0 热搜系统：trending_topics 表
-- ============================================
USE jack_campus;

CREATE TABLE IF NOT EXISTS trending_topics (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '热搜话题ID',
  title VARCHAR(200) NOT NULL COMMENT '热搜标题',
  description TEXT NULL COMMENT '可选说明',
  starts_at TIMESTAMP NULL DEFAULT NULL COMMENT '定时上线',
  ends_at TIMESTAMP NULL DEFAULT NULL COMMENT '定时下线',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '越小越靠前',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '生效开关',
  created_by INT NOT NULL COMMENT '管理员 user_id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_sort (is_active, sort_order),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热搜话题表';
