-- 待办事项表
CREATE TABLE IF NOT EXISTS todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  priority TINYINT NOT NULL DEFAULT 0 COMMENT '0=无, 1=低, 2=中, 3=高',
  due_date DATE NULL,
  due_time TIME NULL,
  is_completed TINYINT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  list_type ENUM('personal','course','club','other') NOT NULL DEFAULT 'personal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_todos_user_date (user_id, is_completed, due_date),
  INDEX idx_todos_user_list (user_id, list_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
