-- ============================================
-- 026 - Second-hand Marketplace (no reports)
-- - categories / items / images / wants
-- - hard limit for images: enforced in backend (max 4)
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL,
  name_zh VARCHAR(60) NOT NULL,
  name_en VARCHAR(60) NOT NULL,
  sort_order TINYINT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_marketplace_categories_slug (slug),
  KEY idx_marketplace_categories_enabled_sort (is_enabled, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketplace_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  seller_user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('on_sale','reserved','sold') NOT NULL DEFAULT 'on_sale',
  tags_json JSON NULL,
  contact_wechat VARCHAR(80) NULL,
  contact_phone VARCHAR(40) NULL,
  contact_remark VARCHAR(200) NULL,
  views_count INT NOT NULL DEFAULT 0,
  wants_count INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_marketplace_items_cat_status_time (category_id, status, created_at, id),
  KEY idx_marketplace_items_status_time (status, created_at, id),
  KEY idx_marketplace_items_seller_time (seller_user_id, created_at, id),
  KEY idx_marketplace_items_deleted (deleted_at),
  CONSTRAINT fk_marketplace_items_category FOREIGN KEY (category_id) REFERENCES marketplace_categories(id),
  CONSTRAINT fk_marketplace_items_seller FOREIGN KEY (seller_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketplace_item_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_marketplace_item_images_item (item_id, sort_order, id),
  CONSTRAINT fk_marketplace_item_images_item FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketplace_item_wants (
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id),
  KEY idx_marketplace_item_wants_item (item_id),
  CONSTRAINT fk_marketplace_item_wants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_item_wants_item FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed categories (idempotent)
INSERT INTO marketplace_categories (slug, name_zh, name_en, sort_order, is_enabled)
VALUES
  ('all', '全部', 'All', 0, 1),
  ('electronics', '电子产品', 'Electronics', 1, 1),
  ('transport', '交通出行', 'Transport', 2, 1),
  ('dailyuse', '日用百货', 'Daily Use', 3, 1),
  ('books', '书籍资料', 'Books', 4, 1),
  ('others', '其他', 'Others', 5, 1)
ON DUPLICATE KEY UPDATE
  name_zh = VALUES(name_zh),
  name_en = VALUES(name_en),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled);

