-- 向 shop_id=8, category_id=31 插入披萨商品
-- 使用: mysql -u root -p jack_campus < migrations/seed_products_shop8_cat31.sql
USE jack_campus;

INSERT INTO products (shop_id, category_id, name, price, description) VALUES
(8, 31, 'Island Tuna', 17.90, '金枪鱼披萨'),
(8, 31, 'Alwaha Chicken', 17.90, '鸡肉披萨'),
(8, 31, 'Restea Chicken Pizza', 16.90, '鸡肉披萨'),
(8, 31, 'Restea Beef Pizza', 16.90, '牛肉披萨'),
(8, 31, 'Beef Pepperoni', 16.90, '牛肉意式辣香肠披萨'),
(8, 31, 'Chicken Pepperoni', 16.90, '鸡肉意式辣香肠披萨'),
(8, 31, 'Supreme Cheesy', 17.90, '至尊芝士披萨'),
(8, 31, 'Supreme BBQ Chicken', 17.90, 'BBQ鸡肉至尊披萨');
