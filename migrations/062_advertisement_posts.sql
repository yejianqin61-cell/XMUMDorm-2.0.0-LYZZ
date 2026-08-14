-- Phase3：广告帖元数据与普通内容隔离
-- 广告正文复用 posts，广告专属生命周期/投放信息独立保存。

CREATE TABLE IF NOT EXISTS advertisement_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
  sponsor_name VARCHAR(160) NOT NULL,
  sponsor_logo VARCHAR(500) NULL,
  cta_label VARCHAR(80) NULL,
  cta_type ENUM('none', 'shop', 'product', 'region', 'internal', 'https') NOT NULL DEFAULT 'none',
  cta_target VARCHAR(500) NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_advertisement_post (post_id),
  KEY idx_advertisement_status (status),
  CONSTRAINT fk_advertisement_post_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_advertisement_post_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_advertisement_post_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员广告帖元数据';
