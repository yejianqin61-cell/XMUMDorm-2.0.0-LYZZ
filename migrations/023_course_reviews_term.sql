-- ============================================
-- Course reviews: term (year/month)
-- ============================================

USE jack_campus;

ALTER TABLE course_reviews
  ADD COLUMN term_year INT NULL,
  ADD COLUMN term_month CHAR(2) NULL;

CREATE INDEX idx_course_reviews_term ON course_reviews (term_year, term_month, id);

