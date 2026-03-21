-- ============================================
-- 帖子标签 / 话题（双语）与多对多关联
-- ============================================
-- 用法: mysql -u root -p jack_campus < migrations/011_post_tags.sql

USE jack_campus;

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '标签ID',
  slug VARCHAR(80) NOT NULL COMMENT 'URL 用唯一标识',
  name_zh VARCHAR(100) NOT NULL COMMENT '中文名',
  name_en VARCHAR(100) NOT NULL COMMENT '英文名',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL COMMENT '创建者（管理员）',
  UNIQUE KEY uk_tags_slug (slug),
  INDEX idx_tags_created_at (created_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子标签（仅管理员可创建）';

CREATE TABLE IF NOT EXISTS post_tag_map (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子-标签';
