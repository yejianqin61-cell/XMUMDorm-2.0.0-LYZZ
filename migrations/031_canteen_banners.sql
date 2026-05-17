-- ============================================
-- V3.0 食堂首页改版：推荐轮播表
-- ============================================
-- 配合 GET /api/canteen/banners，支持运营配置轮播图
-- 使用: mysql -u root -p jack_campus < migrations/031_canteen_banners.sql

USE jack_campus;

CREATE TABLE IF NOT EXISTS canteen_banners (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '轮播条目ID',
  type ENUM('content','ad') NOT NULL DEFAULT 'content' COMMENT 'content=内容推荐, ad=商家广告',
  title VARCHAR(100) NOT NULL COMMENT '展示标题',
  subtitle VARCHAR(200) NULL COMMENT '副标题',
  image_url VARCHAR(500) NOT NULL COMMENT '图片URL（对象存储/静态）',
  link_type ENUM('none','product','shop','post','url','region') NOT NULL DEFAULT 'none' COMMENT '点击跳转类型',
  link_target VARCHAR(200) NULL COMMENT '跳转目标：id/URL/region code',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '越小越靠前',
  starts_at TIMESTAMP NULL DEFAULT NULL COMMENT '定时上线',
  ends_at TIMESTAMP NULL DEFAULT NULL COMMENT '定时下线',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '生效开关',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食堂首页轮播表';

-- 种子数据：3 条示例轮播，使用默认占位图
INSERT INTO canteen_banners (type, title, subtitle, image_url, link_type, link_target, sort_order) VALUES
  ('content', '今日热门', '看看大家都在吃什么', '/products/default.png', 'none', NULL, 1),
  ('content', '新品上架', '本周新上菜品抢先看', '/products/default.png', 'none', NULL, 2),
  ('ad', '商家推荐', '入驻食堂，展示你的好手艺', '/products/default.png', 'region', 'D6', 3)
ON DUPLICATE KEY UPDATE title = VALUES(title);
