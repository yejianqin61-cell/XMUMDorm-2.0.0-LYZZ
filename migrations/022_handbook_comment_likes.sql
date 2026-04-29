-- ============================================
-- Square · Handbook comment likes (level-1)
-- ============================================
-- 用途：
-- - 文章评论（handbook_comments）支持点赞
-- - 仅用于展示/交互（不影响课程评价匿名体系）

USE jack_campus;

-- 给评论表补一个汇总字段（避免每次聚合 COUNT(*)）
ALTER TABLE handbook_comments
  ADD COLUMN likes_count INT DEFAULT 0;

-- 评论点赞明细表：一人只能给同一条评论点赞一次（toggle）
CREATE TABLE IF NOT EXISTS handbook_comment_likes (
  user_id INT NOT NULL,
  comment_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id),
  INDEX idx_comment_id (comment_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES handbook_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook comment likes';

