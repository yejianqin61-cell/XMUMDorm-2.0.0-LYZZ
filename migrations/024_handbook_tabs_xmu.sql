-- ============================================
-- Handbook tabs: XMUM custom set
-- ============================================
-- 规则：
-- - 保留 all 与 course-review
-- - 其余启用 tab 替换为：Food / Explore / Durian / Campus Guide / Study Tips
-- - 为了尽量不影响已有文章的 tab_id，优先复用旧 tab 行（通过改 slug/name）

USE jack_campus;

START TRANSACTION;

-- 1) 复用旧 tabs（若存在）来承接已有文章：
-- freshman-guide -> campus-guide
UPDATE handbook_tabs
SET slug = 'campus-guide', name_zh = '校内周边咨询', name_en = 'Campus Guide', sort_order = 4, is_enabled = 1
WHERE slug = 'freshman-guide';

-- life-tips -> food
UPDATE handbook_tabs
SET slug = 'food', name_zh = '美食', name_en = 'Food', sort_order = 1, is_enabled = 1
WHERE slug = 'life-tips';

-- avoid-pit -> explore
UPDATE handbook_tabs
SET slug = 'explore', name_zh = '游玩', name_en = 'Explore', sort_order = 3, is_enabled = 1
WHERE slug = 'avoid-pit';

-- faq -> study-tips
UPDATE handbook_tabs
SET slug = 'study-tips', name_zh = '学法分享', name_en = 'Study Tips', sort_order = 6, is_enabled = 1
WHERE slug = 'faq';

-- 2) 确保保留 all、course-review 的名字与排序（若已存在则更新）
INSERT INTO handbook_tabs (slug, name_zh, name_en, sort_order, is_enabled) VALUES
  ('all', '全部', 'All', 0, 1),
  ('course-review', '课程测评', 'Course Review', 2, 1)
ON DUPLICATE KEY UPDATE
  name_zh = VALUES(name_zh),
  name_en = VALUES(name_en),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled);

-- 3) 确保 5 个目标 tabs 都存在（若没被复用，则插入；若已存在则修正名字/排序）
INSERT INTO handbook_tabs (slug, name_zh, name_en, sort_order, is_enabled) VALUES
  ('food', '美食', 'Food', 1, 1),
  ('course-review', '课程测评', 'Course Review', 2, 1),
  ('explore', '游玩', 'Explore', 3, 1),
  ('durian', '榴莲', 'Durian', 4, 1),
  ('campus-guide', '校内周边咨询', 'Campus Guide', 5, 1),
  ('study-tips', '学法分享', 'Study Tips', 6, 1)
ON DUPLICATE KEY UPDATE
  name_zh = VALUES(name_zh),
  name_en = VALUES(name_en),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled);

-- 4) 多余的 tab 禁用（少了就加、多了就减）
UPDATE handbook_tabs
SET is_enabled = 0
WHERE slug NOT IN ('all', 'course-review', 'food', 'explore', 'durian', 'campus-guide', 'study-tips');

COMMIT;

