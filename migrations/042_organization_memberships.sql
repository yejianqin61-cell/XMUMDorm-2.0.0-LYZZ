-- ============================================
-- V3.0 组织系统：organization_memberships 表
-- ============================================
USE jack_campus;

CREATE TABLE IF NOT EXISTS organization_memberships (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '成员关系ID',
  organization_id INT NOT NULL COMMENT '组织ID',
  user_id INT NOT NULL COMMENT '用户ID',
  title VARCHAR(100) NULL COMMENT '职位，如主管/Advisor',
  permission_level TINYINT NOT NULL DEFAULT 1 COMMENT '预留：1=可发帖',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_user (organization_id, user_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织成员关系表';
