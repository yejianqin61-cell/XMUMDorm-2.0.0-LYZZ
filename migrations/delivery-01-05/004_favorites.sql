-- Persistent campus favorites, separate from product favorites.
CREATE TABLE `campus_post_favorites` (
  `user_id` INT NOT NULL,
  `post_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`, `post_id`),
  KEY `idx_cpf_user_created_post` (`user_id`, `created_at` DESC, `post_id` DESC),
  KEY `idx_cpf_post_user` (`post_id`, `user_id`),
  CONSTRAINT `fk_cpf_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_cpf_post` FOREIGN KEY (`post_id`)
    REFERENCES `campus_posts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Campus news favorites; current content visibility is checked at read time';
