-- ============================================
-- V3.0 组织系统：organizations 表
-- ============================================
USE jack_campus;

CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '组织ID',
  type ENUM('SchoolDepartment','College','Official') NOT NULL COMMENT 'SchoolDepartment=学校部门, College=学院, Official=官方号',
  name VARCHAR(100) NOT NULL COMMENT '组织名称',
  avatar VARCHAR(500) NULL COMMENT '头像 key 或 URL',
  description TEXT NULL COMMENT '简介',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '停用后不可选为发帖身份',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_org_type (type),
  INDEX idx_org_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织表（官方/学院/部门）';
