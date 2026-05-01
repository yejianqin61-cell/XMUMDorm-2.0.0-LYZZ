-- ============================================
-- Errands Service (跑腿/代取/代购/紧急)
-- ============================================
-- 表：errands
-- - status: open / taken / done
-- - type: delivery / purchase / urgent
-- - contact_info：无私聊核心，直接展示联系方式
-- ============================================

USE jack_campus;

CREATE TABLE IF NOT EXISTS errands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  reward DECIMAL(10, 2) NOT NULL DEFAULT 0,
  deadline DATETIME NULL,
  location VARCHAR(120) NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'delivery',
  status VARCHAR(10) NOT NULL DEFAULT 'open',
  contact_info VARCHAR(255) NULL,
  taken_by_user_id INT NULL,
  taken_at DATETIME NULL,
  done_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_errands_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_errands_taken_by_user
    FOREIGN KEY (taken_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_errands_status_created ON errands(status, created_at);
CREATE INDEX idx_errands_type_status_created ON errands(type, status, created_at);
CREATE INDEX idx_errands_deadline ON errands(deadline);

