-- ============================================
-- 允许更多通知类型（marketplace / handbook_comment / course_review_comment 等）
-- 将 notifications.type 从 ENUM 扩展为 VARCHAR，避免每新增一种类型都要改表结构
-- ============================================

USE jack_campus;

ALTER TABLE notifications
  MODIFY COLUMN type VARCHAR(50) NOT NULL;

