# XMUMDorm（厦马小筑 / Jack Dorm）

面向 XMUM（厦大马校）校园生活的一站式应用：社交、食堂、Campus Handbook（马校一站通）、课程评价、二手市场、课表、日记与通知/推送。

本仓库为 **monorepo**：
- **后端**：Node.js + Express（入口 `server.js`）
- **前端**：React + Vite（目录 `frontend/`）
- **数据库**：MySQL（`init-db.sql` + `migrations/` 增量迁移）

---

## 功能模块（当前实现）

- **TreeHole（树洞）**
  - 发帖/点赞/评论（含删除与管理员能力）
  - 图片上传：对象存储优先、本地 `/uploads` 回退
  - PWA 体验与性能优化（缩略图等）

- **Canteen（食堂）**
  - 分区/店铺/分类/菜品
  - 菜品点评、收藏、热门、排行榜
  - 商家端管理（店铺/菜品）

- **Campus Handbook（马校一站通）**
  - 文章：列表/详情、作者头像与昵称、评论/回复、收藏/点赞
  - 课程评价：匿名展示、学期（yy/mm）、可编辑/删除、评论匿名

- **Second-hand Marketplace（二手市场）**
  - 分类 Tabs、筛选、列表/详情、发布（最多 4 图）、收藏
  - 卖家/管理员：改状态（待售/已售出）、删除
  - 说明：`reserved` 已移除

- **Schedule（课表）**：导入/查询/周视图
- **Diary（日记）**：「往年今日」
- **Notifications / Web Push**：信箱、公告、课前提醒等

---

## 技术栈与项目约定

### 前端
- React + React Router + Vite
- TanStack Query（请求缓存、失效刷新、乐观更新）
- UI：手写 CSS 为主，部分页面使用 Tailwind 风格类
- PWA：`frontend/public/sw.js`
  - 若前端更新后客户端仍“行为不一致”，通常是 SW 缓存导致，需 bump `CACHE_NAME`

### 后端
- Express 路由按模块拆分在 `routes/`
- JWT 鉴权：`middleware/auth.js`（`authenticateToken`）
- DB 访问：`database.js`（`query()`）
- 安全：`helmet`、`express-rate-limit`、`sanitize-html`

### 资源与存储
- MySQL：业务表 + 统计计数
- 对象存储（S3 兼容，如 R2）：`services/objectStorage.js`
- 静态资源 URL：`utils/assets.js` 的 `assetUrl()`（依赖 `PUBLIC_ASSET_BASE_URL`）

---

## 目录结构（按职责）

```bash
XMUMDORM/
├── server.js                 # 后端入口（Express）
├── database.js               # MySQL pool + query()
├── routes/                   # API 路由（/api/*）
│   ├── auth.js
│   ├── posts.js
│   ├── canteen.js
│   ├── handbook.js
│   ├── marketplace.js
│   ├── users.js
│   ├── schedule.js
│   ├── diary.js
│   ├── notifications.js
│   └── push.js
├── middleware/               # JWT 鉴权 / 上传
├── services/                 # 对象存储、统计、审计、Push 等服务
├── utils/                    # assetUrl、cache、时间等工具
├── init-db.sql               # 全新库：基础建表
├── migrations/               # 增量迁移（按编号顺序）
├── scripts/                  # 迁移执行器 & 运维脚本（node scripts/*.js）
├── frontend/                 # React 前端（Vite）
└── docs/                     # 设计/笔记/说明
```

---

## 数据库迁移（团队约定）

- **任何 schema 变更必须走迁移**：在 `migrations/` 新增 `0xx_*.sql`
- **为迁移提供可重复执行的 runner**：在 `scripts/` 新增 `run-migration-0xx-*.js`
- **执行入口统一在 `scripts/`**（根目录不再放兼容 shim）

常用命令（示例）：
- 一键基础迁移：`npm run migrate:all`
- 单条迁移：`node scripts/run-migration-023-course-reviews-term.js`
- 二手市场：`node scripts/run-migration-026-marketplace.js`
- Marketplace 状态清理：`node scripts/run-migration-027-marketplace-remove-reserved.js`

---

## 配置项（仅列关键项）

- **Server**
  - `PORT`
  - `NODE_ENV`
  - `JWT_SECRET`
- **MySQL**
  - `DATABASE_URL`（推荐）或 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
- **Static/Object Storage**
  - `PUBLIC_ASSET_BASE_URL`
  - `OBJECT_STORAGE_*`（endpoint/bucket/keys/region 等）
- **Jobs**
  - `ENABLE_BACKGROUND_JOBS`

说明：`.env` 与 `.env*.example` 均应视为环境文件，不提交到 Git（见 `.gitignore`）。

