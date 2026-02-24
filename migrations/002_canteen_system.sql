-- ============================================
-- 食堂系统数据库迁移
-- ============================================
-- 在已有 jack_campus 库上执行：区域、店铺、分类、商品、评论（逻辑删除）
-- 使用: mysql -u root -p jack_campus < migrations/002_canteen_system.sql

USE jack_campus;

-- ---------- 1. 区域表（固定 5 条） ----------
CREATE TABLE IF NOT EXISTS regions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '区域ID',
  code VARCHAR(20) NOT NULL UNIQUE COMMENT 'D6/LY3/B1/BELL/other',
  name VARCHAR(50) NOT NULL COMMENT '展示名称',
  sort_order TINYINT DEFAULT 0 COMMENT '前端展示顺序'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区域表';

INSERT INTO regions (id, code, name, sort_order) VALUES
  (1, 'D6', 'D6', 1),
  (2, 'LY3', 'LY3', 2),
  (3, 'B1', 'B1', 3),
  (4, 'BELL', 'BELL', 4),
  (5, 'other', 'other', 5)
ON DUPLICATE KEY UPDATE code = VALUES(code), name = VALUES(name), sort_order = VALUES(sort_order);

-- ---------- 2. 店铺表 ----------
CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '店铺ID',
  user_id INT NOT NULL UNIQUE COMMENT '商家用户ID，一用户一店',
  region_id INT NOT NULL COMMENT '所属区域ID',
  name VARCHAR(100) NOT NULL COMMENT '店铺名称',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region_id (region_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='店铺表';

-- ---------- 3. 商品分类表 ----------
CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
  shop_id INT NOT NULL COMMENT '所属店铺ID',
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  sort_order TINYINT DEFAULT 0 COMMENT '同店铺内排序',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shop_id (shop_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

-- ---------- 4. 商品表（category_id 可空=未分类；shop_id 便于按店铺查未分类商品） ----------
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '商品ID',
  shop_id INT NOT NULL COMMENT '所属店铺ID',
  category_id INT NULL COMMENT '所属分类ID，NULL=未分类',
  name VARCHAR(200) NOT NULL COMMENT '商品名称',
  description TEXT NULL COMMENT '商品文字说明',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shop_id (shop_id),
  INDEX idx_category_id (category_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- ---------- 5. 商品图片表（卖家秀，最多 5 张） ----------
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL COMMENT '商品ID',
  file_path VARCHAR(500) NOT NULL COMMENT '相对路径',
  sort_order TINYINT DEFAULT 0 COMMENT '0~4',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_id (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品卖家秀图片';

-- ---------- 6. 商品评论表 ----------
CREATE TABLE IF NOT EXISTS product_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL COMMENT '商品ID',
  user_id INT NOT NULL COMMENT '评论者ID',
  parent_id INT NULL COMMENT 'NULL=一级，非空=回复某条(仅二级)',
  rating ENUM('夯爆了','顶级','人上人','NPC','拉完了') NOT NULL COMMENT '评级',
  content VARCHAR(300) NOT NULL COMMENT '文字，≤300字',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_id (product_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES product_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品评论';

-- ---------- 7. 评论图片表（每评论最多 3 张） ----------
CREATE TABLE IF NOT EXISTS product_comment_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL COMMENT '评论ID',
  file_path VARCHAR(500) NOT NULL COMMENT '相对路径',
  sort_order TINYINT DEFAULT 0 COMMENT '0~2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comment_id (comment_id),
  FOREIGN KEY (comment_id) REFERENCES product_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论图片';
