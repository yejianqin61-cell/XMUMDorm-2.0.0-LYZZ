-- Add missing dependencies only; existing objects are checked by the delivery runner.
CREATE TABLE audit_logs (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NULL,
 role VARCHAR(32) NULL, action VARCHAR(64) NOT NULL, target_type VARCHAR(32) NULL,
 target_id BIGINT UNSIGNED NULL, ip VARCHAR(64) NULL, user_agent VARCHAR(255) NULL,
 meta JSON NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE exp_logs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, action VARCHAR(32) NOT NULL,
 exp INT NOT NULL, ref_type VARCHAR(32) NULL, ref_id BIGINT NULL, meta_json JSON NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_exp_logs_user_created(user_id,created_at), INDEX idx_exp_logs_user_action_ref(user_id,action,ref_type,ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_exp_daily (
 user_id INT NOT NULL, day DATE NOT NULL, action VARCHAR(32) NOT NULL, exp_sum INT NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,day,action), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_terms_acceptances (
 user_id INT NOT NULL, terms_version VARCHAR(64) NOT NULL,
 accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,terms_version), INDEX idx_terms_user_time(user_id,accepted_at),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organizations (
 id INT AUTO_INCREMENT PRIMARY KEY,
 type ENUM('SchoolDepartment','College','Major','Official') NOT NULL,
 name VARCHAR(100) NOT NULL, avatar VARCHAR(500) NULL, description TEXT NULL,
 is_active TINYINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_org_type(type), INDEX idx_org_active(is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organization_memberships (
 id INT AUTO_INCREMENT PRIMARY KEY, organization_id INT NOT NULL, user_id INT NOT NULL,
 title VARCHAR(100) NULL, permission_level TINYINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_org_user(organization_id,user_id), INDEX idx_user_id(user_id),
 FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_posts (
 id INT AUTO_INCREMENT PRIMARY KEY, organization_id INT NOT NULL, author_user_id INT NOT NULL,
 feed_tab ENUM('school','college') NOT NULL, title VARCHAR(200) NOT NULL, content TEXT NOT NULL,
 deleted_at TIMESTAMP NULL DEFAULT NULL, hidden_by_admin TINYINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_feed_tab(feed_tab), INDEX idx_org_id(organization_id), INDEX idx_created_at(created_at),
 FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
 FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_post_images (
 id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, file_path VARCHAR(500) NOT NULL,
 sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
 INDEX idx_campus_post_images_post(post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_post_likes (
 post_id INT NOT NULL, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(post_id,user_id), FOREIGN KEY(post_id) REFERENCES campus_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_post_comments (
 id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NULL, parent_id INT NULL,
 content TEXT NOT NULL, deleted_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
 FOREIGN KEY(parent_id) REFERENCES campus_post_comments(id) ON DELETE CASCADE,
 INDEX idx_cpc_post(post_id), INDEX idx_cpc_parent(parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sanctions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 type ENUM('ban','mute') NOT NULL,
 duration_days INT UNSIGNED NULL, reason VARCHAR(255) NULL,
 operator_id BIGINT UNSIGNED NULL,
 starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ends_at DATETIME NULL, revoked_at DATETIME NULL, revoked_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_sanctions_user(user_id),
 INDEX idx_sanctions_active(user_id,type,ends_at),
 INDEX idx_sanctions_operator(operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sensitive_words (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 word VARCHAR(128) NOT NULL,
 category VARCHAR(32) NULL DEFAULT 'general',
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_sensitive_word(word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
