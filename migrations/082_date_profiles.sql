-- description: 交友模块（任务管理表 #9「web:date交友模块」）：交友名片、打招呼、拉黑。
-- depends: 081_confession_interactions
-- reversible: DROP TABLE date_blocks, date_likes, date_profiles（三张都是新表，不改任何已有表）。
-- Additive only. 联系方式只在双方互相打招呼后由接口返回，列表接口永不返回 contact。
-- 执行：node scripts/apply-sql-file.js migrations/082_date_profiles.sql

CREATE TABLE IF NOT EXISTS date_profiles (
  user_id INT NOT NULL PRIMARY KEY,
  visible TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=出现在发现页；0=隐藏（已互相打招呼的人仍可看到）',
  intro VARCHAR(300) NOT NULL COMMENT '自我介绍',
  tags_json JSON NULL COMMENT '兴趣标签，最多 6 个',
  looking_for VARCHAR(16) NOT NULL DEFAULT 'friends' COMMENT 'friends / study / activity / dating',
  contact VARCHAR(100) NOT NULL COMMENT '联系方式（微信号等），仅互相打招呼后可见',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_date_profiles_browse (visible, looking_for, updated_at, user_id),
  CONSTRAINT fk_date_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交友名片';

CREATE TABLE IF NOT EXISTS date_likes (
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (from_user_id, to_user_id),
  KEY idx_date_likes_to (to_user_id, from_user_id),
  CONSTRAINT fk_date_likes_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_date_likes_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交友打招呼（双向即互相喜欢）';

CREATE TABLE IF NOT EXISTS date_blocks (
  user_id INT NOT NULL,
  blocked_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, blocked_user_id),
  KEY idx_date_blocks_blocked (blocked_user_id, user_id),
  CONSTRAINT fk_date_blocks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_date_blocks_blocked FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交友拉黑（双向互不可见）';
