-- ============================================
-- 数据库初始化脚本
-- ============================================
-- 创建时间: 2025-01-26
-- 功能: 创建数据库和用户表结构

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS jack_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE jack_campus;

-- ============================================
-- 用户表 (users)
-- ============================================
-- 修改时间: 2025-01-26
-- 最新修改: 2025-01-26 - 添加 email 字段，student_id 改为可选（商家不需要学号）
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID，自增主键',
  student_id VARCHAR(50) NULL UNIQUE COMMENT '学号，唯一标识（非商家必填，商家可为空）',
  username VARCHAR(100) NOT NULL COMMENT '用户名',
  email VARCHAR(255) NULL UNIQUE COMMENT '邮箱（非商家必填，格式：xxx@xmu.edu.my）',
  password_hash VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  role ENUM('student', 'merchant') DEFAULT 'student' COMMENT '用户角色：学生或商家',
  email_verified TINYINT(1) DEFAULT 0 COMMENT '邮箱是否已验证（0=未验证，1=已验证）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 创建索引以提高查询性能
  INDEX idx_student_id (student_id),
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

