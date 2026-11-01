-- TEST ONLY. Reconstructed historical definitions, not a target database dump.
-- No accounts, secrets or business data. NEVER run on an existing database.
CREATE TABLE stage2_schema_migrations (
 file_name VARCHAR(100) NOT NULL, statement_index INT NOT NULL, sha256 CHAR(64) NOT NULL,
 state ENUM('started','applied') NOT NULL, applied_at DATETIME NULL,
 PRIMARY KEY(file_name,statement_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 student_id VARCHAR(50) NULL UNIQUE, username VARCHAR(100) NOT NULL,
 email VARCHAR(255) NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 role ENUM('student','merchant','admin') NOT NULL DEFAULT 'student',
 status ENUM('active','banned','deactivated') NOT NULL DEFAULT 'active',
 banned_until DATETIME NULL, muted_until DATETIME NULL, last_login_at DATETIME NULL,
 email_verified TINYINT NOT NULL DEFAULT 0, avatar VARCHAR(255) NULL, nickname VARCHAR(100) NULL,
 college VARCHAR(100) NULL, grade VARCHAR(50) NULL, major VARCHAR(100) NULL,
 show_college TINYINT NOT NULL DEFAULT 1, show_grade TINYINT NOT NULL DEFAULT 1, show_major TINYINT NOT NULL DEFAULT 1,
 level TINYINT NOT NULL DEFAULT 1, exp INT NOT NULL DEFAULT 0, badge VARCHAR(32) NULL DEFAULT 'freshman',
 weekly_comment_count INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_username(username), INDEX idx_role(role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NULL,
 role VARCHAR(32) NULL, action VARCHAR(64) NOT NULL, target_type VARCHAR(32) NULL,
 target_id BIGINT UNSIGNED NULL, ip VARCHAR(64) NULL, user_agent VARCHAR(255) NULL,
 meta JSON NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE exp_logs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, action VARCHAR(32) NOT NULL,
 exp INT NOT NULL, ref_type VARCHAR(32) NULL, ref_id BIGINT NULL, meta_json JSON NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_exp_logs_user_created(user_id,created_at), INDEX idx_exp_logs_user_action_ref(user_id,action,ref_type,ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_exp_daily (
 user_id INT NOT NULL, day DATE NOT NULL, action VARCHAR(32) NOT NULL, exp_sum INT NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,day,action), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_terms_acceptances (
 user_id INT NOT NULL, terms_version VARCHAR(64) NOT NULL,
 accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,terms_version), INDEX idx_terms_user_time(user_id,accepted_at),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organizations (
 id INT AUTO_INCREMENT PRIMARY KEY,
 type ENUM('SchoolDepartment','College','Major','Official') NOT NULL,
 name VARCHAR(100) NOT NULL, avatar VARCHAR(500) NULL, description TEXT NULL,
 is_active TINYINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_org_type(type), INDEX idx_org_active(is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organization_memberships (
 id INT AUTO_INCREMENT PRIMARY KEY, organization_id INT NOT NULL, user_id INT NOT NULL,
 title VARCHAR(100) NULL, permission_level TINYINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_org_user(organization_id,user_id), INDEX idx_user_id(user_id),
 FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_posts (
 id INT AUTO_INCREMENT PRIMARY KEY, organization_id INT NOT NULL, author_user_id INT NOT NULL,
 feed_tab ENUM('school','college') NOT NULL, title VARCHAR(200) NOT NULL, content TEXT NOT NULL,
 deleted_at TIMESTAMP NULL DEFAULT NULL, hidden_by_admin TINYINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_feed_tab(feed_tab), INDEX idx_org_id(organization_id), INDEX idx_created_at(created_at),
 FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
 FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_post_images (
 id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, file_path VARCHAR(500) NOT NULL,
 sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
 INDEX idx_campus_post_images_post(post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_post_likes (
 post_id INT NOT NULL, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(post_id,user_id), FOREIGN KEY(post_id) REFERENCES campus_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_post_comments (
 id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NULL, parent_id INT NULL,
 content TEXT NOT NULL, deleted_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(post_id) REFERENCES campus_posts(id) ON DELETE CASCADE,
 FOREIGN KEY(parent_id) REFERENCES campus_post_comments(id) ON DELETE CASCADE,
 INDEX idx_cpc_post(post_id), INDEX idx_cpc_parent(parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sanctions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 type ENUM('ban','mute') NOT NULL,
 duration_days INT UNSIGNED NULL, reason VARCHAR(255) NULL,
 operator_id BIGINT UNSIGNED NULL,
 starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ends_at DATETIME NULL, revoked_at DATETIME NULL, revoked_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_sanctions_user(user_id),
 INDEX idx_sanctions_active(user_id,type,ends_at),
 INDEX idx_sanctions_operator(operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sensitive_words (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 word VARCHAR(128) NOT NULL,
 category VARCHAR(32) NULL DEFAULT 'general',
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_sensitive_word(word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(120) NULL,
  content TEXT NOT NULL,
  type ENUM('normal','announcement') DEFAULT 'normal',
  content_origin ENUM('original','repost') NULL DEFAULT NULL,
  repost_source VARCHAR(100) NULL DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  hidden_by_admin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_deleted_at (deleted_at),
  KEY idx_created_at (created_at),
  KEY idx_type (type),
  KEY idx_posts_title (title),
  CONSTRAINT fk_s5_local_posts_author FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  post_id INT NULL,
  comment_id INT NULL,
  from_user_id INT NULL,
  extra JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_is_read (is_read),
  KEY idx_created_at (created_at),
  KEY idx_notifications_user_type_read_created_at (user_id,type,is_read,created_at),
  KEY idx_s5_local_notifications_post (post_id),
  KEY idx_s5_local_notifications_from (from_user_id),
  CONSTRAINT fk_s5_local_notifications_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_s5_local_notifications_post FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_s5_local_notifications_from FOREIGN KEY (from_user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  file_path VARCHAR(500) NOT NULL COMMENT '如 post_102_1.jpg',
  sort_order TINYINT DEFAULT 0 COMMENT '0/1/2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子图片';

CREATE TABLE IF NOT EXISTS post_likes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_id (post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子点赞';

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '评论者ID',
  parent_id INT NULL COMMENT 'NULL=一级评论，非空=回复某条评论(仅二级)',
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论';

CREATE TABLE IF NOT EXISTS advertisement_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
  sponsor_name VARCHAR(160) NOT NULL,
  sponsor_logo VARCHAR(500) NULL,
  cta_label VARCHAR(80) NULL,
  cta_type ENUM('none', 'shop', 'product', 'region', 'internal', 'https') NOT NULL DEFAULT 'none',
  cta_target VARCHAR(500) NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_advertisement_post (post_id),
  KEY idx_advertisement_status (status),
  CONSTRAINT fk_advertisement_post_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_advertisement_post_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_advertisement_post_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员广告帖元数据';

CREATE TABLE IF NOT EXISTS regions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '区域ID',
  code VARCHAR(20) NOT NULL UNIQUE COMMENT 'D6/LY3/B1/BELL/other',
  name VARCHAR(50) NOT NULL COMMENT '展示名称',
  sort_order TINYINT DEFAULT 0 COMMENT '前端展示顺序'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区域表';

CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '店铺ID',
  user_id INT NOT NULL UNIQUE COMMENT '商家用户ID，一用户一店',
  region_id INT NOT NULL COMMENT '所属区域ID',
  name VARCHAR(100) NOT NULL COMMENT '店铺名称',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region_id (region_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='店铺表';

CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
  shop_id INT NOT NULL COMMENT '所属店铺ID',
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  sort_order TINYINT DEFAULT 0 COMMENT '同店铺内排序',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shop_id (shop_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '商品ID',
  shop_id INT NOT NULL COMMENT '所属店铺ID',
  category_id INT NULL COMMENT '所属分类ID，NULL=未分类',
  name VARCHAR(200) NOT NULL COMMENT '商品名称',
  description TEXT NULL COMMENT '商品文字说明',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shop_id (shop_id),
  INDEX idx_category_id (category_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL COMMENT '商品ID',
  file_path VARCHAR(500) NOT NULL COMMENT '相对路径',
  sort_order TINYINT DEFAULT 0 COMMENT '0~4',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_id (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品卖家秀图片';

CREATE TABLE IF NOT EXISTS product_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL COMMENT '商品ID',
  user_id INT NOT NULL COMMENT '评论者ID',
  parent_id INT NULL COMMENT 'NULL=一级，非空=回复某条(仅二级)',
  rating ENUM('夯爆了','顶级','人上人','NPC','拉完了') NOT NULL COMMENT '评级',
  content VARCHAR(300) NOT NULL COMMENT '文字，≤300字',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_id (product_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES product_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品评论';

CREATE TABLE IF NOT EXISTS product_comment_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL COMMENT '评论ID',
  file_path VARCHAR(500) NOT NULL COMMENT '相对路径',
  sort_order TINYINT DEFAULT 0 COMMENT '0~2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comment_id (comment_id),
  FOREIGN KEY (comment_id) REFERENCES product_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论图片';

CREATE TABLE IF NOT EXISTS product_favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  product_id INT NOT NULL COMMENT '商品ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_product (user_id, product_id),
  INDEX idx_user_id (user_id),
  INDEX idx_product_id (product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品收藏';

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '标签ID',
  slug VARCHAR(80) NOT NULL COMMENT 'URL 用唯一标识',
  name_zh VARCHAR(100) NOT NULL COMMENT '中文名',
  name_en VARCHAR(100) NOT NULL COMMENT '英文名',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL COMMENT '创建者（管理员）',
  UNIQUE KEY uk_tags_slug (slug),
  INDEX idx_tags_created_at (created_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子标签（仅管理员可创建）';

CREATE TABLE IF NOT EXISTS post_tag_map (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子-标签';

CREATE TABLE IF NOT EXISTS tag_visibility (
  user_id INT NOT NULL,
  tag_id INT NOT NULL,
  visible TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tag_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
