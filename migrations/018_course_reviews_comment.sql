-- ============================================
-- Course reviews: add comment/content field
-- ============================================
-- 执行: mysql -u root -p jack_campus < migrations/018_course_reviews_comment.sql

USE jack_campus;

ALTER TABLE course_reviews
  ADD COLUMN comment TEXT NULL AFTER difficulty;

