# Dorm 3.0 现阶段缺陷修复开发计划

**依据文档：** `docs/01-项目评估/Dorm3.0—现阶段缺陷.md`

**项目：** Dorm · XMUMDorm-2.0.0-LYZZ
**编写目的：** 将现阶段缺陷拆解为可执行的前后端任务，明确优先级与依赖关系。
**核心定位：** 修复 + 补全，非重构。优先解决功能缺失和逻辑缺陷。

---

## 0. 现状纵览（开发前必读）

### 0.1 已有能力（可复用）

| 能力 | 前端 | 后端 | 说明 |
|------|------|------|------|
| 树洞 Tag 栏 | `TreeHoleToolbar.jsx` | `routes/posts.js` `/api/posts/tags` | 展示前 10 个 tag，可点击筛选；**无**添加/移除 tag 功能 |
| 树洞帖子详情 | `PostDetail.jsx` | `routes/posts.js` | 完整的帖子详情 + 评论 + 点赞系统 |
| 食堂菜品缩略图 | `productImageUrl()` in `config.js` | `ensureProductDefaultImage()` in `routes/canteen.js` | 仅回退到默认占位图，**无**点评图片回退逻辑 |
| 食堂吃货广场 | `CanteenFoodSquare.jsx` | `GET /api/canteen/food-articles` | 已展示 cover image，使用原始图（非缩略图） |
| 广场首页 | `SquareHome.jsx` | `routes/square.js` | 热搜榜 + 轮播 + 四宫格 + 校园此刻 |
| 广场热搜 | `SquareTrendingList/Detail/PostNew` | `routes/square.js` `/api/square/trending/*` | 列表/详情/发帖已实现；**无**图片支持、**无**评论点赞 |
| 广场校园此刻 | `SquareCampusPostNew.jsx`（仅发帖页） | `routes/square.js` `/api/square/campus-*` | 发帖页有文本输入+身份选择；**无**图片支持、**无**详情页路由 |
| 我的页面 | `MyZone.jsx` | `routes/users.js` | 待办事项为占位按钮（Toast "待开发"） |

### 0.2 缺陷与缺口总览

| 模块 | 缺陷 | 优先级 |
|------|------|--------|
| 树洞 | Tag 栏缺少延伸按钮，无法自定义展示哪些 tag | **高** |
| 树洞 | 新增 20+ 个 tag（双语）需要种子数据 | **高** |
| 食堂 | 菜品缩略图逻辑缺陷：未回退到点评首图 | **高** |
| 食堂 | 吃货广场帖子卡瀑布流缺少图片展示 | **中** |
| 广场 | 热搜榜需放在轮播图下方 | **高** |
| 广场 | 校园此刻缺少发帖按钮 | **高** |
| 广场 | 校园此刻发帖页缺少图片/GIF 上传、换行支持 | **高** |
| 广场 | 校园此刻帖子流排版 UI 需优化 | **中** |
| 广场 | 热搜词条帖子流缺少图片展示 | **高** |
| 广场 | 热搜词条发布页缺少图片/GIF 上传、换行支持 | **高** |
| 广场 | 热搜词条帖子详情页（复用树洞 UI，含评论/点赞） | **高** |
| 我的 | 待办事项全量开发（数据库 + API + 前端） | **高** |
| 我的 | 我的页面加入今日待办缩略卡片 | **高** |

---

## 1. 模块 A：树洞 Tag 管理系统

### 1.1 需求描述

- Tag 栏最右侧增加一个"延伸"按钮（如 `+` 或 `···`）
- 点击弹出下拉面板，展示全部 tag 列表
- 已加入 Tag 栏的 tag 和未加入的 tag 视觉上分开（如分区 + 标题）
- 点击 tag 可切换：已在栏中 → 移除；不在栏中 → 添加
- 新增 tag（双语）：CSGO、PUBG、Valorant、王者荣耀、DeltaForce、LOL英雄联盟、Minecraft我的世界、Genshin原神、Basketball、Running、Swimming、Fitness、NBA、Soccer、梗图Memes、Tennis、TableTennis、Badminton、逛街Shopping、Movies、Music、KPOP、Dating恋爱、Nightlife夜生活

### 1.2 后端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| A-A1 | `migrations/047_treehole_tag_visibility.sql` | 新建 `tag_visibility` 表：`user_id` + `tag_id` + `visible` TINYINT，UNIQUE(user_id, tag_id) | — |
| A-A2 | `GET /api/posts/tags/visible` | 返回当前用户的可见 tag 列表（已启用 + 未启用分开） | A-A1 |
| A-A3 | `PATCH /api/posts/tags/:tagId/visible` | body: `{ visible: 0|1 }`；设置某 tag 对当前用户的可见性 | A-A1 |
| A-A4 | `migrations/048_seed_new_tags.sql` | 种子数据：新增 20+ 个双语 tag | — |
| A-A5 | 注册至 `scripts/run-incremental-migrations.js` | 本地/线上可执行 | A-A1, A-A4 |

### 1.3 前端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| A-F1 | `TreeHoleToolbar.jsx` — 增加延伸按钮 | Tag 栏右侧 `+` 按钮，点击展开下拉面板 | A-A2 |
| A-F2 | 下拉面板 UI（`TreeHoleTagPanel.jsx`） | 全部 tag 列表，分区展示（已加入 / 更多标签），点击切换可见性 | A-A2, A-A3 |
| A-F3 | API 封装 `api/tags.js` | `getVisibleTags()` / `setTagVisibility(tagId, visible)` | A-A2, A-A3 |
| A-F4 | 面板外点击关闭、动画过渡 | Framer Motion 下拉面板交互 | A-F2 |

### 1.4 交互细节

```
Tag 栏（横向滚动）:  [热门] [食堂] [社团] ... [公告] [+]  ← 延伸按钮
                                                         ↓
                                                    ┌──────────┐
                                                    │ 已加入标签  │
                                                    │ 食堂  ✕   │
                                                    │ 社团  ✕   │
                                                    │──────────│
                                                    │ 更多标签    │
                                                    │ CSGO  ＋  │
                                                    │ PUBG  ＋  │
                                                    │ ...      │
                                                    └──────────┘
```

---

## 2. 模块 B：食堂菜品缩略图逻辑修复

### 2.1 需求描述

菜品缩略图优先级：
1. 商家上传的图片（已有）
2. 如果商家没有上传 → 使用该菜品的第一条点评的第一张图片
3. 如果也没有点评图片 → 使用默认占位图

**影响范围（必须检查）：**
- 商家详情页（`FoodList.jsx` → `FoodCard.jsx`）
- 菜品详情页（`FoodDetail.jsx` → `FoodDetailView.jsx`）
- 各排行榜（`Rankings.jsx`、`CanteenHomeRankings.jsx`、`AreaProductRanking.jsx`、`CanteenPickMeal.jsx`）

### 2.2 后端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| B-B1 | 修改 `ensureProductDefaultImage()` 逻辑 | `routes/canteen.js`：当 product.images 为空时，查询 `product_comments` 表第一张点评图片，有则用点评图片，无则用默认图 | — |
| B-B2 | 全部菜品列表/排行榜接口检查 | 确保 `GET /api/canteen/shops/:shopId/products`、`GET /api/canteen/rankings/*`、`GET /api/canteen/regions/:id/top-products` 等接口的图片字段经过 `ensureProductDefaultImage()` 处理 | B-B1 |
| B-B3 | 菜品详情接口检查 | `GET /api/canteen/products/:productId` 确保已处理 | B-B1 |

### 2.3 前端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| B-F1 | 统一检查 `productImageUrl()` 调用 | 确保所有展示菜品缩略图的地方都使用 `productImageUrl()`，包括排行榜、FoodCard、CanteenHomeRankings、CanteenPickMeal、FoodDetailView | — |
| B-F2 | 验证各页面图片回退展示正确 | 商家详情页 / 菜品详情页 / 排行榜 / 首页排行 / 随机选菜 | B-B2 |

---

## 3. 模块 C：食堂吃货广场瀑布流图片展示

### 3.1 需求描述

吃货广场的帖子卡片（瀑布流），如果帖子有图片要在卡片上展示第一张图片。

**当前状态：** `CanteenFoodSquare.jsx` 已有 `cover_url` 展示逻辑（后端从帖子 HTML 内容中正则提取第一张 `<img>` 的 src）。但使用的是原始图 URL 而非缩略图 URL。

### 3.2 任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| C-B1 | 后端：`GET /api/canteen/food-articles` 改用缩略图 URL | 提取 `cover_url` 时，优先找 `posts/thumbs/` 缩略图，或调用 `toPostThumbUrl` 等价逻辑 | — |
| C-F1 | 前端：确保瀑布流卡片图片展示 | `CanteenFoodSquare.jsx` 检查：无图时隐藏图片区域（而非顯示佔位），有图时使用缩略图加载 | C-B1 |

---

## 4. 模块 D：广场热搜与校园此刻缺陷修复

### 4.1 需求清单

1. **热搜榜位置调整：** 热搜榜放在轮播图**下方**（当前在上方）
2. **热搜默认展示 Top 5**（已实现 ✅）
3. **热搜帖子流展示第一张图片**（当前仅展示纯文本）
4. **热搜发布页：** 文字支持换行 + 插入图片/GIF
5. **热搜帖子详情页：** 复用树洞 `PostDetail` UI（但数据隔离）；支持评论 + 点赞
6. **校园此刻帖子流排版 UI 优化**
7. **校园此刻增加发帖按钮**（CampusBlock 当前无发帖入口）
8. **校园此刻发帖页：** 文字支持换行 + 插入图片/GIF + 身份选择

### 4.2 后端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| D-A1 | `migrations/049_trending_post_images.sql` | `trending_post_images` 表：`id, post_id, file_path, sort_order, created_at` | — |
| D-A2 | `migrations/050_trending_post_comments.sql` | `trending_post_comments` 表：`id, post_id, user_id, parent_id, content, deleted_at, created_at`（结构对齐 `post_comments`） | — |
| D-A3 | `migrations/051_trending_post_likes.sql` | `trending_post_likes` 表：`post_id, user_id, created_at` PRIMARY KEY(post_id, user_id) | — |
| D-A4 | 修改 `POST /api/square/trending/:id/posts` | 支持 FormData 上传图片（复用 `postImagesUpload` 中间件），图片存对象存储，记录入 `trending_post_images` | D-A1 |
| D-A5 | 修改 `GET /api/square/trending/:id/posts` | 返回每帖的 `images` 数组 + `like_count` + `comment_count` | D-A1, D-A3 |
| D-A6 | `GET /api/square/trending/posts/:id` | 热搜帖子详情（单帖 + 图片 + 作者信息） | D-A1 |
| D-A7 | `POST /api/square/trending/posts/:id/comments` | 发表评论（支持回复 `parent_id`），复用树洞评论逻辑 | D-A2 |
| D-A8 | `GET /api/square/trending/posts/:id/comments` | 获取评论列表（含嵌套结构） | D-A2 |
| D-A9 | `POST /api/square/trending/posts/:id/like` | 点赞/取消点赞 toggle | D-A3 |
| D-A10 | `migrations/052_campus_post_images.sql` | `campus_post_images` 表：`id, post_id, file_path, sort_order, created_at` | — |
| D-A11 | 修改 `POST /api/square/campus-posts` | 支持 FormData 上传图片（复用 `postImagesUpload`），图片存对象存储 | D-A10 |
| D-A12 | 修改 `GET /api/square/campus-feed` 和 `GET /api/square/campus-posts/:id` | 返回图片数组 | D-A10 |
| D-A13 | 注册迁移至 `scripts/run-incremental-migrations.js` | | D-A1~A3, D-A10 |

### 4.3 前端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| D-F1 | `SquareHome.jsx` — 热搜榜与轮播图位置互换 | `<TrendingBlock />` 移到 `<CanteenBannerCarousel />` 下方 | — |
| D-F2 | `SquareTrendingDetail.jsx` — 帖子流展示第一张图片 | 帖子卡片加入缩略图展示逻辑 | D-A5 |
| D-F3 | `SquareTrendingPostNew.jsx` — 图片上传 + 换行支持 | 加入图片选择/预览组件（`<textarea>` 本身支持换行）；最多 3 张图/GIF | D-A4 |
| D-F4 | **新建** `SquareTrendingPostDetail.jsx` | 热搜帖子详情页：复用 `PostDetail.jsx` UI 结构（标题区 + 内容区 + 图片 + 评论列表 + 点赞），但调用 `/api/square/trending/posts/:id` 系列 API | D-A6~A9 |
| D-F5 | 路由注册 `/about/trending/post/:id` | `layoutRoutes.jsx` 新增路由 → `SquareTrendingPostDetail` | D-F4 |
| D-F6 | `CampusBlock.jsx`（在 `SquareHome.jsx` 中）— 增加发帖按钮 | 标题栏右侧加"发布"按钮，跳转 `/about/campus/new?tab=school|college` | — |
| D-F7 | `SquareCampusPostNew.jsx` — 图片/GIF 上传 + 换行 | 加入图片选择组件（最多 3 张图/GIF）；`<textarea>` 本身已支持换行 | D-A11 |
| D-F8 | **新建** `SquareCampusPostDetail.jsx` | 校园此刻帖子详情页，展示标题/内容/图片/组织身份 | D-A12 |
| D-F9 | 路由注册 `/about/campus/:id` | `layoutRoutes.jsx` 新增路由 → `SquareCampusPostDetail`（当前该路由缺失导致点击跳到首页） | D-F8 |
| D-F10 | `CampusBlock` — 帖子流排版 UI 优化 | 每条帖子卡片：组织头像 + 组织名（官方认证）+ 标题 + 摘要 + 时间；如有一张图片展示缩略图 | D-A12 |
| D-F11 | `square.js` API 封装扩展 | `getTrendingPostDetail()` / `getTrendingPostComments()` / `postTrendingComment()` / `likeTrendingPost()` / `getCampusFeed()` 等 | D-A6~A9 |
| D-F12 | `queryKeys.js` 扩展 | 新增 query keys：`trendingPostDetail` / `trendingPostComments` / `campusPostDetail` | D-F11 |

---

## 5. 模块 E：待办事项全量开发

### 5.1 需求描述

- 完整的待办事项（Todo）功能
- 在我的页面（MyZone），当前课程下方加入"今日待办"缩略卡片

### 5.2 数据模型

**`todos` 表：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INT PK AUTO_INCREMENT | |
| `user_id` | INT FK NOT NULL | |
| `title` | VARCHAR(500) NOT NULL | 待办标题 |
| `description` | TEXT NULL | 详细描述 |
| `priority` | TINYINT DEFAULT 0 | 0=无, 1=低, 2=中, 3=高 |
| `due_date` | DATE NULL | 截止日期 |
| `due_time` | TIME NULL | 截止时间 |
| `is_completed` | TINYINT DEFAULT 0 | 是否完成 |
| `completed_at` | TIMESTAMP NULL | 完成时间 |
| `list_type` | ENUM('personal','course','club','other') DEFAULT 'personal' | 分类 |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |
| INDEX | `(user_id, is_completed, due_date)` | 加速今日待办查询 |

### 5.3 后端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| E-A1 | `migrations/053_todos.sql` | `todos` 表创建 | — |
| E-A2 | `routes/todos.js` | 挂载 `/api/todos` | E-A1 |
| E-A3 | `GET /api/todos?date=&status=&list_type=` | 查询当前用户的待办列表（支持按日期/完成状态/分类过滤） | E-A2 |
| E-A4 | `GET /api/todos/today` | 今日待办摘要（总数 + 未完成数 + 前 3 条高优先级） | E-A2 |
| E-A5 | `POST /api/todos` | 创建待办：`{ title, description?, priority, due_date?, due_time?, list_type? }` | E-A2 |
| E-A6 | `PATCH /api/todos/:id` | 编辑待办（标题、描述、优先级、截止日期、分类） | E-A2 |
| E-A7 | `PATCH /api/todos/:id/toggle` | 切换完成状态 | E-A2 |
| E-A8 | `DELETE /api/todos/:id` | 删除待办 | E-A2 |
| E-A9 | 注册迁移 + 路由 | `server.js` 注册 `/api/todos`、`run-incremental-migrations.js` 注册迁移 | E-A1, E-A2 |

### 5.4 前端任务

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| E-F1 | **新建** `pages/TodoList.jsx` | 待办列表页：分类筛选、优先级色标、完成切换动画、新建/编辑弹窗 | E-A3~A8 |
| E-F2 | **新建** `pages/TodoList.css` | 待办列表样式（卡片式、优先级色条、完成划线动画） | E-F1 |
| E-F3 | **新建** `components/TodoCard.jsx` | 可复用的待办卡片组件（用于 MyZone 缩略 + TodoList 列表） | — |
| E-F4 | `api/todos.js` | API 封装：`getTodos()`, `getTodayTodos()`, `createTodo()`, `updateTodo()`, `toggleTodo()`, `deleteTodo()` | E-A3~A8 |
| E-F5 | `queryKeys.js` 扩展 | 新增 query keys：`todosList`, `todosToday` | E-F4 |
| E-F6 | `MyZone.jsx` — 加入今日待办缩略卡片 | 课程卡片下方插入 `<TodayTodoPreview />`：显示"今日待办 (N)" + 前 2 条高优先级待办；点击跳转 `/myzone/todos` | E-A4 |
| E-F7 | 路由注册 `/myzone/todos` | `layoutRoutes.jsx` 新增路由 → `TodoList` | E-F1 |
| E-F8 | `MyZone.jsx` — 将占位按钮替换为真实入口 | 工具网格中"待办事项"按钮从 Toast 占位 → 导航到 `/myzone/todos` | E-F1 |

### 5.5 前端交互设计

```
MyZone 页面布局（更新后）：

┌─────────────────────────┐
│  头像 + 欢迎信息          │
│  [帖子] [点评] [收藏]     │
├─────────────────────────┤
│  当前课程                 │  ← 现有
├─────────────────────────┤
│  今日待办          [全部>]│  ← 新增缩略卡片
│  ⬜ 交数学作业 (高)       │
│  ⬜ 社团会议 14:00 (中)   │
│  +2 项未完成...          │
├─────────────────────────┤
│  工具网格                 │
│  [食堂] [课表] [✅待办] [店铺] │  ← 待办按钮改为真实导航
├─────────────────────────┤
│  更多...                 │
└─────────────────────────┘
```

---

## 6. 建议实施顺序

| 阶段 | 模块 | 内容 | 预估工作量 |
|------|------|------|-----------|
| **P0** | A | 树洞 Tag 种子数据（048）— 可独立执行，无依赖 | 0.5d |
| **P1** | B | 食堂菜品缩略图逻辑修复 — Bug fix，影响面广 | 1d |
| **P2** | A | 树洞 Tag 管理（延伸按钮 + 自定义可见） | 2d |
| **P3** | D | 广场热搜/校园此刻：图片支持（DB 迁移 + API 改造） | 3d |
| **P4** | D | 广场前端：热搜帖子详情页 + 校园此刻详情页 + 图片上传 UI + 发帖按钮 | 3d |
| **P5** | C + D | 食堂吃货广场图片优化 + 热搜榜位置调整 + 校园此刻排版 | 1d |
| **P6** | E | 待办事项全量开发（DB + API + TodoList + MyZone 卡片） | 3d |

### 里程碑

| 里程碑 | 交付物 | 验收标准 |
|--------|--------|----------|
| M1 | Tag 种子数据上线 | 树洞 Tag 栏出现新 tag（CSGO、Basketball 等） |
| M2 | 菜品缩略图修复 | 无商家图的菜品展示点评首图；所有排行榜图正确 |
| M3 | Tag 自定义管理 | 用户可增删 Tag 栏的 tag；设置持久化 |
| M4 | 热搜/校园此刻图片功能 | 发帖可附图/GIF；帖子流展示第一张图 |
| M5 | 热搜/校园此刻详情页 | 详情页含评论/点赞；与树洞数据隔离 |
| M6 | 待办事项上线 | 可 CRUD 待办；MyZone 展示今日待办卡片 |

---

## 7. 文件与目录清单（实施参考）

### 7.1 数据库迁移（新建）

| 文件 | 说明 |
|------|------|
| `migrations/047_treehole_tag_visibility.sql` | Tag 可见性表 |
| `migrations/048_seed_new_tags.sql` | 新增 20+ 个双语 tag 种子 |
| `migrations/049_trending_post_images.sql` | 热搜帖子图片表 |
| `migrations/050_trending_post_comments.sql` | 热搜帖子评论表 |
| `migrations/051_trending_post_likes.sql` | 热搜帖子点赞表 |
| `migrations/052_campus_post_images.sql` | 校园此刻帖子图片表 |
| `migrations/053_todos.sql` | 待办事项表 |

### 7.2 后端（新建/修改）

| 文件 | 操作 | 说明 |
|------|------|------|
| `routes/posts.js` | 修改 | 新增 `GET /api/posts/tags/visible`、`PATCH /api/posts/tags/:tagId/visible` |
| `routes/canteen.js` | 修改 | `ensureProductDefaultImage()` 加入点评图片回退逻辑 |
| `routes/square.js` | 修改 | 热搜帖子图片上传 / 评论 / 点赞 API；校园此刻图片上传 |
| `routes/todos.js` | **新建** | 待办事项 CRUD API |
| `server.js` | 修改 | 注册 `/api/todos` 路由 |
| `scripts/run-incremental-migrations.js` | 修改 | 注册 047~053 迁移 |

### 7.3 前端（新建/修改）

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/components/TreeHoleToolbar.jsx` | 修改 | 增加延伸按钮 + 下拉面板集成 |
| `frontend/src/components/TreeHoleTagPanel.jsx` | **新建** | Tag 可见性管理面板 |
| `frontend/src/pages/SquareHome.jsx` | 修改 | 热搜/轮播位置互换；CampusBlock 增加发帖按钮 + UI 优化 |
| `frontend/src/pages/SquareHome.css` | 修改 | 新增 campus 卡片/发帖按钮样式 |
| `frontend/src/pages/SquareTrendingDetail.jsx` | 修改 | 帖子卡片展示第一张图片 |
| `frontend/src/pages/SquareTrendingPostNew.jsx` | 修改 | 增加图片上传组件 |
| `frontend/src/pages/SquareTrendingPostDetail.jsx` | **新建** | 热搜帖子详情页（复用 PostDetail UI 结构） |
| `frontend/src/pages/SquareCampusPostNew.jsx` | 修改 | 增加图片上传组件 |
| `frontend/src/pages/SquareCampusPostDetail.jsx` | **新建** | 校园此刻帖子详情页 |
| `frontend/src/pages/TodoList.jsx` | **新建** | 待办列表页 |
| `frontend/src/pages/TodoList.css` | **新建** | 待办列表样式 |
| `frontend/src/components/TodoCard.jsx` | **新建** | 待办卡片组件 |
| `frontend/src/pages/MyZone.jsx` | 修改 | 今日待办缩略卡片 + 待办按钮导航 |
| `frontend/src/pages/MyZone.css` | 修改 | 今日待办卡片样式 |
| `frontend/src/components/canteen/CanteenFoodSquare.jsx` | 修改 | 优化图片展示（无图时处理） |
| `frontend/src/api/tags.js` | **新建** | Tag 可见性 API 封装 |
| `frontend/src/api/todos.js` | **新建** | 待办 API 封装 |
| `frontend/src/routes/layoutRoutes.jsx` | 修改 | 新增路由：`/about/trending/post/:id`、`/about/campus/:id`、`/myzone/todos` |
| `frontend/src/query/queryKeys.js` | 修改 | 扩展 query keys |

---

## 8. 风险与注意事项

| 风险 | 缓解 |
|------|------|
| 热搜评论/点赞系统与树洞高度相似 → 代码重复 | 可考虑提取共享的评论/点赞 service 层；V3.0 阶段快速交付优先，先独立实现，V3.1 再抽象 |
| 菜品缩略图回退到点评图片 → 点评图片可能很大 | 后端回退时统一返回缩略图尺寸（或前端用 `object-fit: cover` + 固定容器） |
| Tag 可见性表写入频繁 | 使用简单的 upsert 逻辑；数据量极小（每用户每 tag 一行） |
| LIMIT OFFSET 在 Railway MySQL 上 500 | 复用食堂模块经验：使用内联整数拼接 LIMIT，避免参数化占位符 |
| 校园此刻详情页路由当前缺失 → 点击跳首页 | 本次修复必须补齐 `/about/campus/:id` 路由 |

---

## 9. 验收对照表

| 缺陷项 | 前端验收 | 后端验收 |
|--------|----------|----------|
| 树洞 Tag 延伸按钮 | 点击 `+` 弹出面板；已加入/未加入分区；点击切换即时生效 | `tag_visibility` 表正确持久化 |
| 新 Tag 种子 | 下拉面板可见 CSGO、Basketball 等新 tag（双语） | `tags` 表含全部新 tag |
| 菜品缩略图回退 | 无图菜品展示点评首图；排行榜/详情页一致 | `ensureProductDefaultImage` 含 review 回退 |
| 吃货广场图片 | 帖子卡片展示第一张图缩略图 | `cover_url` 使用缩略图路径 |
| 热搜榜在轮播下方 | SquareHome 布局：轮播 → 热搜 → 四宫格 → 校园此刻 | — |
| 校园此刻发帖按钮 | CampusBlock 标题栏有"发布"按钮 | — |
| 校园此刻发帖图片 | 发帖页可上传图片/GIF；`<textarea>` 支持换行 | `campus_post_images` 正确存储 |
| 热搜帖子图片展示 | 讨论区帖子流展示第一张图 | `trending_post_images` 正确存储 |
| 热搜帖子详情页 | 独立详情页（非树洞 PostDetail），但 UI 结构一致；评论/点赞可用 | 评论/点赞 API 正确；与树洞数据隔离 |
| 待办事项 CRUD | TodoList 页可增删改查；切换完成状态有动画 | `/api/todos` 全部接口正常 |
| 今日待办卡片 | MyZone 课程下方显示未完成数 + 前 2 条高优先级 | `/api/todos/today` 返回正确摘要 |

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-05-18 | 初版：依据《Dorm3.0—现阶段缺陷》文档，结合仓库实际状态拆分前后端任务与里程碑 |
