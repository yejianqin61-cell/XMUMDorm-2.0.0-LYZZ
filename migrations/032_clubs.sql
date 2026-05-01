-- ============================================
-- Clubs (社团广场)
-- ============================================
-- - Recommend 混合流：activity / post
-- - 活动：外链报名 signup_link（替代私聊）
-- - 社团：joinInfo（contact_text + signup_link）
-- - 统计：views/likes/followers 通过表聚合（MVP 先不做复杂缓存）
-- ============================================

USE jack_campus;

CREATE TABLE IF NOT EXISTS clubs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  avatar VARCHAR(255) NULL,
  description TEXT NULL,
  contact_text VARCHAR(255) NULL,
  signup_link VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_clubs_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团';

CREATE TABLE IF NOT EXISTS club_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary VARCHAR(255) NULL,
  cover VARCHAR(255) NULL,
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  location VARCHAR(160) NULL,
  signup_link VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_club_activities_club (club_id),
  INDEX idx_club_activities_time (start_time),
  CONSTRAINT fk_club_activities_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团活动';

CREATE TABLE IF NOT EXISTS club_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  title VARCHAR(160) NULL,
  content TEXT NOT NULL,
  images JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_club_posts_club (club_id),
  INDEX idx_club_posts_created (created_at),
  CONSTRAINT fk_club_posts_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团日常内容';

CREATE TABLE IF NOT EXISTS club_follows (
  user_id INT NOT NULL,
  club_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, club_id),
  INDEX idx_club_follows_club (club_id),
  CONSTRAINT fk_club_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_club_follows_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社团关注';

CREATE TABLE IF NOT EXISTS club_likes (
  user_id INT NOT NULL,
  target_type VARCHAR(10) NOT NULL COMMENT 'activity/post',
  target_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, target_type, target_id),
  INDEX idx_club_likes_target (target_type, target_id),
  CONSTRAINT fk_club_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动/帖子点赞';

CREATE TABLE IF NOT EXISTS club_views (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(10) NOT NULL COMMENT 'activity/post',
  target_id INT NOT NULL,
  viewer_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_club_views_target (target_type, target_id),
  INDEX idx_club_views_created (created_at),
  CONSTRAINT fk_club_views_viewer FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动/帖子浏览';

