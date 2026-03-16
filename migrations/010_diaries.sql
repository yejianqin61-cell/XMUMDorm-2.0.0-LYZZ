-- 010_diaries.sql
-- 日记本功能：按用户 + 日期存一篇日记
-- 一天一篇，(user_id, date) 唯一

CREATE TABLE IF NOT EXISTS diaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '所属用户（users.id）',
  date DATE NOT NULL COMMENT '日记日期（本地日历日）',
  content TEXT NULL COMMENT '日记正文',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_user_date (user_id, date),
  KEY idx_user_date (user_id, date),
  CONSTRAINT fk_diaries_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日记本';

