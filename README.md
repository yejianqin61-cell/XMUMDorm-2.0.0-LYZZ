# Jack 校园社交网站 2.0.0（Jack Dorm）

一个为 **XMUM 学生** 定制的校园社交 & 生活服务网站，包含：

- 树洞广场（发帖、点赞、评论）
- 食堂系统（按分区找店铺、看菜单、点评菜品、收藏、排行榜）
- 课程表导入与查看
- 「往年今日」日记本

前后端都在本仓库中维护，后端为 Node.js + Express，前端为 React（Vite，位于 `frontend/`）。

---

## 项目结构（概览）

```bash
Jack/
├── server.js               # 后端入口
├── routes/                 # 后端路由
│   ├── auth.js             # 登录 / 注册
│   ├── posts.js            # 树洞帖子
│   ├── canteen.js          # 食堂与排行榜
│   ├── schedule.js         # 课程表导入 / 查询
│   ├── users.js            # 用户中心
│   ├── notifications.js    # 通知
│   └── diary.js            # 日记本「往年今日」
├── middleware/             # 中间件
│   ├── auth.js             # JWT 鉴权
│   └── upload.js           # 图片上传（帖子/商品/评论/头像）
├── services/               # 服务层
│   ├── objectStorage.js    # 对象存储（如 R2）
│   ├── rankingStats.js     # 食堂综合评分统计
│   └── auditLog.js         # 审计日志
├── utils/                  # 工具
│   ├── assets.js           # 生成图片 URL（PUBLIC_ASSET_BASE_URL / 本地 /uploads）
│   └── scheduleParser.js   # 课程表解析
├── migrations/             # 数据库迁移脚本（增量）
│   ├── 001_posts_system_2.0.0.sql
│   ├── 002_canteen_system.sql
│   ├── 003_ranking_system.sql
│   ├── 004_product_price.sql
│   ├── 005_shops_logo_opening_hours.sql
│   ├── 006_audit_logs.sql
│   ├── 007_product_favorites.sql
│   ├── 008_email_verification_codes.sql
│   ├── 009_timetable_import.sql
│   └── 010_diaries.sql     # 日记本表
├── scripts/                # 辅助脚本
│   ├── migrate_009_timetable_import.js
│   ├── migrate_010_diaries.js
│   ├── migrate_011_post_tags.js
│   ├── migrate_init_and_009.js
│   ├── bulk-import-products.js
│   ├── add-categories.js
│   └── createAdmin.js
├── init-db.sql             # 初始建库 & 基础表（users/posts/...）
├── frontend/               # React 前端（Vite）
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── pages/          # TreeHole / Canteen / Schedule / Diary 等
│       ├── components/     # UI 组件
│       ├── api/            # 前端 API 封装
│       └── context/        # 全局状态（Auth / Toast / Language）
└── README.md
```

早期的 `html/` 目录（纯 HTML 登录/注册）仍保留，但实际使用的是 `frontend/` React 前端。

---

## 技术栈

- **前端**：React + Vite + React Router，CSS 手写（微信小程序风格 UI）
- **后端**：Node.js + Express
- **数据库**：MySQL
- **认证**：JWT（JSON Web Token）
- **安全**：
  - `helmet`（HTTP 头安全）
  - `express-rate-limit`（全局 & 登录限流）
  - `sanitize-html`（帖子/评论内容 XSS 防护）
- **存储**：
  - MySQL 表（帖子、图片、食堂、点评、收藏、课程表、日记、通知等）
  - 可选对象存储（Cloudflare R2 / 兼容 S3）

---

## 环境准备

### 1. 安装 Node.js 与依赖

推荐 Node.js 18+。安装后确认：

```bash
node --version
npm --version
```

在项目根目录安装后端依赖：

```bash
npm install
```

若需要本地开发前端，再安装前端依赖：

```bash
cd frontend
npm install
```

### 2. 配置 MySQL & 执行迁移

1. 启动 MySQL，确保账号密码正确。
2. 在项目根目录执行初始建库脚本（会创建 `jack_campus` 数据库和基础表）：

```bash
mysql -u root -p < init-db.sql
```

或用脚本一键执行 `init-db.sql + 009_timetable_import.sql`（课程表表）：

```bash
node scripts/migrate_init_and_009.js
```

3. 日记本表迁移（010）：

```bash
node scripts/migrate_010_diaries.js
```

> 所有脚本复用 `.env` 中的数据库配置（`DATABASE_URL` 或 `DB_HOST/DB_USER/...`）。

### 3. 配置环境变量（`.env`）

在项目根目录创建 `.env`，**至少**包含：

```env
PORT=4040
NODE_ENV=development
JWT_SECRET=请替换为随机字符串

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=jack_campus
```

可选对象存储 / 静态资源配置（参考 `.env.example`）：

```env
PUBLIC_ASSET_BASE_URL=https://你的对象存储公开域名
OBJECT_STORAGE_ENDPOINT=...
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=...
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

若不配置对象存储，帖子/商品图片会自动回退写入本地 `uploads/` 目录，通过 `/uploads/...` 访问。

---

## 启动项目

### 1. 启动后端

在项目根目录：

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器启动后，访问：

```bash
curl http://127.0.0.1:4040/
```

应返回类似：

```json
{
  "message": "Jack 校园社交网站后端服务运行正常！",
  "version": "1.0.0"
}
```

### 2. 启动前端（React）

在 `frontend/`：

```bash
cd frontend
npm run dev
```

默认地址为 `http://127.0.0.1:5173`，Vite 已配置代理到本地后端（统一使用 `/api` 前缀）。

---

## 主要功能模块

### 1. 认证 / 用户系统

路由：`/api/auth`、`/api/users`

- 注册：
  - 学生：学号 + XMUM 邮箱 + 验证码
  - 商家：邀请码 `yejianqinnb` + 用户名 / 密码
- 登录：
  - 支持用户名 / 邮箱 / 学号
- 密码：
  - `bcryptjs` 加密存储
- JWT：
  - 登录后返回 token，前端写入 `localStorage`，所有登录态接口自动带 `Authorization`。

### 2. 树洞广场（帖子系统 2.0.0）

路由：`/api/posts`，前端页面：`TreeHole`、`PostDetail`、`PostNew` 等。

- 发帖：
  - 纯文本 + 最多 3 张图片（jpg/png/webp，单张 ≤ 8MB）
  - 图片支持对象存储 + 本地回退
- 列表 / 详情：
  - 作者信息、时间、图片、点赞数、评论数
  - 管理员可发公告、隐藏帖子
- 点赞 / 评论：
  - 一键点赞/取消点赞
  - 一级 & 二级评论，支持删除
- 通知：
  - 点赞 / 评论 / 公告会给相关用户写入 `notifications` 表，在前端「信箱」展示。

### 3. 食堂系统

路由：`/api/canteen`，前端：`/eat` 相关页面。

- 区域与店铺：
  - D6 / LY3 / B1 / BELL / Other 分区
  - 店铺创建、编辑（logo、营业时间）、按区域查看
- 菜品管理（商家端）：
  - 绑定店铺 -> 分类 -> 商品
  - 每个商品最多 5 张图，支持价格字段
- 菜品浏览与点评（学生端）：
  - 按店铺查看菜单
  - 菜品详情 + 评级（「夯爆了 / 顶级 / 人上人 / NPC / 拉完了」）
  - 图片买家秀、商家回复
- 收藏：
  - 收藏/取消收藏菜品，个人中心「我的收藏」查看
- 排行榜：
  - 最夯单品榜、门庭若市商家榜、最夯商家榜、爆款新品榜、点评达人榜
- 本店热门：
  - 店铺详情页顶部「本店热门 · Top dishes」跳转到本店热门页
  - 热门页显示本店综合评分最高前若干菜品，支持点击进入菜品详情

### 4. 课程表导入与查看

路由：`/api/schedule`，前端：`/about/schedule`。

- 从学校选课系统复制整表文本，一键粘贴导入。
- 后端解析文本到：
  - `timetable_courses`（课程）
  - `timetable_meetings`（上课时间/地点/周次）
- 前端：
  - 「课表」Tab：以周视图展示固定课表，按周/按天分组、支持刷新
  - 「导入」Tab：文本框 + 预览 + 确认导入，显示解析统计和错误提示。

### 5. 日记本：「往年今日」

路由：`/api/diary`，前端：`/about/diary`。

- 数据表：`diaries (user_id, date, content)`，**一天一篇**。
- 接口：
  - `GET /api/diary/day?date=YYYY-MM-DD`：获取某天日记（默认今天）
  - `POST /api/diary/day`：保存/更新某天日记
  - `GET /api/diary/overview?date=&recentDays=`：返回：
    - `today`：今日日期与 label（如 `2026.3.16`）
    - `sameDayPastYears`：往年今日的日期列表
    - `recentDays`：最近 N 天，每天是否有日记
- 前端 UI：
  - 顶部左：今日日期（`2026.3.16`）
  - 顶部右：按钮「记录今日 / 编辑今日」
  - 右侧：竖直侧边栏
    - 顶部「往年今日」：显示往年同月同日的条目
    - 下方「最近日记」：最近若干天，可滚动查看更多
  - 中间大区域：白色半透明的日记编辑卡片，支持长篇记录。

---

## 常用脚本与命令

在项目根目录：

- 安装依赖：`npm install`
- 启动后端开发：`npm run dev`
- 启动后端生产：`npm start`
- 初始化数据库 + 课程表表：`node scripts/migrate_init_and_009.js`
- 单独执行课程表迁移：`node scripts/migrate_009_timetable_import.js`
- 创建日记本表：`node scripts/migrate_010_diaries.js`
- 帖子标签/话题表：`node scripts/migrate_011_post_tags.js`
- 食堂商品批量导入示例：`npm run import-products`

前端（在 `frontend/`）：

- 安装依赖：`npm install`
- 启动前端：`npm run dev`

---

## 部署注意事项

1. **环境变量**：生产环境必须配置：
   - `DATABASE_URL` 或 `DB_*`（指向生产库）
   - 强随机的 `JWT_SECRET`
   - （可选）`PUBLIC_ASSET_BASE_URL` + 对象存储相关变量
2. **数据库迁移**：务必在生产库上执行所有 SQL 迁移脚本（或用脚本连接生产库执行）。
3. **静态资源**：`uploads/` 和 `public/` 目录需持久化或挂载卷（若用 Docker / 云平台）。

---

## 开发建议

- 新功能步骤建议：
  1. 在 `migrations/` 中设计/执行表结构变更；
  2. 在 `routes/` 中增加对应 API；
  3. 在 `frontend/src/api/` 中封装前端调用；
  4. 最后在 `frontend/src/pages/` + `components/` 中接入 UI。
- 如果你要扩展本项目（例如增加更多校园工具），可以在 `about` 区域继续挂入口，保持页面简洁统一。

