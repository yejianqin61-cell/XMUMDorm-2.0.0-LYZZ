-- description: Add wall post favorites, comment likes, and author-featured comments for stage 3 discussions.
-- depends: 078_confession_poster_style
-- reversible: drop confession_favorites and confession_comment_likes; drop confession_comments.featured_at.
-- Additive only: no table is dropped and no historical column or row is rewritten.
-- The user_id columns are used only for deduplication, permission checks and admin traceability;
-- API projections must never expose them (see routes/confessions.js).

CREATE TABLE IF NOT EXISTS confession_favorites (
  user_id INT NOT NULL,
  confession_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, confession_id),
  KEY idx_confession_favorites_confession (confession_id),
  CONSTRAINT fk_confession_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_confession_favorites_confession FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙收藏';

CREATE TABLE IF NOT EXISTS confession_comment_likes (
  user_id INT NOT NULL,
  comment_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id),
  KEY idx_confession_comment_likes_comment (comment_id),
  CONSTRAINT fk_confession_comment_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_confession_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES confession_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙评论点赞';

SET @wall_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE confession_comments ADD COLUMN featured_at TIMESTAMP NULL DEFAULT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='confession_comments' AND COLUMN_NAME='featured_at');
PREPARE wall_stmt FROM @wall_ddl;
EXECUTE wall_stmt;
DEALLOCATE PREPARE wall_stmt;

SET @wall_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE confession_comments ADD INDEX idx_confession_comments_featured (confession_id, featured_at)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='confession_comments' AND INDEX_NAME='idx_confession_comments_featured');
PREPARE wall_stmt FROM @wall_ddl;
EXECUTE wall_stmt;
DEALLOCATE PREPARE wall_stmt;
