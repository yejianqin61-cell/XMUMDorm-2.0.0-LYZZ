-- 店铺表增加 logo、营业时间
-- 使用: mysql -u root -p jack_campus < migrations/005_shops_logo_opening_hours.sql
USE jack_campus;
ALTER TABLE shops
  ADD COLUMN logo_path VARCHAR(500) NULL DEFAULT NULL COMMENT 'logo 相对路径' AFTER name,
  ADD COLUMN opening_hours VARCHAR(200) NULL DEFAULT NULL COMMENT '营业时间，如 07:00-21:00' AFTER logo_path;
