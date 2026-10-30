-- description: Merchant applications (备案) reviewed by admins, plus store pause support.
-- Idempotent: safe to run twice; missing columns are added only when absent.

CREATE TABLE IF NOT EXISTS shop_merchant_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_user_id INT NOT NULL,
  status ENUM('pending','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  name_zh VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  business_scope VARCHAR(500) NOT NULL,
  contact_name VARCHAR(80) NOT NULL,
  student_id VARCHAR(40) NOT NULL,
  contact_phone VARCHAR(40) NOT NULL,
  contact_wechat VARCHAR(80) NOT NULL,
  -- One pending application per account; generated column gives the partial-unique effect.
  pending_user_id INT AS (IF(status = 'pending', applicant_user_id, NULL)) STORED,
  merchant_id INT NULL,
  reviewer_id INT NULL,
  review_note VARCHAR(500) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_application_pending (pending_user_id),
  KEY idx_shop_application_status (status, created_at, id),
  KEY idx_shop_application_applicant (applicant_user_id, created_at),
  CONSTRAINT fk_shop_application_user FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @ddl = (SELECT IF(COUNT(*)=0,
  'ALTER TABLE shop_merchants ADD COLUMN paused TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_merchants' AND COLUMN_NAME='paused');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(COUNT(*)=0,
  'ALTER TABLE shop_merchants ADD COLUMN business_scope VARCHAR(500) NULL',
  'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_merchants' AND COLUMN_NAME='business_scope');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(COUNT(*)=0,
  'ALTER TABLE shop_merchants ADD COLUMN owner_user_id INT NULL',
  'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_merchants' AND COLUMN_NAME='owner_user_id');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(COUNT(*)=0,
  'ALTER TABLE shop_merchants ADD INDEX idx_shop_merchants_owner (owner_user_id)',
  'SELECT 1')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_merchants' AND INDEX_NAME='idx_shop_merchants_owner');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Existing stores keep their first member as owner, so the new column starts populated.
UPDATE shop_merchants m
JOIN (
  SELECT merchant_id, MIN(user_id) AS owner_id
  FROM shop_merchant_members
  GROUP BY merchant_id
) first_member ON first_member.merchant_id = m.id
SET m.owner_user_id = first_member.owner_id
WHERE m.owner_user_id IS NULL;
