-- ============================================
-- Remove demo clubs: 吉他社、羽毛球社、摄影社
-- club_activities / club_posts / club_follows / club_members 由外键 ON DELETE CASCADE 随社团删除。
-- 若已存在 club_likes、club_views 表，请再运行：node scripts/remove-demo-clubs.js
-- （纯 SQL 在部分环境会因表未建全而失败，故点赞/浏览清理放在脚本里。）
-- ============================================

USE jack_campus;

DELETE FROM clubs WHERE name IN ('吉他社', '羽毛球社', '摄影社');
