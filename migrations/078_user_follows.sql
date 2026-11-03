CREATE TABLE IF NOT EXISTS user_follows (
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  KEY idx_user_follows_followers (following_id, created_at),
  KEY idx_user_follows_following (follower_id, created_at),
  CONSTRAINT fk_user_follows_follower
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_follows_following
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
