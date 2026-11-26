-- Tags for the friendship buddy-post feed.
-- The feature reuses the existing posts and comments tables.
INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'friendship-study', '学习搭子', 'Study buddy', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'friendship-study' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'friendship-activity', '活动搭子', 'Activity buddy', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'friendship-activity' LIMIT 1);
