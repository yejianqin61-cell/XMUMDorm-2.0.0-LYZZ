-- migration: 064_confessions.sql
-- description: 万能墙主表（匿名纯文字帖，含版式字段）
-- depends: 001 (users 表必须存在)
-- reversible: DROP TABLE IF EXISTS confessions;
--
-- 参见：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §3.1
--
-- 说明：
--   user_id 仅用于管理员后台追溯（匿名墙对所有人匿名），业务层严禁下发该字段。
--   template_key 由 shared/constants/confessionTemplates.js 定义白名单。

USE jack_campus;

CREATE TABLE IF NOT EXISTS confessions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '作者ID（前台匿名，仅后台可追溯）',
  template_key VARCHAR(32) NOT NULL DEFAULT 'bigtype' COMMENT '展示版式：bigtype/letter/note',
  content TEXT NOT NULL COMMENT '正文（纯文本，已 sanitize）',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  hidden_by_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '管理员隐藏标记',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_created (deleted_at, created_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙帖子';
