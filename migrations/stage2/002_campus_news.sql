-- No backfill/seed SQL. Defaults keep unclassified historical records out of news feed.
-- Original author/organization FK rules are NOT altered.
ALTER TABLE campus_posts
 MODIFY organization_id INT NULL,
 MODIFY feed_tab ENUM('school','college') NULL,
 MODIFY content MEDIUMTEXT NOT NULL,
 ADD source_kind ENUM('legacy','news') NOT NULL DEFAULT 'legacy',
 ADD lifecycle_status ENUM('draft','published','withdrawn') NOT NULL DEFAULT 'published',
 ADD category ENUM('competition','lecture','campus-life') NULL,
 ADD audience_scope ENUM('all','colleges') NULL,
 ADD revision INT UNSIGNED NOT NULL DEFAULT 0,
 ADD published_at DATETIME(3) NULL,
 ADD updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 ADD INDEX idx_campus_news_feed(source_kind,lifecycle_status,hidden_by_admin,deleted_at,published_at,id);
CREATE TABLE colleges (
 id VARCHAR(64) PRIMARY KEY, code VARCHAR(64) NOT NULL UNIQUE,
 name VARCHAR(200) NOT NULL, is_active TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE campus_post_audiences (
 post_id INT NOT NULL, college_id VARCHAR(64) NOT NULL,
 PRIMARY KEY(post_id,college_id),
 FOREIGN KEY(post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
 FOREIGN KEY(college_id) REFERENCES colleges(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE campus_news_assets (
 id CHAR(36) PRIMARY KEY, object_key VARCHAR(500) NOT NULL UNIQUE,
 mime VARCHAR(50) NOT NULL, byte_size INT UNSIGNED NOT NULL,
 storage_kind ENUM('local','object') NOT NULL,
 state ENUM('pending','ready','failed') NOT NULL,
 uploaded_by INT NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_asset_orphans(state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE campus_news_images (
 post_id INT NOT NULL, asset_id CHAR(36) NOT NULL, sort_order TINYINT UNSIGNED NOT NULL,
 PRIMARY KEY(post_id,asset_id), UNIQUE KEY uk_news_image_order(post_id,sort_order),
 FOREIGN KEY(post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
 FOREIGN KEY(asset_id) REFERENCES campus_news_assets(id) ON DELETE RESTRICT,
 CHECK(sort_order < 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- No FK to current post/user: existing CASCADE account/organization deletion must not erase history.
-- post_id is a typed historical reference; never reuse IDs or delete this table's rows.
CREATE TABLE campus_news_versions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 post_id INT NOT NULL, revision INT UNSIGNED NOT NULL,
 snapshot JSON NOT NULL, actor_id INT NOT NULL, actor_name VARCHAR(100) NOT NULL,
 action VARCHAR(40) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uk_news_revision(post_id,revision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE campus_news_version_assets (
 version_id BIGINT UNSIGNED NOT NULL, asset_id CHAR(36) NOT NULL,
 sort_order TINYINT UNSIGNED NOT NULL,
 PRIMARY KEY(version_id,asset_id), UNIQUE KEY uk_version_image_order(version_id,sort_order),
 FOREIGN KEY(version_id) REFERENCES campus_news_versions(id) ON DELETE RESTRICT,
 FOREIGN KEY(asset_id) REFERENCES campus_news_assets(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE campus_news_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL,
 revision INT UNSIGNED NOT NULL, version_id BIGINT UNSIGNED NOT NULL,
 actor_id INT NOT NULL, actor_name VARCHAR(100) NOT NULL, action VARCHAR(40) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uk_news_audit_revision(post_id,revision),
 FOREIGN KEY(version_id) REFERENCES campus_news_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
