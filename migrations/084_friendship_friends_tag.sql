-- General friendship posts use the same feed and comments as other buddy posts.
INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'friendship-friends', '交朋友', 'Make friends', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'friendship-friends' LIMIT 1);
