-- ============================================
-- Square · 新生手册（Handbook）内容系统
-- ============================================
-- 目标：文章（Markdown）+ 标签（独立）+ 互动（浏览/点赞/收藏/分享）+ 评论 + 用户 Checklist
-- 执行: mysql -u root -p jack_campus < migrations/017_handbook.sql

USE jack_campus;

-- ---------- 1) Tabs ----------
CREATE TABLE IF NOT EXISTS handbook_tabs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE COMMENT 'all/freshman-guide/life-tips/avoid-pit/faq/course-review',
  name_zh VARCHAR(80) NOT NULL,
  name_en VARCHAR(80) NOT NULL,
  sort_order TINYINT DEFAULT 0,
  is_enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enabled_sort (is_enabled, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook tabs';

-- Seed 基础 tabs（可按需增删）
INSERT INTO handbook_tabs (slug, name_zh, name_en, sort_order, is_enabled) VALUES
  ('all', '全部', 'All', 0, 1),
  ('freshman-guide', '新生指南', 'Freshman Guide', 1, 1),
  ('course-review', '课程测评', 'Course Review', 2, 1),
  ('life-tips', '生活技巧', 'Life Tips', 3, 1),
  ('avoid-pit', '避坑指南', 'Avoid Pitfalls', 4, 1),
  ('faq', '常见问题', 'FAQ', 5, 1)
ON DUPLICATE KEY UPDATE
  name_zh = VALUES(name_zh),
  name_en = VALUES(name_en),
  sort_order = VALUES(sort_order),
  is_enabled = VALUES(is_enabled);

-- ---------- 2) Tags（独立，避免与树洞 tags 混用） ----------
CREATE TABLE IF NOT EXISTS handbook_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  sort_order TINYINT DEFAULT 0,
  is_enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enabled_sort (is_enabled, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook tags';

-- ---------- 3) Articles（Markdown） ----------
CREATE TABLE IF NOT EXISTS handbook_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tab_id INT NOT NULL,
  author_user_id INT NOT NULL COMMENT '投稿者/作者（普通用户或 admin）',
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(400) NULL,
  cover_path VARCHAR(500) NULL COMMENT 'object key, e.g. handbook/covers/article_1.webp',
  content LONGTEXT NOT NULL COMMENT 'markdown',
  source_name VARCHAR(120) NULL COMMENT '公众号/来源名',
  source_link VARCHAR(600) NULL COMMENT '来源链接',
  status ENUM('draft','published','hidden') DEFAULT 'draft',
  published_at TIMESTAMP NULL DEFAULT NULL,
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  saves_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tab_pub (tab_id, published_at, id),
  INDEX idx_author (author_user_id, created_at, id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tab_id) REFERENCES handbook_tabs(id) ON DELETE RESTRICT,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook articles';

CREATE TABLE IF NOT EXISTS handbook_article_tag_map (
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, tag_id),
  INDEX idx_tag_id (tag_id),
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES handbook_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook article-tag map';

-- ---------- 4) Likes / Saves ----------
CREATE TABLE IF NOT EXISTS handbook_article_likes (
  user_id INT NOT NULL,
  article_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, article_id),
  INDEX idx_article_id (article_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook article likes';

CREATE TABLE IF NOT EXISTS handbook_article_saves (
  user_id INT NOT NULL,
  article_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, article_id),
  INDEX idx_article_id (article_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook article saves';

-- ---------- 5) Comments ----------
CREATE TABLE IF NOT EXISTS handbook_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_article_time (article_id, created_at),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES handbook_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook comments';

-- ---------- 6) Checklist（用户收藏清单） ----------
CREATE TABLE IF NOT EXISTS handbook_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook checklists';

CREATE TABLE IF NOT EXISTS handbook_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_id INT NOT NULL,
  content VARCHAR(300) NOT NULL,
  is_done TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_checklist (checklist_id, sort_order, id),
  FOREIGN KEY (checklist_id) REFERENCES handbook_checklists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Handbook checklist items';

-- ---------- 7) CourseReview（独立实体） ----------
CREATE TABLE IF NOT EXISTS course_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(180) NOT NULL,
  teacher VARCHAR(120) NULL,
  rating TINYINT NOT NULL COMMENT '1-5',
  difficulty TINYINT NOT NULL COMMENT '1-5',
  created_by INT NOT NULL COMMENT 'user_id',
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_name, teacher, id),
  INDEX idx_deleted (deleted_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Course reviews (independent)';

CREATE TABLE IF NOT EXISTS course_review_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_review_time (review_id, created_at),
  INDEX idx_user (user_id, id),
  FOREIGN KEY (review_id) REFERENCES course_reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Course review comments';

