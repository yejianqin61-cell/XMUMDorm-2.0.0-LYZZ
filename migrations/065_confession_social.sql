-- migration: 065_confession_social.sql
-- description: 万能墙点赞与评论表
-- depends: 064 (confessions 表必须存在), 001 (users 表必须存在)
-- reversible: DROP TABLE IF EXISTS confession_comments; DROP TABLE IF EXISTS confession_likes;
--
-- 参见：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §3.2
--
-- 说明：
--   两张表的 user_id 均仅用于：1) 点赞去重  2) 作者/admin 删除权限判定  3) 管理员后台追溯。
--   业务层（列表/详情/评论）严禁下发任何身份字段。

USE jack_campus;

-- ---------- 点赞表 ----------
CREATE TABLE IF NOT EXISTS confession_likes (
  user_id INT NOT NULL,
  confession_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, confession_id),
  INDEX idx_confession_id (confession_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙点赞';

-- ---------- 评论表 ----------
CREATE TABLE IF NOT EXISTS confession_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  confession_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '评论者ID（前台匿名）',
  parent_id INT NULL COMMENT 'NULL=一级评论，非空=回复某条一级评论（仅二级）',
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_confession_id (confession_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES confession_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙评论';
