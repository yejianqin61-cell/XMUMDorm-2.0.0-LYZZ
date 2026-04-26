-- ============================================
-- 为 posts 增加 title 字段（树洞标题）
-- ============================================
-- 使用: mysql -u root -p jack_campus < migrations/013_posts_title.sql

USE jack_campus;

-- 兼容旧数据：先允许 NULL，应用层对新帖子强制必填
ALTER TABLE posts
  ADD COLUMN title VARCHAR(120) NULL COMMENT '帖子标题（瀑布流展示）' AFTER user_id;

-- 可选：常用排序/筛选可加索引（这里只加普通索引，避免过度）
CREATE INDEX idx_posts_title ON posts(title);

