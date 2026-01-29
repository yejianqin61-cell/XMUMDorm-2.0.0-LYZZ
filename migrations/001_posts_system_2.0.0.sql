-- ============================================
-- 帖子系统 2.0.0 数据库迁移
-- ============================================
-- 在已有 jack_campus 库上执行：扩展 users，新建帖子/评论/点赞/通知表
-- 使用: mysql -u root -p jack_campus < migrations/001_posts_system_2.0.0.sql

USE jack_campus;

-- ---------- 1. 扩展 users 表 ----------
-- 若已执行过迁移，再次执行会报 duplicate column，可忽略或先检查列是否存在
ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL COMMENT '头像路径，NULL 用默认头像' AFTER email_verified;
ALTER TABLE users ADD COLUMN nickname VARCHAR(100) NULL COMMENT '昵称，展示用' AFTER avatar;

-- 扩展 role 枚举：增加 admin（官方号=管理员）
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'merchant', 'admin') DEFAULT 'student' COMMENT '用户角色';

-- ---------- 2. 帖子表 ----------
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

-- ---------- 3. 帖子图片表 ----------
CREATE TABLE IF NOT EXISTS post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  file_path VARCHAR(500) NOT NULL COMMENT '如 post_102_1.jpg',
  sort_order TINYINT DEFAULT 0 COMMENT '0/1/2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子图片';

-- ---------- 4. 点赞表 ----------
CREATE TABLE IF NOT EXISTS post_likes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_id (post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子点赞';

-- ---------- 5. 评论表 ----------
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '评论者ID',
  parent_id INT NULL COMMENT 'NULL=一级评论，非空=回复某条评论(仅二级)',
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

-- ---------- 6. 通知表 ----------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '接收者ID',
  type ENUM('comment', 'like', 'announcement') NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  post_id INT NULL,
  comment_id INT NULL,
  from_user_id INT NULL COMMENT '触发者(评论/点赞者)',
  extra JSON NULL COMMENT '摘要等',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知';
