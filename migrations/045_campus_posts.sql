-- ============================================
-- V3.0 校园此刻：campus_posts 表（组织身份发帖）
-- ============================================
USE jack_campus;

CREATE TABLE IF NOT EXISTS campus_posts (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '校园帖ID',
  organization_id INT NOT NULL COMMENT '发布身份组织',
  author_user_id INT NOT NULL COMMENT '实际操作人',
  feed_tab ENUM('school','college') NOT NULL COMMENT 'school=学校公告, college=学院通知',
  title VARCHAR(200) NOT NULL COMMENT '标题',
  content TEXT NOT NULL COMMENT '正文',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除',
  hidden_by_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '管理员隐藏',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_feed_tab (feed_tab),
  INDEX idx_org_id (organization_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园此刻帖子（组织身份发帖，独立于树洞）';
