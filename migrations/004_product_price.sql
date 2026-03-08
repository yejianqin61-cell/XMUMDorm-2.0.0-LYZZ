-- 商品表增加价格字段（RM）
-- 使用: mysql -u root -p jack_campus < migrations/004_product_price.sql
USE jack_campus;
ALTER TABLE products
  ADD COLUMN price DECIMAL(10,2) NULL DEFAULT NULL COMMENT '价格 RM' AFTER description;
