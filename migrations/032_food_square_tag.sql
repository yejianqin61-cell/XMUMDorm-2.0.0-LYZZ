-- 吃货广场标签：树洞发帖带上此 tag 后出现在食堂吃货广场文章流
-- 用法: mysql -u root -p 你的库名 < migrations/032_food_square_tag.sql

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'food-square', '吃货广场', 'Food Square', NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'food-square' LIMIT 1);
