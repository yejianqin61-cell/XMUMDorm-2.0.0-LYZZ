-- ============================================
-- 社团活动 / 社团日常帖 评论（一级 + 二级回复）
-- ============================================
-- 执行（与当前连接串同一库，如 Railway 的 DATABASE_URL）:
--   node scripts/apply-sql-file.js migrations/037_club_comments.sql
-- 勿写 USE xxx，避免连到 railway 库时误切到不存在的 jack_campus。

CREATE TABLE IF NOT EXISTS club_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(10) NOT NULL COMMENT 'activity / post',
  target_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT NULL COMMENT 'NULL=一级评论；非空=回复某条一级（仅二级）',
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_club_comments_target (target_type, target_id, deleted_at),
  INDEX idx_club_comments_parent (parent_id),
  INDEX idx_club_comments_user (user_id),
  CONSTRAINT fk_club_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_club_comments_parent FOREIGN KEY (parent_id) REFERENCES club_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团活动与日常帖评论';
