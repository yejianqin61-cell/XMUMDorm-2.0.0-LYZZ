-- 树洞新增Tag种子数据（双语）
-- 用法: node scripts/run-incremental-migrations.js

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'csgo', 'CSGO', 'CSGO', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'csgo' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'pubg', 'PUBG', 'PUBG', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'pubg' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'valorant', 'Valorant', 'Valorant', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'valorant' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'honor-of-kings', '王者荣耀', 'Honor of Kings', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'honor-of-kings' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'delta-force', 'DeltaForce', 'Delta Force', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'delta-force' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'lol', 'LOL英雄联盟', 'League of Legends', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'lol' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'minecraft', 'Minecraft我的世界', 'Minecraft', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'minecraft' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'genshin', 'Genshin原神', 'Genshin Impact', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'genshin' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'basketball', 'Basketball', 'Basketball', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'basketball' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'running', 'Running', 'Running', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'running' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'swimming', 'Swimming', 'Swimming', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'swimming' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'fitness', 'Fitness', 'Fitness', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'fitness' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'nba', 'NBA', 'NBA', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'nba' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'soccer', 'Soccer', 'Soccer', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'soccer' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'memes', '梗图Memes', 'Memes', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'memes' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'tennis', 'Tennis', 'Tennis', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'tennis' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'table-tennis', 'TableTennis', 'Table Tennis', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'table-tennis' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'badminton', 'Badminton', 'Badminton', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'badminton' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'shopping', '逛街Shopping', 'Shopping', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'shopping' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'movies', 'Movies', 'Movies', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'movies' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'music', 'Music', 'Music', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'music' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'kpop', 'KPOP', 'KPOP', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'kpop' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'dating', 'Dating恋爱', 'Dating', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'dating' LIMIT 1);

INSERT INTO tags (slug, name_zh, name_en, created_by)
SELECT 'nightlife', 'Nightlife夜生活', 'Nightlife', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'nightlife' LIMIT 1);
