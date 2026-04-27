-- ============================================
-- Course review ratings (1-5 stars)
-- - 每个用户对同一条课程评价只能评分一次
-- ============================================

USE jack_campus;

CREATE TABLE IF NOT EXISTS course_review_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL COMMENT '1-5',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_review_user (review_id, user_id),
  INDEX idx_review (review_id, id),
  INDEX idx_user (user_id, id),
  FOREIGN KEY (review_id) REFERENCES course_reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User ratings for course reviews';

