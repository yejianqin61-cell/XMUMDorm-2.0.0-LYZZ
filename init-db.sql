-- ============================================
-- 数据库初始化脚本
-- ============================================
-- 创建时间: 2025-01-26
-- 功能: 创建数据库和用户表结构

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS jack_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE jack_campus;

-- ============================================
-- 用户表 (users)
-- ============================================
-- 修改时间: 2025-01-26
-- 最新修改: 2025-01-26 - 添加 email 字段，student_id 改为可选（商家不需要学号）
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID，自增主键',
  student_id VARCHAR(50) NULL UNIQUE COMMENT '学号，唯一标识（非商家必填，商家可为空）',
  dorm_id VARCHAR(21) NOT NULL COMMENT 'DORM 系统独立编号',
  username VARCHAR(100) NOT NULL COMMENT '用户名',
  email VARCHAR(255) NULL UNIQUE COMMENT '邮箱（非商家必填，格式：xxx@xmu.edu.my）',
  password_hash VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  role ENUM('student', 'merchant', 'admin') DEFAULT 'student' COMMENT '用户角色：学生/商家/管理员(官方号)',
  email_verified TINYINT(1) DEFAULT 0 COMMENT '邮箱是否已验证（0=未验证，1=已验证）',
  avatar VARCHAR(255) NULL COMMENT '头像路径，NULL 用默认头像',
  nickname VARCHAR(100) NULL COMMENT '昵称，展示用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_student_id (student_id),
  UNIQUE INDEX uq_users_dorm_id (dorm_id),
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 帖子表 (posts) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '发帖用户ID',
  content TEXT NOT NULL COMMENT '正文',
  type ENUM('normal', 'announcement') DEFAULT 'normal' COMMENT '普通帖/公告',
  content_origin ENUM('original', 'repost') NULL DEFAULT NULL COMMENT '原创/转载，NULL 为未声明',
  repost_source VARCHAR(100) NULL DEFAULT NULL COMMENT '转载来源',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  hidden_by_admin TINYINT(1) DEFAULT 0 COMMENT '是否被管理员隐藏',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子表';

-- ============================================
-- 帖子图片表 (post_images) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  file_path VARCHAR(500) NOT NULL COMMENT '如 post_102_1.jpg',
  sort_order TINYINT DEFAULT 0 COMMENT '0/1/2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子图片';

-- ============================================
-- 点赞表 (post_likes) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS post_likes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_id (post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子点赞';

-- ============================================
-- 评论表 (comments) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '评论者ID',
  parent_id INT NULL COMMENT 'NULL=一级评论，非空=回复(仅二级)',
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

-- ============================================
-- 通知表 (notifications) - 2.0.0
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '接收者ID',
  type VARCHAR(50) NOT NULL COMMENT '通知类型：comment/like/announcement/marketplace/handbook_comment/... ',
  is_read TINYINT(1) DEFAULT 0,
  post_id INT NULL,
  comment_id INT NULL,
  from_user_id INT NULL COMMENT '触发者',
  extra JSON NULL COMMENT '摘要等',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知';

-- ============================================
-- 万能墙帖子表 (confessions) - M09
-- 来源迁移: 064_confessions.sql
-- ============================================
-- user_id 仅用于管理员后台追溯；匿名墙业务层严禁下发该字段
CREATE TABLE IF NOT EXISTS confessions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '作者ID（前台匿名，仅后台可追溯）',
  template_key VARCHAR(32) NOT NULL DEFAULT 'bigtype' COMMENT '展示版式：bigtype/letter/note',
  content TEXT NOT NULL COMMENT '正文（纯文本，已 sanitize）',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '逻辑删除时间',
  hidden_by_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '管理员隐藏标记',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_created (deleted_at, created_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙帖子';

-- ============================================
-- 万能墙点赞表 (confession_likes) - M09
-- 来源迁移: 065_confession_social.sql
-- ============================================
CREATE TABLE IF NOT EXISTS confession_likes (
  user_id INT NOT NULL,
  confession_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, confession_id),
  INDEX idx_confession_id (confession_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙点赞';

-- ============================================
-- 万能墙评论表 (confession_comments) - M09
-- 来源迁移: 065_confession_social.sql
-- ============================================
CREATE TABLE IF NOT EXISTS confession_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  confession_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '评论者ID（前台匿名）',
  parent_id INT NULL COMMENT 'NULL=一级评论，非空=回复某条一级评论（仅二级）',
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_confession_id (confession_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES confession_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='万能墙评论';

-- ============================================
-- 学习资料 · 课程字典 (courses) - M10
-- 来源迁移: 069_materials.sql
-- 说明：课程身份 = 名字 + 讲师（course_code 可选、不唯一）
--       lecturer 用空串哨兵而非 NULL —— MySQL 唯一约束对 NULL 不生效
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL COMMENT '规范化课程名（聚合单位之一）',
  lecturer VARCHAR(120) NOT NULL DEFAULT '' COMMENT '讲师；未知用空串哨兵',
  course_code VARCHAR(32) DEFAULT NULL COMMENT '可选，如 BSC103；不再唯一',
  is_pseudo TINYINT NOT NULL DEFAULT 0 COMMENT '1=通用/其他 伪课程',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name_lecturer (name, lecturer),
  KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程字典（聚合单位=名字+讲师）';

-- 固定伪课程：id=1，承接不属于任何课程的资料
INSERT IGNORE INTO courses (id, name, lecturer, course_code, is_pseudo)
VALUES (1, '通用 / 其他', '', NULL, 1);

-- ============================================
-- 学习资料 · 课程别名 (course_aliases) - M10
-- 来源迁移: 069_materials.sql
-- ============================================
CREATE TABLE IF NOT EXISTS course_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '指向 courses.id（canonical）',
  alias_name VARCHAR(180) NOT NULL COMMENT '被合并掉的旧名/别称',
  alias_lecturer VARCHAR(120) NOT NULL DEFAULT '',
  alias_code VARCHAR(32) DEFAULT NULL COMMENT '旧课程编码',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_alias (alias_name, alias_lecturer),
  KEY idx_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程别名/旧名/多 code';

-- ============================================
-- 学习资料 · 上传记录 (materials) - M10
-- 来源迁移: 069_materials.sql
-- 说明：资料本体在外部公开 GitHub 仓库；本表只存审计与元数据，
--       不存文件内容、不存 CDN 地址（CDN 地址运行时由 index.json + path 拼接）
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '上传者 users.id',
  course_id INT NOT NULL COMMENT 'courses.id',
  type VARCHAR(16) NOT NULL COMMENT 'notes/lecture/exam/answer/other',
  material_path VARCHAR(512) NOT NULL COMMENT '仓库内相对路径 c<id>/<type>/<file>',
  title VARCHAR(100) NOT NULL,
  description VARCHAR(300) DEFAULT NULL,
  lesson INT DEFAULT NULL COMMENT '第三层a：课时序号',
  lesson_title VARCHAR(64) DEFAULT NULL COMMENT '第三层a：课时标题',
  exam_node VARCHAR(16) DEFAULT NULL COMMENT '第三层b：midterm/final/quiz/assignment/monthly；NULL=整门课',
  source VARCHAR(16) DEFAULT NULL COMMENT '仅 exam：official/recalled',
  tags VARCHAR(255) DEFAULT NULL COMMENT '英文逗号分隔，≤5 个',
  semester VARCHAR(16) DEFAULT NULL COMMENT '仅展示，不参与课程身份',
  kind VARCHAR(16) NOT NULL COMMENT 'markdown/pdf/image/archive/document',
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_sha256 CHAR(64) NOT NULL,
  branch_name VARCHAR(255) DEFAULT NULL,
  pr_number INT DEFAULT NULL,
  pr_url VARCHAR(512) DEFAULT NULL,
  commit_sha CHAR(40) DEFAULT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending/merged/rejected/removed',
  reject_reason VARCHAR(255) DEFAULT NULL,
  download_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  KEY idx_user_created (user_id, created_at DESC),
  KEY idx_status_created (status, created_at DESC),
  KEY idx_course_type (course_id, type),
  KEY idx_sha (file_sha256),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料上传记录（资料本体在外部 GitHub 仓库）';

-- ============================================
-- 学习资料 · 收藏 (material_saves) - M10
-- 来源迁移: 069_materials.sql
-- ============================================
CREATE TABLE IF NOT EXISTS material_saves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  material_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_material (user_id, material_id),
  KEY idx_material (material_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料收藏';

-- ============================================
-- 学习资料 · 下载流水 (material_downloads) - M10
-- 来源迁移: 069_materials.sql
-- 说明：只插入不更新；materials.download_count 为冗余计数
-- ============================================
CREATE TABLE IF NOT EXISTS material_downloads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT '游客为 NULL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_material (material_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料下载流水';


-- description: Campus shop; integer MYR cents, persistent carts, immutable order snapshots.
-- depends: users
-- reversible: drop shop_addresses, shop_cart_items, shop_orders, shop_slots,
-- shop_products, shop_settings (only after exporting orders; destroys shop data).
CREATE TABLE IF NOT EXISTS shop_products (
 id INT AUTO_INCREMENT PRIMARY KEY,
 category VARCHAR(40) NOT NULL,
 name_zh VARCHAR(120) NOT NULL, name_en VARCHAR(120) NOT NULL,
 spec_zh VARCHAR(120) NOT NULL, spec_en VARCHAR(120) NOT NULL,
 description_zh TEXT NOT NULL, description_en TEXT NOT NULL,
 image_url VARCHAR(500) NOT NULL,
 price_cents INT UNSIGNED NOT NULL, stock INT UNSIGNED NOT NULL DEFAULT 0,
 sold_out TINYINT(1) NOT NULL DEFAULT 0,
 is_demo TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 INDEX idx_shop_category (category, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_slots (
 id INT AUTO_INCREMENT PRIMARY KEY,
 delivery_date DATE NOT NULL,
 schedule_id INT NULL,
 delivery_start TIME NULL,
 delivery_end TIME NULL,
 is_special TINYINT(1) NOT NULL DEFAULT 0,
 label_zh VARCHAR(120) NOT NULL, label_en VARCHAR(120) NOT NULL,
 cutoff_at DATETIME NOT NULL COMMENT 'Asia/Singapore wall clock',
 capacity INT UNSIGNED NOT NULL DEFAULT 100,
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 is_demo TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 INDEX idx_shop_date (delivery_date, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_settings (
 id INT PRIMARY KEY,
 delivery_notice_zh TEXT NOT NULL, delivery_notice_en TEXT NOT NULL,
 payment_zh TEXT NOT NULL, payment_en TEXT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_addresses (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE,
 contact_name VARCHAR(100) NOT NULL, contact VARCHAR(120) NOT NULL,
 building VARCHAR(40) NOT NULL, room VARCHAR(30) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_cart_items (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, product_id INT NOT NULL,
 quantity INT UNSIGNED NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 UNIQUE KEY uk_shop_cart (user_id, product_id),
 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (product_id) REFERENCES shop_products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_orders (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, slot_id INT NOT NULL,
 idempotency_key VARCHAR(80) NOT NULL, request_hash CHAR(64) NOT NULL,
 address_json JSON NOT NULL, items_json JSON NOT NULL, slot_json JSON NOT NULL,
 payment_json JSON NOT NULL,
 total_cents INT UNSIGNED NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_shop_request (user_id, idempotency_key),
 INDEX idx_shop_orders_slot (slot_id, status),
 INDEX idx_shop_orders_user (user_id, created_at),
 FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (slot_id) REFERENCES shop_slots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- description: Independent campus merchants and payment instructions.
CREATE TABLE IF NOT EXISTS shop_merchants (
 id INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(60) NOT NULL UNIQUE,
 name_zh VARCHAR(120) NOT NULL, name_en VARCHAR(120) NOT NULL,
 enabled TINYINT NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_merchant_members (
 merchant_id INT NOT NULL, user_id INT NOT NULL,
 PRIMARY KEY (merchant_id,user_id), FOREIGN KEY (merchant_id) REFERENCES shop_merchants(id), FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS shop_daily_schedules (
 id INT AUTO_INCREMENT PRIMARY KEY, merchant_id INT NOT NULL UNIQUE,
 label_zh VARCHAR(120) NOT NULL, label_en VARCHAR(120) NOT NULL,
 delivery_start TIME NOT NULL, delivery_end TIME NOT NULL,
 capacity INT UNSIGNED NOT NULL DEFAULT 100,
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (merchant_id) REFERENCES shop_merchants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD UNIQUE KEY uk_shop_schedule_date (schedule_id,delivery_date)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND INDEX_NAME='uk_shop_schedule_date');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD CONSTRAINT fk_shop_slot_schedule FOREIGN KEY (schedule_id) REFERENCES shop_daily_schedules(id) ON DELETE SET NULL', 'SELECT 1') FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='fk_shop_slot_schedule');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_products ADD COLUMN merchant_id INT NOT NULL DEFAULT 1', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_products' AND COLUMN_NAME='merchant_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_products ADD INDEX idx_shop_products_merchant (merchant_id)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_products' AND INDEX_NAME='idx_shop_products_merchant');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD COLUMN merchant_id INT NOT NULL DEFAULT 1', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND COLUMN_NAME='merchant_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_slots ADD INDEX idx_shop_slots_merchant (merchant_id)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_slots' AND INDEX_NAME='idx_shop_slots_merchant');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_orders ADD COLUMN merchant_id INT NOT NULL DEFAULT 1', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND COLUMN_NAME='merchant_id');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_orders ADD INDEX idx_shop_orders_merchant (merchant_id)', 'SELECT 1') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_orders' AND INDEX_NAME='idx_shop_orders_merchant');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_settings ADD COLUMN payment_methods JSON NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_settings' AND COLUMN_NAME='payment_methods');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
SET @shop_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE shop_settings ADD COLUMN delivery_zones JSON NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_settings' AND COLUMN_NAME='delivery_zones');
PREPARE shop_stmt FROM @shop_ddl; EXECUTE shop_stmt; DEALLOCATE PREPARE shop_stmt;
CREATE TABLE IF NOT EXISTS shop_payment_proofs (
 order_id INT PRIMARY KEY, content_type VARCHAR(30) NOT NULL, image LONGBLOB NOT NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES shop_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
