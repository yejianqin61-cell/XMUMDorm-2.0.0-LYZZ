-- ============================================
-- V3.0 广场轮播表（与食堂轮播结构一致、数据独立）
-- ============================================
USE jack_campus;

CREATE TABLE IF NOT EXISTS square_banners (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '轮播条目ID',
  type ENUM('content','ad') NOT NULL DEFAULT 'content' COMMENT 'content=内容推荐, ad=商家广告',
  title VARCHAR(100) NOT NULL COMMENT '展示标题',
  subtitle VARCHAR(200) NULL COMMENT '副标题',
  image_url VARCHAR(500) NOT NULL COMMENT '图片URL',
  link_type ENUM('none','product','shop','post','url','region') NOT NULL DEFAULT 'none',
  link_target VARCHAR(200) NULL COMMENT '跳转目标',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '越小越靠前',
  starts_at TIMESTAMP NULL DEFAULT NULL,
  ends_at TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广场轮播表（独立于食堂轮播）';

INSERT INTO square_banners (type, title, subtitle, image_url, link_type, link_target, sort_order) VALUES
  ('content', '社团招新中', '立即加入你感兴趣的社团', '/products/default.png', 'url', '/about/club', 1),
  ('content', '新生指南', '马校一站通 · 快速上手', '/products/default.png', 'url', '/about/freshman-guide', 2),
  ('ad', '二手好物', '逛出物广场，淘校园好物', '/products/default.png', 'url', '/about/second-hand', 3)
ON DUPLICATE KEY UPDATE title = VALUES(title);
