-- 校园此刻帖子图片表（与树洞 post_images 结构对齐）
CREATE TABLE IF NOT EXISTS campus_post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
  INDEX idx_campus_post_images_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
