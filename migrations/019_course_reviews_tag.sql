-- ============================================
-- Course reviews: add tag field
-- 标签枚举：MPU / GE / ME / required
-- ============================================

USE jack_campus;

ALTER TABLE course_reviews
  ADD COLUMN tag VARCHAR(20) NOT NULL DEFAULT 'required' AFTER teacher,
  ADD INDEX idx_tag (tag, id);

