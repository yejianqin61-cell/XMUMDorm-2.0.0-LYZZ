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
  role ENUM('student', 'merchant', 'admin') DEFAULT 'student' COMMENT '用户角色：学生/商家/管理员(官方号)',
  email_verified TINYINT(1) DEFAULT 0 COMMENT '邮箱是否已验证（0=未验证，1=已验证）',
  avatar VARCHAR(255) NULL COMMENT '头像路径，NULL 用默认头像',
  nickname VARCHAR(100) NULL COMMENT '昵称，展示用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_student_id (student_id),
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 帖子表 (posts) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '发帖用户ID',
  content TEXT NOT NULL COMMENT '正文',
  type ENUM('normal', 'announcement') DEFAULT 'normal' COMMENT '普通帖/公告',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  hidden_by_admin TINYINT(1) DEFAULT 0 COMMENT '是否被管理员隐藏',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子表';

-- ============================================
-- 帖子图片表 (post_images) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  file_path VARCHAR(500) NOT NULL COMMENT '如 post_102_1.jpg',
  sort_order TINYINT DEFAULT 0 COMMENT '0/1/2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子图片';

-- ============================================
-- 点赞表 (post_likes) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS post_likes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_id (post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子点赞';

-- ============================================
-- 评论表 (comments) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '评论者ID',
  parent_id INT NULL COMMENT 'NULL=一级评论，非空=回复(仅二级)',
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论';

-- ============================================
-- 通知表 (notifications) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '接收者ID',
  type VARCHAR(50) NOT NULL COMMENT '通知类型：comment/like/announcement/marketplace/handbook_comment/... ',
  is_read TINYINT(1) DEFAULT 0,
  post_id INT NULL,
  comment_id INT NULL,
  from_user_id INT NULL COMMENT '触发者',
  extra JSON NULL COMMENT '摘要等',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知';

