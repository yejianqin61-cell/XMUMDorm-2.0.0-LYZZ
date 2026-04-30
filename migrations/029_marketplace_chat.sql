-- ============================================
-- 029 - Marketplace private chat (buyer <-> seller) per item
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_chat_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  seller_user_id INT NOT NULL,
  buyer_user_id INT NOT NULL,
  last_message_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_marketplace_chat_thread (item_id, buyer_user_id),
  KEY idx_marketplace_chat_threads_seller_time (seller_user_id, last_message_at, id),
  KEY idx_marketplace_chat_threads_buyer_time (buyer_user_id, last_message_at, id),
  CONSTRAINT fk_marketplace_chat_threads_item FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_chat_threads_seller FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_chat_threads_buyer FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketplace_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  sender_user_id INT NOT NULL,
  content VARCHAR(1200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_marketplace_chat_messages_thread_time (thread_id, created_at, id),
  CONSTRAINT fk_marketplace_chat_messages_thread FOREIGN KEY (thread_id) REFERENCES marketplace_chat_threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_chat_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Read-state (per participant)
ALTER TABLE marketplace_chat_threads
  ADD COLUMN seller_last_read_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN buyer_last_read_at TIMESTAMP NULL DEFAULT NULL;

