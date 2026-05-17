# Square · 新生手册（Handbook）开发评估与方案（Frontend/Backend/DB）

> 目标：在「广场 Square」内落地一个可扩展的“新生手册”内容系统，支持栏目 Tabs、文章列表/详情、互动（浏览/点赞/收藏/分享）、评论、收藏夹与 Checklist，以及一个“课程测评”特殊结构模块。

---

## 0. 当前项目现状（对接点）

- **前端**：React + React Router + TanStack Query（React Query）已在树洞/食堂等模块大量使用；`/about/freshman-guide` 当前为占位页（`SquareFreshmanGuide.jsx`）。
- **后端**：Express + MySQL（`jack_campus`），已有鉴权、发帖/点赞/评论、对象存储上传、简单缓存 `simpleCache`、限流等能力。
- **可复用能力**
  - **用户体系**：`users`（student/merchant/admin）
  - **互动体系参考**：`post_likes`、`comments`、`notifications` 的建模方式
  - **对象存储**：`services/objectStorage.js`（适合存文章封面/插图）

> 结论：你现在具备把 Handbook 做成“内容型子系统”的基础设施；建议 **Handbook 独立表/独立 API 前缀**，避免与 posts/canteen 强耦合。

---

## 1. 需求结构映射（从 ASCII 到可实现模块）

你给的结构：

- Tabs：All / FreshmanGuide / CourseReview / LifeTips / AvoidPit / FAQ
- ArticleList → ArticleCard（id/title/cover/summary/tags/author/stats）
- ArticleDetail（富文本 content + images + tags + authorInfo + sourceLink + actions + comments）
- Collections：SavedArticles / Checklist
- CourseReview：courseName/teacher/rating/difficulty/comments[]

建议映射为 3 大域：

- **内容域（Content）**：Tabs、Article、Tag、Source（公众号来源）
- **互动域（Engagement）**：views/likes/saves/shares、评论
- **个人域（Collections）**：收藏文章、Checklist
- **课程测评域（CourseReview）**：可视为一种“内容类型”或独立实体（推荐独立实体，便于聚合评分）

---

## 2. 前端评估与推荐架构

### 2.1 路由规划（建议）

保持 Square 的信息架构清晰，建议这样拆：

- `/about/freshman-guide`：入口（Tabs + 列表）
- `/about/freshman-guide/a/:id`：文章详情
- `/about/freshman-guide/collections`：收藏/清单入口（可选）
- `/about/freshman-guide/checklist`：Checklist（可选）
- `/about/freshman-guide/course-review`：课程测评列表（可选）
- `/about/freshman-guide/course-review/:id`：课程测评详情（可选）

> 备注：你当前 TabBar 的“选中逻辑”按 `/about` 归属广场，这与 Handbook 处于 Square 内一致。

### 2.2 页面组件拆分（与 ASCII 对齐）

- `HandbookPage`（容器）
  - `HandbookTabs`（可横滑；Tab 状态与 URL query 同步：`?tab=faq`）
  - `ArticleList`
    - `ArticleCard`
- `ArticleDetailPage`
  - `ArticleHeader`（封面/标题/作者/来源）
  - `RichContentRenderer`（富文本渲染）
  - `ArticleActions`（like/save/share）
  - `CommentList`（复用你现有 Comment UI 风格）

### 2.3 数据获取（React Query）

推荐 queryKey 设计（示例）：

- `['handbook','tabs']`
- `['handbook','articles',{ tab, q, page, pageSize, sort }]`
- `['handbook','article',id]`
- `['handbook','article',id,'comments',{ page }]`
- `['handbook','me','saved',{ page }]`
- `['handbook','me','checklist']`

推荐策略：

- 列表用 `useInfiniteQuery`（对标 TreeHole），并用 `placeholderData: (p)=>p` 减少白块闪。
- 详情页：`staleTime` 30~60s；互动操作采用 **乐观更新**（你现在 PostDetail 已经有 like 的乐观写法，可复用范式）。

### 2.4 富文本方案（关键决策）

本项目 **确定采用 Markdown**（内容生产者为 admin），同时补齐你要的两项体验能力：

- **大纲/目录（可点各级标题快速跳转）**
  - 渲染时解析 `#`/`##`/`###`… 生成 TOC
  - 为每个 heading 生成稳定锚点（slug），点击目录滚动到对应位置
  - 可选：滚动时高亮当前章节（IntersectionObserver）
- **文中插图且不限量**
  - Markdown 使用标准图片语法：`![](https://...)` 或 `![](/uploads/...)`
  - 由后端提供图片上传接口，返回 URL；编辑器侧一键插入到光标位置

安全要求：**禁止 raw HTML**（防 XSS），渲染链路必须只允许 Markdown 白名单能力。

### 2.4.1 Markdown 编辑器与渲染（建议实现）

- **编辑器**：一期用 `<textarea>` + “上传图片”按钮（上传后插入 `![](...)`），即可满足不限量插图
- **渲染器**：Markdown → React（建议用 `react-markdown` + `remark-gfm`），并禁用 HTML
- **大纲**：用 `remark` AST 遍历 headings 生成目录；渲染时给 heading 注入 `id`

### 2.5 资源与图片

- 封面 cover：对象存储 key：`handbook/covers/article_<id>.webp`
- 内容图片：`handbook/images/article_<id>_<n>.<ext>`
- 前端：统一走 `assetUrl()` 拼接（与 posts/canteen 一致）

---

## 3. 后端 API 评估与推荐设计

### 3.1 API 前缀

建议新增：`/api/handbook/*`

### 3.2 公开接口（读）

- `GET /api/handbook/tabs`
  - 返回 tabs（含排序、slug、双语名）
- `GET /api/handbook/articles?tab=&q=&page=&pageSize=&sort=`
  - sort：`new` | `hot`（hot = views/likes/saves 的加权）
  - 返回：`{ list, hasMore, page, pageSize }`
- `GET /api/handbook/articles/:id`
  - 返回详情（含作者、tags、sourceLink、stats、是否已 like/save）
- `GET /api/handbook/articles/:id/comments?page=&pageSize=`

### 3.3 互动接口（写）

需要登录：

- `POST /api/handbook/articles/:id/like`（toggle）
- `POST /api/handbook/articles/:id/save`（toggle）
- `POST /api/handbook/articles/:id/share`（可选：仅计数）
- `POST /api/handbook/articles/:id/comments`（发评论/回复）
- `DELETE /api/handbook/articles/:id/comments/:commentId`（本人或 admin）

### 3.4 管理接口（写：内容生产）

建议 **仅 admin**：

- `POST /api/handbook/articles`（创建）
- `PATCH /api/handbook/articles/:id`（更新）
- `DELETE /api/handbook/articles/:id`（逻辑删除/下架）
- `POST /api/handbook/upload`（上传封面/内容图片；复用 multer + objectStorage）

> 如果你想让「官方号/社团号」也能投稿：可以扩展角色或加 `handbook_roles` 权限表，但建议二期再做。

### 3.5 缓存与性能建议

列表与详情是高频读：

- `GET /tabs`：TTL 10~60min
- `GET /articles`：按 query 参数缓存（tab+sort+page），TTL 10~30s（与你现在的 `simpleCache` 风格一致）
- `GET /articles/:id`：TTL 10~30s

计数写入（views）：

- views 建议 **异步/缓冲写**（避免每次打开详情都 hit DB）
  - 方案 A：前端进入详情后 `POST /views`，后端用进程内 Map 聚合每 30~60s flush
  - 方案 B：直接 DB `UPDATE views = views + 1`（实现最快，但并发大时压库）

项目现状用户量不大：一期可用方案 B，上量再切 A。

---

## 4. 数据库设计评估与建议（MySQL）

> 目标：结构清晰、可扩展、可索引；互动统计可快速聚合；个人收藏与评论可分页。

### 4.1 Tabs（栏目）

`handbook_tabs`

- `id` PK
- `slug`（all/freshman-guide/life-tips/avoid-pit/faq/course-review）
- `name_zh`, `name_en`
- `sort_order`
- `is_enabled`

### 4.2 文章主表

`handbook_articles`

- `id` PK
- `tab_id` FK -> handbook_tabs.id（或直接存 tab_slug）
- `title`
- `summary`（列表摘要）
- `cover_path`（对象存储 key）
- `content_format` ENUM('md','tiptap_json','html')（建议至少 md/json 二选一）
- `content` LONGTEXT（md 或 json 字符串）
- `source_name`（公众号名，可空）
- `source_link`（原文链接，可空）
- `author_user_id`（nullable：如果是 admin 也对应 users.id）
- `status` ENUM('draft','published','hidden')（或 `deleted_at` + `is_published`）
- `published_at`
- `created_at`, `updated_at`
- `deleted_at`（逻辑删除/下架）

索引建议：

- `(tab_id, published_at DESC, id DESC)`
- `(deleted_at)`
- `(status)`

### 4.3 Tags（文章标签）

本项目 **确定新建 Handbook 专用 tags**，避免与树洞话题体系互相污染。

表：`handbook_tags`

- `id` PK
- `slug`（唯一，便于 URL/筛选）
- `name_zh`, `name_en`
- `sort_order`
- `is_enabled`
- `created_at`

表：`handbook_article_tag_map`

- `article_id`
- `tag_id`
- PK(article_id, tag_id)
- idx(tag_id)

### 4.4 互动：点赞/收藏/分享/浏览

推荐“明细表 + 汇总字段”组合（读快、写可控）：

明细：

- `handbook_article_likes`：PK(user_id, article_id)
- `handbook_article_saves`：PK(user_id, article_id)

汇总（放在 `handbook_articles`）：

- `views_count` INT
- `likes_count` INT
- `saves_count` INT
- `shares_count` INT

写入策略：

- 点赞/收藏：写明细表 + 同步更新汇总字段（或查询时聚合，二期再做）
- 浏览/分享：直接 `UPDATE handbook_articles SET views_count = views_count + 1`

### 4.5 评论

`handbook_comments`

- `id` PK
- `article_id` FK
- `user_id` FK
- `parent_id`（二级回复）
- `content`
- `deleted_at`
- `created_at`, `updated_at`

索引：

- `(article_id, created_at ASC)`
- `(parent_id)`
- `(user_id)`

### 4.6 Collections：Checklist

`handbook_checklists`

- `id` PK
- `user_id` FK
- `title`
- `created_at`, `updated_at`

`handbook_checklist_items`

- `id` PK
- `checklist_id` FK
- `content`
- `is_done` TINYINT
- `sort_order`
- `created_at`, `updated_at`

> Checklist 是强个人属性，建议以 user_id 隔离；也可加“官方默认清单模板”（二期：`template_id`）。

### 4.7 CourseReview（特殊结构）

建议独立表（便于聚合评分、按课程/老师筛选）：

`course_reviews`

- `id` PK
- `course_name`
- `teacher`
- `rating` DECIMAL(2,1) 或 TINYINT（1~5）
- `difficulty` TINYINT（1~5）
- `created_at`, `updated_at`

`course_review_comments`

- `id` PK
- `review_id` FK
- `user_id` FK
- `content`
- `created_at`, `deleted_at`

若想做“同课程多条测评聚合”：把 `course_reviews` 拆成 `courses` + `course_ratings` 明细更合理；但一期可先简单实现，后续迁移。

---

## 5. 安全、权限与内容治理

- **写操作**：评论/点赞/收藏需要登录（复用 `authenticateToken`）
- **内容发布**：建议仅 admin（或未来扩展白名单作者）
- **防刷**：复用全局 `express-rate-limit`；对 like/save/comment 增加更细粒度限制（例如 60 次/分钟）
- **XSS**：富文本必须做白名单清洗
  - Markdown：渲染时用安全渲染器（禁 raw HTML）
  - JSON 富文本：服务端输出到前端渲染时控制节点类型；若转 HTML 必须 sanitize
- **外链 sourceLink**：前端打开外链提示“将离开应用”（避免钓鱼）

---

## 6. 里程碑（推荐按 3 期交付）

### Phase 1（可上线 MVP，1~3 天）

- Tabs + ArticleList + ArticleDetail（Markdown 内容）
- views_count（简单自增）
- like/save（明细表 + 汇总字段）
- 基础评论（一级/二级）
- 收藏夹页（SavedArticles）

### Phase 2（体验升级，3~7 天）

- Markdown：目录/大纲（TOC）体验完善（滚动高亮、快速跳转）
- 列表搜索（q）、排序（new/hot）
- 图片上传（封面/插图，文中不限量）+ 自动压缩 webp（静态图）
- 缓存：tabs/list/detail 短 TTL

### Phase 3（内容生态，持续）

- CourseReview 独立模块（聚合评分/排行/筛选）
- Checklist 模板（官方版本 + 个人复制）
- 审核流（draft/published/hidden）
- 运营数据面板（阅读/收藏趋势）

---

## 7. 与现有系统的潜在冲突点（提前规避）

- **路径归属**：Handbook 在 `/about/*` 下属于“广场 Tab”，符合你现有 Tab 逻辑；不要把它放到 `/myzone/*`，否则会像你之前“课程表/日记 Tab 误高亮”那样出问题。
- **tags 隔离**：Handbook 使用独立的 `handbook_tags`，避免与树洞话题混用造成运营与筛选混乱。
- **富文本安全**：不要直接存/回传用户提交的 HTML。

---

## 8. 下一步我建议你先定的 3 个“不可拖延决策”

> 你已做出决定（已固化到本文档）：

1) **富文本存储格式**：Markdown（带目录/大纲 + 文中不限量插图）
2) **内容生产者**：仅 admin
3) **CourseReview 的边界**：独立实体

---

## 9. 附：建议的建表 SQL（草案）

> 这是草案，用于开工前讨论字段与索引；最终建议放到 `migrations/xxx_handbook.sql`。

```sql
-- tabs
CREATE TABLE IF NOT EXISTS handbook_tabs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name_zh VARCHAR(80) NOT NULL,
  name_en VARCHAR(80) NOT NULL,
  sort_order TINYINT DEFAULT 0,
  is_enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- articles
CREATE TABLE IF NOT EXISTS handbook_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tab_id INT NOT NULL,
  author_user_id INT NULL,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(400) NULL,
  cover_path VARCHAR(500) NULL,
  content_format ENUM('md') DEFAULT 'md',
  content LONGTEXT NOT NULL,
  source_name VARCHAR(120) NULL,
  source_link VARCHAR(600) NULL,
  status ENUM('draft','published','hidden') DEFAULT 'published',
  published_at TIMESTAMP NULL DEFAULT NULL,
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  saves_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tab_pub (tab_id, published_at, id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  FOREIGN KEY (tab_id) REFERENCES handbook_tabs(id) ON DELETE RESTRICT,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- handbook tags (isolated from posts tags)
CREATE TABLE IF NOT EXISTS handbook_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  sort_order TINYINT DEFAULT 0,
  is_enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enabled_sort (is_enabled, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS handbook_article_tag_map (
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, tag_id),
  INDEX idx_tag_id (tag_id),
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES handbook_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- likes
CREATE TABLE IF NOT EXISTS handbook_article_likes (
  user_id INT NOT NULL,
  article_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, article_id),
  INDEX idx_article_id (article_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- saves
CREATE TABLE IF NOT EXISTS handbook_article_saves (
  user_id INT NOT NULL,
  article_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, article_id),
  INDEX idx_article_id (article_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- comments
CREATE TABLE IF NOT EXISTS handbook_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_article_time (article_id, created_at),
  INDEX idx_parent_id (parent_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (article_id) REFERENCES handbook_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES handbook_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

