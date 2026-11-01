-- Stable academic identity and frozen publication recipients. No user backfill.

ALTER TABLE colleges
  ADD COLUMN name_en VARCHAR(200) NULL;

CREATE TABLE academic_programmes (
  id VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL,
  college_id VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  level ENUM('undergraduate','foundation') NOT NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_academic_programme_code (code),
  UNIQUE KEY uk_academic_programme_college (id,college_id),
  KEY idx_programmes_college_active (college_id,is_active,id),
  CONSTRAINT fk_academic_programme_college FOREIGN KEY (college_id)
    REFERENCES colleges(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN college_id VARCHAR(64) NULL,
  ADD COLUMN programme_id VARCHAR(64) NULL,
  ADD KEY idx_users_college_status_role (college_id,status,role,id),
  ADD KEY idx_users_programme_college (programme_id,college_id),
  ADD CONSTRAINT ck_users_programme_requires_college
    CHECK (programme_id IS NULL OR college_id IS NOT NULL),
  ADD CONSTRAINT fk_users_academic_college FOREIGN KEY (college_id)
    REFERENCES colleges(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_users_academic_programme FOREIGN KEY (programme_id,college_id)
    REFERENCES academic_programmes(id,college_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE campus_news_notification_deliveries (
  publication_version_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  matched_college_id VARCHAR(64) NOT NULL,
  state ENUM('pending','delivered','skipped') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  notification_id INT NULL,
  last_error_code VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  delivered_at DATETIME(3) NULL,
  PRIMARY KEY (publication_version_id,user_id),
  KEY idx_news_delivery_pending (state,next_attempt_at,publication_version_id,user_id),
  KEY idx_news_delivery_user (user_id),
  CONSTRAINT fk_news_delivery_publication FOREIGN KEY (publication_version_id)
    REFERENCES campus_news_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_news_delivery_recipient FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
