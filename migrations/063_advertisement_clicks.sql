-- Phase3：广告最小点击记录
-- 仅记录投放结果所需的点击事件，不做曝光、归因、计费或竞价。

CREATE TABLE IF NOT EXISTS advertisement_clicks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  advertisement_post_id INT NOT NULL,
  placement_type VARCHAR(32) NULL,
  placement_id INT NULL,
  click_type VARCHAR(32) NOT NULL DEFAULT 'banner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ad_clicks_post_time (advertisement_post_id, created_at),
  KEY idx_ad_clicks_type_time (click_type, created_at),
  CONSTRAINT fk_ad_clicks_advertisement
    FOREIGN KEY (advertisement_post_id) REFERENCES advertisement_posts(post_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广告最小点击事件';
