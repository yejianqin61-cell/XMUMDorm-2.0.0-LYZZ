-- Candidate only. Empty security tables are valid; query failures are NOT empty results.
-- Fields preserve existing shared services' contract. No seeds, grants or role changes.
-- No FK is added to users: the existing sanctions/word-list schema has none.
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
