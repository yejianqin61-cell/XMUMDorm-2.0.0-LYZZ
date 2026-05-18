-- 热搜帖子评论表（与树洞 post_comments 结构对齐）
CREATE TABLE IF NOT EXISTS trending_post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT,
  parent_id INT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES trending_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES trending_post_comments(id) ON DELETE CASCADE,
  INDEX idx_tpc_post (post_id),
  INDEX idx_tpc_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
