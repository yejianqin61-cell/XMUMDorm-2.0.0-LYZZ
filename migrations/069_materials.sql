-- migration: 069_materials.sql
-- description: 学习资料模块 —— 课程字典 + 上传记录 + 收藏 + 下载流水
-- depends: 001 (users 表必须存在)
-- reversible: DROP TABLE IF EXISTS material_downloads, material_saves, materials, course_aliases, courses;
--
-- 背景（见 docs/04-Module/M10-学习资料/Module10-学习资料设计.md）：
--   资料本体存放在**外部公开 GitHub 仓库**(James898-boom/Xmum-opensource)，
--   本库只保存「课程字典」与「上传审计」，不存文件内容、不存 CDN 地址。
--
-- 执行：
--   npm run migrate:materials         （本地）
--   线上见 docs/09-Deploy 的 Railway 迁移流程；执行后同步 init-db.sql

-- ============================================================
-- 课程字典：聚合单位 = 课程名 + 讲师
-- ============================================================
-- 设计要点：
--   · 课程身份 = (name, lecturer)，不是课程编码。course_code 可选、不唯一。
--   · lecturer 用**空串**哨兵而非 NULL —— MySQL 唯一约束对 NULL 不生效，
--     用 '' 才能保证「同名 + 都没填讲师」收束成一门课。
--   · is_pseudo=1 是「通用 / 其他」伪课程（id 固定为 1），承接选课攻略等
--     不属于任何课程的资料。
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

-- 固定伪课程：id=1，承接非课程资料
INSERT IGNORE INTO courses (id, name, lecturer, course_code, is_pseudo)
VALUES (1, '通用 / 其他', '', NULL, 1);

-- ============================================================
-- 课程别名：admin 合并时把旧名 / 别称 / 多 code 指向 canonical
-- ============================================================
CREATE TABLE IF NOT EXISTS course_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '指向 courses.id（canonical）',
  alias_name VARCHAR(180) NOT NULL COMMENT '被合并掉的旧名/别称',
  alias_lecturer VARCHAR(120) NOT NULL DEFAULT '',
  alias_code VARCHAR(32) DEFAULT NULL COMMENT '旧课程编码',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_alias (alias_name, alias_lecturer),
  KEY idx_course (course_id),
  CONSTRAINT fk_alias_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程别名/旧名/多 code';

-- ============================================================
-- 上传记录（上传审计的唯一真相源）
-- ============================================================
-- 注意：**不存文件内容、不存 CDN 地址**。
-- CDN 地址由 index.json 的 baseUrl + material_path 运行时拼接，
-- 避免 commit sha 变化导致 DB 里的地址过期。
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
  -- 软去重：不加全局 UNIQUE(sha)。
  -- 同一份公共讲义被两门课引用是合法场景（设计文档 §16.2 N1），
  -- 因此只做「同 sha 且同 (course, type, path)」的拒绝，由应用层判定。
  KEY idx_sha (file_sha256),
  CONSTRAINT fk_materials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_materials_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料上传记录（资料本体在外部 GitHub 仓库）';

-- ============================================================
-- 收藏（P1）
-- ============================================================
CREATE TABLE IF NOT EXISTS material_saves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  material_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_material (user_id, material_id),
  KEY idx_material (material_id),
  CONSTRAINT fk_msaves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msaves_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料收藏';

-- ============================================================
-- 下载流水（只插入，不更新；download_count 为冗余计数）
-- ============================================================
CREATE TABLE IF NOT EXISTS material_downloads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT '游客为 NULL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_material (material_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料下载流水';
