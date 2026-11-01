-- Thread replies and persistent creation receipts. No backfill.

ALTER TABLE campus_post_comments
  ADD COLUMN reply_to_comment_id INT NULL DEFAULT NULL,
  ADD COLUMN reply_to_user_id INT NULL DEFAULT NULL,
  ADD COLUMN reply_to_name VARCHAR(100) NULL DEFAULT NULL,
  ADD INDEX idx_cpc_thread_order (post_id, parent_id, created_at, id);

CREATE TABLE campus_interaction_requests (
  actor_id INT NOT NULL,
  request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operation VARCHAR(32) NOT NULL,
  post_id INT NOT NULL,
  payload_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  result_comment_id INT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (actor_id, request_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
