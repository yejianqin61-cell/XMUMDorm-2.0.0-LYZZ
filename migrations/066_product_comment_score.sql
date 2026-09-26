-- Food comments: preserve the existing five-level rating while adding a numeric 6-10 score.
-- Run after migrations/002_canteen_system.sql.

ALTER TABLE product_comments
  ADD COLUMN score TINYINT NULL COMMENT 'numeric score from 6 to 10; nullable for historical comments' AFTER rating,
  ADD INDEX idx_product_score (product_id, score);
