-- ============================================
-- Handbook tabs: reorder (Course review after Food)
-- ============================================

USE jack_campus;

UPDATE handbook_tabs SET sort_order = 0 WHERE slug = 'all';
UPDATE handbook_tabs SET sort_order = 1 WHERE slug = 'food';
UPDATE handbook_tabs SET sort_order = 2 WHERE slug = 'course-review';
UPDATE handbook_tabs SET sort_order = 3 WHERE slug = 'explore';
UPDATE handbook_tabs SET sort_order = 4 WHERE slug = 'durian';
UPDATE handbook_tabs SET sort_order = 5 WHERE slug = 'campus-guide';
UPDATE handbook_tabs SET sort_order = 6 WHERE slug = 'study-tips';

