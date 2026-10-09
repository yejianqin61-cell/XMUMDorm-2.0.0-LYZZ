-- 070 - versioned terms acceptance (server-side source of truth)
CREATE TABLE IF NOT EXISTS user_terms_acceptances (
  user_id INT NOT NULL,
  terms_version VARCHAR(64) NOT NULL,
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, terms_version),
  KEY idx_user_terms_acceptances_user_time (user_id, accepted_at),
  CONSTRAINT fk_user_terms_acceptances_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
