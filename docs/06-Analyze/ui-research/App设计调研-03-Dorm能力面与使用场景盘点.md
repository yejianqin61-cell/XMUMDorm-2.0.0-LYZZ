# Dorm 能力面与使用场景盘点（新 App 信息架构事实输入）

**日期**：2026-09-30
**性质**：新 App 信息架构（IA）与设计要求的前置事实输入
**为什么必须做**：旧 App 客户端与设计文档已全盘删除（归档于 git tag `app-legacy-v1`）。新 App 的 IA 不能继承旧文档叙述，只能从**当前仓库代码能跑出什么能力**反推。
**事实口径**：`routes/*.js`、`frontend/src/pages/`、`shared/`、`services/`、`middleware/` 的**当前代码**为唯一事实来源；引用一律给到 `文件:行号`。归档 tag 只用于标注冲突，不作设计依据。
**范围界定**：§1、§2、§6 只陈述代码事实；§3、§4、§5 含明确标注的建议与代价（IA 决策需要）。

---

## 0. 一页速览

| 指标 | 实测 | 证据 |
|---|---|---|
| 后端路由模块 | **20 个** | `routes/` 目录 20 个 `.js`；`server.js:160-179` 挂载 20 个 `/api/*` |
| 已注册 HTTP 端点 | **273 个** | `router.(get/post/patch/delete)` 注册行统计（明细见 §2 各域） |
| Web 页面组件 | **103 个**（`.jsx`） | `frontend/src/pages/`（另 44 个模块 `.css`） |
| 共用纯逻辑/常量/请求层 | `shared/` 49 个文件，其中 `shared/api` **23 个模块** | — |
| 能力域 | **21 个**（§2） | — |
| 交互原型 | **17 个**（8 核心 + 9 扩展，§6） | 覆盖 103 页 100% |
| 顶部一级导航 | 现状 **4 格**（广场/树洞/食堂/我的） | `frontend/src/components/TabBar.jsx:5-10` |
| 平台上限 | Android/Android M3 **3–5**；iOS **3–5**（>5 触发 More） | §4.1 |
| 推荐 IA | **方案 B：五格（广场 / 树洞 / 食堂 / 信箱 / 我的）+ 发布常驻 FAB** | §4.4 |
| 待所有者拍板 | **14 项**（§5） | — |

**三个决定性事实**（也是本报告与"旧文档口径"最大的分歧）：

1. **树洞不是匿名的**。`routes/posts.js:130-135,177-182` 对每个帖子返回 `author.id/username/nickname/avatar/level`。只有**万能墙**是强制匿名：`routes/confessions.js:6-10` 把"响应永不包含 user_id/username/nickname/avatar"写成不得破坏的核心不变量，并在 `projectConfession()`（:64-82）逐字段白名单构造。**"匿名内容是否合并"这个问题的前提本身需要更正**（见 §1.2 冲突 C1）。
2. **信箱（通知）在 Web 移动端没有入口**。`components/Layout.jsx:170` 给移动端固定加 `app-layout--no-topbar`；`components/TopBar.jsx` 有信箱按钮但**全仓库无任何文件 import 它**（只有 `Layout.jsx:19` 引入了它的 CSS）。`MyZone` 的工具区与更多区也不含信箱（`pages/MyZone.jsx:320-343`）。
3. **万能墙、学习资料是"孤岛路由"**。`/confession` 的唯一入站链接来自它自己（`ConfessionWall.jsx:368,389` 指向 `/confession/new`）；`/materials` 的入站链接全部来自资料模块内部（`MaterialsUpload/MaterialsMine/MaterialsHome/MaterialDetail`）。广场首页的 4 个主打入口只有 社团 / 马校一站通 / 帮帮我 / 出物（`pages/SquareHome.jsx:15-44`）。

---

## 一、调研口径与事实来源

### 1.1 证据来源清单

| 层 | 路径 | 用途 |
|---|---|---|
| 路由端点 | `routes/*.js`（20） | 能力面主证据，精确到 `文件:行号` |
| 装配与后台任务 | `server.js:160-179`、`server.js:211-243` | 模块挂载、定时任务（周榜重置、课前提醒推送） |
| 中间件 | `middleware/auth.js`、`adminAuth.js`、`checkSanction.js`、`sensitiveWordFilter.js`、`upload.js`、`materialUpload.js` | 权限、风控、上传边界 |
| 服务 | `services/`（16） | 业务规则：经验、通知、排行统计、课前推送、GitHub 资料库、推荐 |
| 共用层 | `shared/api`（23）、`shared/constants`、`shared/config/semesters.js`、`shared/utils/*` | 前端/后端共用规则（含万能墙滑窗状态机、学习资料规则） |
| 页面 | `frontend/src/pages/**`（103 `.jsx`）、`frontend/src/routes/layoutRoutes.jsx:103-198` | 前端真实能力与路由形态 |
| 导航壳 | `components/TabBar.jsx`、`Layout.jsx`、`components/shell/*` | 现状 IA（移动 4 格 / 桌面侧栏） |
| 模板组件 | `components/templates/*`（9 个组件 + 7 个 `.css`） | 现状"布局原型"的实际使用率（§6.4） |
| 归档（仅对照） | `git show app-legacy-v1:<path>` | 标注"历史材料"，不作依据（§1.3） |

### 1.2 与仓库既有叙述/任务书的冲突（**以当前代码为准**）

| # | 说法 | 当前代码事实 | 证据 | 处理 |
|---|---|---|---|---|
| C1 | 任务书：「树洞（匿名）」「万能墙（匿名纯文字）」 | **树洞非匿名**（返回真实昵称/头像/等级）；**万能墙强制匿名**，且不是"纯文字"——支持点赞、评论、以及 3 种版式模板（大字卡≤60 / 信笺卡≤1000 / 便签卡≤300 字） | `routes/posts.js:130-135,177-182`；`routes/confessions.js:6-10,64-82`；`constants/confessionTemplates.js:15-40` | 匿名相关的 IA 决策必须重写前提（§5-Q3） |
| C2 | `CLAUDE.md:39`「Routes (17 modules)」 | 实际 **20 个**（漏列 `advertisements.js`、`confessions.js`、`materials.js`） | `server.js:33-52,160-179` | 以代码为准 |
| C3 | `CLAUDE.md:46`「pages（86 pages）」 | 实际 **103 个 `.jsx`** | `frontend/src/pages` | 以代码为准 |
| C4 | `CLAUDE.md:48`「`frontend/src/api/`（20 files）」 | 该目录**不存在**；API 层在 `shared/api/`（23 个模块） | — | 以代码为准，新 App 直接复用 `shared/api` |
| C5 | `CLAUDE.md:42`「migrations（57 files）」 | 实际 **73 个** | `migrations/` | 以代码为准 |
| C6 | 归档旧 App 的一级导航为 **5 格**：树洞 / 食堂 / 信箱 / 广场 / 我的 | 当前 Web 移动端为 **4 格**：广场 / 树洞 / 食堂 / 我的，且**信箱无入口** | `git show app-legacy-v1:'mobile/app/(tabs)/_layout.tsx'`；`TabBar.jsx:5-10`；`Layout.jsx:170` | 历史材料；但"信箱该不该占一级"是真实待决问题（§5-Q9） |
| C7 | 代码里存在"广场首页九宫格/热搜榜/今日摘要"组件 | 11 个 `components/square/*` 中**只有 4 个被挂载**；`TodayCampusModuleGrid/HotTopics/HotActivities/Summary/TrendingBoard/HotTagsStrip/MyCampusRecommendations` **0 引用（死代码）**；`SquareHome.jsx` 只挂 轮播 + 4 入口 + Hero | `pages/SquareHome.jsx:56-89`；`components/square/` 引用计数 | 后端聚合能力（`GET /api/square/home-summary`）**强于**当前 Web 呈现，App 可重新设计首页 |
| C8 | 「地图类功能」 | 不是真地图：是**背景图 + 可拖拽贴图（sticker）**，且带"编辑模式/复制配置"给运营用 | `pages/CanteenArea.jsx:6,282-412`；`pages/AboutUs.jsx:373-414` | 影响 §5-Q4 的判断口径 |

### 1.3 归档 tag 的角色（不作为依据）

`app-legacy-v1` 含 1,779 个文件（含 `mobile/`、`frontend-app/`、`android/`、`ios/`、`capacitor.config.ts` 与一批旧设计与任务文档）。本报告只做了两件事：读取旧 Tab 结构用于 C6 对照；确认"旧文档不得作为设计依据"。旧 App 的具体交互、样式、数据模型均未采信。

---

## 二、能力面清单（按业务域）

### 2.0 总表（21 个域）

「端点数」为按功能归属统计；**含交叉归属**（轮播/广告同时服务广场、食堂、商家端；等级复用 `users.js` 端点），故各行相加（274）略大于实际注册数 273。

| # | 业务域 | 后端文件 | 端点 | 页面 | 核心动作 | 数据形态 | 重交互 | App v1 建议 |
|---|---|---|---|---|---|---|---|---|
| D01 | 账号与认证 | `auth.js` | 5 | 3 | 注册（学生/商家双角色）、登录、邮箱验证码、重置密码 | 表单 + 令牌 | 否 | **必备** |
| D02 | 个人资料与个人空间 | `users.js` | 6 | 6 | 改资料/头像、看他人主页、我的帖子/点评、注销 | 详情 + 列表 + 媒体 | 否 | **必备** |
| D03 | 等级与经验 | `services/expService.js`、`users.js:172` | 1* | 1 | 查看等级进度、日常行为攒经验、等级弹窗 | 仪表 + 弹层 | 否 | 必备（轻量） |
| D04 | 信箱 / 通知 / 推送 | `notifications.js`、`push.js` | 10 | 1 | 通知列表（互动/交易/系统）、未读角标、公告弹窗、Web Push 订阅 | 列表 + 实时（推送） | 中 | **必备** |
| D05 | 广场聚合 + 轮播/广告投放 | `square.js`(9)、`advertisements.js`(7) | 16 | 2 | 首页摘要、个性化推荐、轮播位、广告点击统计、投放管理 | 聚合卡片 + 媒体 | 中（轮播/投放） | **必备**（投放管理不进） |
| D06 | 热搜（话题） | `square.js` | 11 | 4 | 看话题榜、进话题、发话题帖、点赞评论、运营建话题 | 列表 + 信息流 + 详情 | 否 | **必备** |
| D07 | 校园此刻 | `square.js` | 6 | 3 | 校园动态流（含学校/学院公告 tab）、发帖、评论点赞 | 信息流 + 详情 | 否 | **必备** |
| D08 | 树洞（帖子流） | `posts.js` | 15 | 5 | 发帖（多图）、瀑布流、关键词搜索、标签流、点赞评论 | 信息流 + 详情 + 表单 | 否 | **必备**（首页级） |
| D09 | 万能墙（强制匿名） | `confessions.js` | 9 | 2 | 一屏一篇纵向翻页、点赞、匿名评论、三种版式投稿 | 翻页卡片 + 表单 | 中（翻页手势） | **必备** |
| D10 | 食堂内容与决策 | `canteen.js`(用户侧 26) | 26 | 10 | 区域→店铺→菜品→点评四级、搜索、收藏、5 类排行榜、随机选餐、美食文章 | 列表/详情/表单/媒体/榜单 | 中（图片密集） | **必备** |
| D11 | 商家端 | `canteen.js`(14) + 轮播投放 | 14 | 7 | 开店、菜品 CRUD、分类管理、我的店铺、轮播/广告投放 | 后台表单 + 媒体上传 | 中 | 建议**移出** v1 |
| D12 | 社团 | `clubs.js` | 31 | 10 | 社团广场 feed、活动列表/详情/报名、帖子、成员、关注点赞、建社团 | 信息流 + 详情 + 表单 | 否 | **必备** |
| D13 | 组织（V3.0） | `organizations.js` | 9 | 1 | 组织 CRUD、成员与权限等级（`can_post`）、广场运营台 | 后台列表/表单 | 否 | 仅运营侧（可内置隐藏） |
| D14 | 二手市场 | `marketplace.js` | 15 | 5 | 分类筛选、发布（≤4 图）、想要/收藏、改状态、**站内私信** | 列表 + 详情 + 对话 | **是**（聊天） | **必备** |
| D15 | 跑腿 | `errands.js` | 6 | 3 | 发布（代取/代购/紧急）、接单、完成、详情直给联系方式 | 列表 + 详情 + 表单 | 否 | **必备** |
| D16 | 新生指南（Handbook） | `handbook.js`(27) | 27 | 4 | 文章流（Markdown+TOC）、收藏、投稿编辑、图片上传、**清单 checklist** | 阅读器 + 列表 + 表单 | 中（编辑器） | **必备** |
| D17 | 课程评价 | `handbook.js`(9) | 9 | 3 | 课评列表/筛选、发课评（打分）、评论、我的课评 | 列表 + 详情 + 表单 | 否 | **必备** |
| D18 | 学习资料 | `materials.js` | 15 | 6 | 课程中心、多维筛选、**PDF/Markdown 在线阅读**、下载、上传（GitHub 流水线）、我的上传 | 列表 + 阅读器 + 上传进度 | **是**（阅读器） | **必备**（阅读范围待定） |
| D19 | 个人效率（课表/待办/日记/节假日） | `schedule.js`、`todos.js`、`diary.js` | 13 | 4 | 课表文本导入解析+周视图、待办（今天/优先级/截止）、日记（一天一篇/月历/总览）、马来西亚公假 | 课表网格 + 列表 + 日历 | 中（导入/输入） | **必备** |
| D20 | 举报与内容治理 | `reports.js` + 2 中间件 | 1 | 0（组件 1） | 8 种原因举报任意内容类型、敏感词过滤、封禁/禁言校验 | 表单 + 中间件 | 否 | **必备** |
| D21 | 管理后台 | `admin.js` | 29 | 11 | 仪表盘、用户封禁/禁言、举报处理、公告、审计日志、系统配置、敏感词、内容审核 | 后台表格 CRUD | 是（表格/批量） | 建议**移出** v1 |

\* D03 无独立端点，复用 `GET /api/users/me/level`（`users.js:172`）。

### D01 账号与认证

| 能力 | 端点/证据 | 数据形态 | 备注（对 App 的影响） |
|---|---|---|---|
| 学生注册 | `POST /api/auth/register`，`routes/auth.js:249-286` | 表单 | **硬门槛：邮箱必须 `@xmu.edu.my`**（`auth.js:281`；前端同判 `Register.jsx:47,223`） |
| 商家注册 | 同端点，`role='merchant'` + `invite_code`（`auth.js:254-263`） | 表单 | 邀请码制 → App 里商家注册应默认隐藏 |
| 邮箱验证码 | `POST /api/auth/send-verification-code`（`auth.js:46`） | 表单 + 邮件 | 60 秒倒计时（`Register.jsx:232`） |
| 登录 | `POST /api/auth/login`（`auth.js:515`） | 表单 + JWT | — |
| 找回密码 | `POST /api/auth/send-reset-code`（`:128`）、`POST /api/auth/reset-password`（`:190`） | 表单 | — |
| 注销账号 | `DELETE /api/users/me`（`users.js:282`） | 危险操作确认 | 上架应用商店通常被要求可达 |

### D02 个人资料与个人空间

| 能力 | 证据 | 数据形态 |
|---|---|---|
| 我的资料（含等级摘要） | `users.js:132` | 详情 |
| 他人主页（资料 + 帖子 + 统计） | `users.js:185`，页面 `UserZone.jsx`（31 KB，103 页中最大之一） | 详情 + 列表（仪表盘型） |
| 改资料 / 传头像 | `users.js:297`、`users.js:351` | 表单 + 媒体 |
| 我的帖子 / 我的点评 | 页面 `MyPosts.jsx`、`MyReviews.jsx` | 列表 |
| 设置（语言、注销） | 页面 `Settings.jsx`；`LanguageContext` 提供 zh/en 双语 | 列表 |

### D03 等级与经验

- 规则单一来源：`shared/constants/levelConfig.js:2`（7 个阈值，1–6 级）、`:36-45`（8 类经验动作与每日上限）。
- 后端：`services/expService.js`（9 KB）、`constants/levelThresholds.js`；返回体带经验增量（`utils/expResponse.js:attachExp`）。
- 前端反馈：`context/ExpFeedbackContext.jsx`、`components/LevelUpModal.jsx`、`UserLevelBadge.jsx`、`LevelProgressBar.jsx`。
- **App 影响**：等级是贯穿全局的"游戏化激励"，但只在 我的 / 帖子作者 / 评论作者 三处呈现（`posts.js:130-135`）。属轻量组件，不构成独立页面负担。

### D04 信箱 / 通知 / 推送

| 能力 | 证据 | 数据形态 |
|---|---|---|
| 通知列表（分页 + 分类筛选） | `notifications.js:156`，`services/notificationService.js:52-66` 定义三类：`interaction` / `transaction` / `system` | 列表 |
| 未读汇总 | `notifications.js:272` | 计数 |
| 未读公告（App 内弹窗） | `notifications.js:339`；`Layout.jsx:214-253` 弹窗实现 | 模态 |
| 标记已读 / 批量 | `notifications.js:368`、`:388`（批量上限 100） | 状态变更 |
| 清空 | `notifications.js:291` | 危险操作 |
| Web Push 订阅 | `push.js:15,27,51,69`（VAPID 公钥/订阅/退订/测试） | 系统级 |
| 课前 30 分钟提醒 | `services/classReminderPush.js:1-40`，定时器 `server.js:231-240`；依赖 `VAPID_*` 环境变量 | 推送 |
| 通知类型全集 | `notificationService.js:11-50`：树洞/热搜/校园/食堂/二手/社团/事务/系统 共 18 类 | — |

> **App 影响（重要）**：Web 用 **Web Push + VAPID**，前端只能在页面常驻时收到；App 必须换成 **APNs / FCM**，这是 v1 的独立工作量，且是"二手私信""跑腿接单""活动提醒"能否闭环的前提。

### D05 广场聚合 + 轮播/广告投放

| 能力 | 证据 | 说明 |
|---|---|---|
| 首页摘要 | `square.js:139` → `services/squareHomeService.js:180-211`：返回 `hot_treeholes / hot_topics / hot_activities / campus_highlights / quick_stats(events_today, unread_notifications, campus_notice_count)` | 后端聚合已就绪 |
| 个性化摘要 / 推荐 | `square.js:151`、`:163` → `services/squareRecommendationService.js`（10 KB） | 推荐流 |
| 轮播 | `square.js:891` 取、`:934` 运营列表、`:962` 上传、`:989/:1027/:1075` CRUD | 媒体 |
| 广告（内容型） | `advertisements.js:123` 公开取、`:182` 点击统计、`:274/:301` 运营视图、`:326/:388` 创建/编辑（含上传）、`:449` 归档；CTA 类型 6 种 | `services/advertisementTarget.js` 校验目标 |
| 前端现状 | `SquareHome.jsx:56-89` 仅 轮播 + 4 入口 + Hero；`TodayCampusHero.jsx:5-40` 内含 学校公告/学院通知 入口 | 呈现远弱于后端 |

### D06 热搜（话题）

`square.js:180` 话题榜 → `:209` 话题详情 → `:231` 话题下帖子（分页）→ `:299` 发帖 → `:344` 帖详情 → `:396/:417` 评论 → `:464` 点赞 → `:518/:537/:559` 运营 CRUD。
前端：`SquareTrendingList/Detail/PostDetail/PostNew.jsx`（4 页），带 `FilterBar`（`SquareTrendingList.jsx:101-103`）与"爆热/上升/关注"热度分档（`:18-25`）。

### D07 校园此刻

`square.js:576` 动态流（含 `?tab=school|college` 公告分流，见 `TodayCampusHero.jsx:13,21`）→ `:647` 发帖 → `:702` 详情 → `:761/:784` 评论 → `:847` 点赞。
前端 3 页；与热搜共用 `campus_post_images`/`trending_post_images` 两套图片表（`square.js:250,260,612`）。

### D08 树洞（帖子流）

| 能力 | 证据 | 数据形态 |
|---|---|---|
| 发帖（多图） | `posts.js:204` + `middleware/upload.js` `postImagesUpload/savePostImages` | 表单 + 媒体 |
| 列表（分页/关键词/标签/排序） | `posts.js:382`；参数见 `:384-410`（`page/pageSize≤50/q≤200/tagId/tagSlug`） | 信息流 |
| 详情 / 点赞 / 评论 | `posts.js:672`、`:866`、`:930,:979` | 详情 |
| 标签体系（用户建标签 + 可见性） | `posts.js:497`、`:513` 热搜标签、`:549/:583/:616/:648` | 列表 |
| 作者身份**公开** | `posts.js:130-135,177-182` | ⚠️ 与"匿名"口径冲突（C1） |
| 内容资格经验 | `utils/expEligibility.js`、`isPostContentEligible()` | — |
| 前端 | `TreeHole.jsx`（32 KB，最大页面）：**双列瀑布流 + 虚拟窗口开关 + 缩略图/webp + sessionStorage 缓存**（`:25-34,82-140,109`） | 重列表性能 |

### D09 万能墙（强制匿名）

| 能力 | 证据 | 数据形态 |
|---|---|---|
| 匿名不变量 | `confessions.js:6-10`（响应永不包含 user_id/username/nickname/avatar）、`:41-42` 写死"匿名/Anonymous" | — |
| 游标窗口（翻页核心） | `confessions.js:224` `/window`，`limit` 钳制 1–10、默认 5（`:31-33`）；`:311` `/meta` 总篇数 | 翻页 |
| 投稿（3 版式 + 字数上限） | `confessions.js:324`；`constants/confessionTemplates.js:15-40`：大字卡 60 / 信笺卡 1000 / 便签卡 300 | 表单 |
| 点赞 / 评论（匿名） | `confessions.js:467`、`:510,:545`；`projectComment`（`:91-105`） | 详情 |
| 前端翻页状态机 | `shared/utils/confessionWindow.js:21`（窗口上限 12 条）、`move/jump/shouldPrefetch/trimWindow` 纯函数；UI 为**纵向一屏一篇（88vh）** `ConfessionPager.jsx:25` | 重交互（手势） |

### D10 食堂内容与决策

四级结构 + 决策工具（用户侧 26 个端点）：

| 层 | 端点 |
|---|---|
| 区域 | `canteen.js:249` 区域列表、`:521/:545` 区域热销 |
| 店铺 | `:560` 区域内店铺、`:664` 店铺详情、`:825` 分类、`:985` 菜品列表、`:1054` 店热销 |
| 菜品 | `:1120` 详情、`:1727/:1758/:1773` 收藏、`:1362` 发点评、`:1539` 点评列表、`:1595` 删点评 |
| 我的 | `:1651` 我的点评、`:1786` 我的收藏 |
| 决策 | `:2007` 搜索（**菜品 + 美食文章**，`type=all|products|articles`）、`:2391` **pick-random 随机选餐**、`:2449` 美食文章 |
| 榜单 | `:1838` 热销菜品、`:1876` 最忙店铺、`:1905` 顶流店铺、`:1935` 新晋爆款、`:1975` 活跃用户（周榜，`server.js:213-226` 每周一东八区 0 点重置） |
| 轮播 | `:2132` 取、`:2179` 运营全量 |

前端 10 页：`CanteenHome`（搜索 + 轮播 + 区域网格 + "大家都在吃" + 食堂讨论，5 段纵向堆叠，`CanteenHome.jsx:11-22`）、`CanteenArea`（贴图地图）、`CanteenSearch`、`MerchantList`、`FoodList`、`FoodShopHot`、`FoodDetail`（23 KB）、`FoodReviewPublish`、`Rankings`、`AreaProductRanking`。

### D11 商家端

| 能力 | 证据 |
|---|---|
| 开店 / 我的店铺 | `canteen.js:265` 建店（带敏感词过滤）、`:608` `/shops/me` |
| 店铺编辑 / 删除 | `:719`、`:787` |
| 分类 CRUD | `:805`、`:840`、`:863` |
| 菜品 CRUD + 图片 | `:882`、`:1248`、`:1327`（`productImagesUpload`） |
| 点评管理 / 回复通知 | `canteen.js` 通知类型 `canteen_review`、`canteen_reply`（`notificationService.js:18-19`） |
| 轮播/广告投放 | `canteen.js:2204/:2280/:2362`；`SquareOrgAdmin.jsx:70` 的 banners tab 重定向到 `/eat/banners?placement=square`；`shared/components/AdvertisementAdminPanel.jsx` |
| 前端页面 | `StoreCreate`、`FoodManage`、`FoodCreate`、`MerchantFoodDetail`、`MerchantShopEdit`、`CanteenShopManage`、`CanteenBannerManage`（7 页） |

### D12 社团

`clubs.js`（31 端点）：feed（`:1043`）、活动（`:1136` 列表、`:1310` 详情、`:1379` 报名状态、`:1406` 报名、`:1500` 取消、`:673` 状态）、帖子（`:1258` 列表、`:852` 发布、`:1632` 详情、`:1720/:1731` 评论）、社团（`:1196` 列表、`:1744` 详情、`:617` 创建、`:699` 编辑、`:967` 关注、`:1000` 我的社团、`:751` 拉成员、`:548/:579` 用户搜索）、互动（`:899` 浏览、`:921` 点赞）。
分类写死在页面：`ClubsHome.jsx:20-25`（全部/音乐/科技/文化/运动/艺术）。
前端 10 页。

### D13 组织（V3.0）

`organizations.js:30` 我的组织（返回 `title` 与 `permission_level`，`can_post = level>=1`）、`:59` 组织列表、`:83` 创建、`:111` 编辑、`:145/:189/:212` 成员增改删、`:225` 用户搜索、`:249` 成员列表。
用途：广场运营（`SquareOrgAdmin.jsx:59-70` 组织管理 / 热搜管理 / 广场轮播），并与社团是**两套并行系统**（`clubs` vs `organizations`）→ §5-Q11。

### D14 二手市场

| 能力 | 证据 |
|---|---|
| 分类 / 列表 / 详情 | `marketplace.js:152`、`:176`、`:312` |
| 发布（≤4 图，8 MB，jpg/png/webp） | `:405`；常量 `:27-30`（`MAX_IMAGES_PER_ITEM=4`） |
| 宿舍区位置枚举 | `:29` `LY1..LY9, D1..D5`（13 个区） |
| 编辑 / 改状态 / 删除 | `:481`、`:540`、`:618` |
| 想要 / 收藏 | `:577`、`:644` 我的想要 |
| **站内私信** | 线程：`:715` `/items/:id/chat/thread`、`:786` `/items/:id/chat/threads`；消息：`:838` 读、`:901` 发、`:944` 已读回执 |
| 前端 | 5 页；`MarketplaceChat.jsx:34` **`refetchInterval: 4s` 轮询**——全仓库无 WebSocket/SSE（`server.js` 与 `routes/*` 均无） |

### D15 跑腿

`errands.js`：类型 `delivery|purchase|urgent`、状态 `open|taken|done`（`:15-16`）；`:56` 列表、`:136` 详情、`:199` 发布、`:237` 接单、`:293` 完成、`:349` 删除。
**关键设计约束（文件头注释 `:1-6`）**：`No private chat core: contact_info is returned in detail` —— 跑腿**不做站内私信**，详情页直接给联系方式。前端 3 页，tabs 见 `ErrandsHome.jsx:11-15`。

### D16 新生指南（Handbook）

`handbook.js`（27 端点）：`tabs`（`:101`）、`tags` CRUD（`:121,144,170,199`）、文章列表（`:223`）/详情（`:330`）/发布（`:422`，默认 `draft`）/编辑/删除、点赞（`:598`）收藏（`:620`）分享（`:642`）、评论与评论点赞（`:659,731,799,824`）、我的收藏（`:863`）、**清单 checklist 与条目 CRUD**（`:912,957,969,985,999,1019,1048`）、图片上传（`:1550`）。
内容格式：**Markdown**（文件头 `:1-6`："富文本：Markdown（前端负责 TOC；后端只存储与返回）"）；编辑器是"光标处插入文本"的轻量实现（`HandbookEditor.jsx:53-60`），非所见即所得。
前端 4 页 + 阅读器 `HandbookArticleDetail.jsx`（27.7 KB）。

### D17 课程评价

`handbook.js:1067` 列表、`:1144` 详情、`:1197` 发布、`:1232` 编辑、`:1310` 我的课评、`:1375` 打分、`:1417` 删除、`:1433/:1470/:1510` 评论。
前端 3 页 + `FilterBar`（`CourseReviewPage.jsx:7`）。

### D18 学习资料

| 能力 | 证据 |
|---|---|
| 列表（多维筛选：`q/course/type/examNode/lesson/kind/sort/page`） | `materials.js:139,163-172` |
| 课程中心 / 课程解析 | `:252`、`:278` |
| 文件字节直连 CDN（零服务器带宽），本 API 只给 pinned baseUrl + 文本兜底 | 文件头 `:1-12`；`:310` `/file/*` |
| 上传（走 GitHub 流水线，PAT 只在服务端） | `:348`；`:567` `/upload/:id/status` 进度轮询；中间件 `middleware/materialUpload.js`；`services/githubMaterials.js`（30 KB） |
| 我的上传 / 保存 / 管理 | `:637`、`:834`、`:863`、`:674` 管理统计、`:754/:770` 课程合并 |
| 规则单一来源 | `shared/constants/materials.js`：类型 5 种（`:23`）、考试节点 5 种（`:36`）、来源 2 种（`:49`）、**单文件 20 MiB 上限**（`:65`，与 jsDelivr 上限"零余量压线"）、可渲染种类（`:90-108`） |
| 阅读器 | `MaterialDetail.jsx:20-24` 按 kind 选 `MarkdownViewer`（react-markdown + remark-gfm + TOC）或 `PdfViewer`；`PdfViewer.jsx:1-18` 明确**不用 pdf.js**、用 iframe 内联预览、失败降级为"仅下载"、不做"新窗口打开"（避免暴露源仓库地址） |
| 前端 6 页 | Home / Course / Detail / Upload / Mine / Admin |

### D19 个人效率（课表 / 待办 / 日记 / 节假日）

| 子能力 | 证据 |
|---|---|
| 课表：粘贴文本 → 解析预览 → 确认导入（覆盖） | `schedule.js:32`、`:53`；解析器 `utils/scheduleParser.js`（9.4 KB） |
| 课表：周视图 + 周次语义 | `schedule.js:151` `/week?week=N`；周次来源 `shared/config/semesters.js:27`（`SEMESTERS`）、`:164` `resolveSemesterContext`、`:21` 吉隆坡时区 |
| 课表：导入来源是**厦门大学教务 HTML 课程表**（仓库根目录留有 `202609 Semester Timetable.html`） | 前端 `Schedule.jsx:556-664` 导入弹窗 |
| 当前/下一节课卡片 | `MyZone.jsx:128-157,454-513`（用本周数据，避免"第 1 周"硬编码缺陷，见 `:123-124` 注释） |
| 课前 30 分钟提醒 | `services/classReminderPush.js`（见 D04） |
| 待办 | `todos.js:47` 列表、`:98` 今天、`:142` 建、`:165` 改、`:193` 勾选、`:212` 删；含 `priority`、`due_date`、`due_time`（`utils/formatTodoDue.js`） |
| 日记 | `diary.js:41` 某天、`:79` 写/改（一天一篇，`user_id + date` 唯一）、`:120` 总览、`:214` 月视图 |
| 节假日 | 前端本地数据 `frontend/src/data/holidays.js:1-12`（2027 马来西亚公假：元旦/春节/开斋节/劳动节/哈芝节/卫塞节/回历元旦/国家元首生日/先知诞辰/国庆日/马来西亚日…），**无后端** |

### D20 举报与内容治理

| 能力 | 证据 |
|---|---|
| 举报 | `reports.js:16`；8 种原因：`spam/fraud/abuse/nsfw/trolling/privacy/illegal_trade/other`（`:36`）；支持 `screenshots` 字段 |
| 前端入口 | `components/ReportButton.jsx`（组件级，挂在内容详情页） |
| 敏感词 | `middleware/sensitiveWordFilter.js`（写操作前置，见于 15+ 端点签名） |
| 封禁/禁言校验 | `middleware/checkSanction.js`（写操作前置） |
| 管理员可追溯匿名身份 | `confessions.js:9` 注释明确"身份字段仅用于…管理员后台追溯" |

### D21 管理后台

`admin.js` 29 端点，全部 `authenticateToken + requireAdmin`（`:18-19`）：仪表盘（`:23`）、用户列表/详情/封禁/解封/禁言/解除/删除（`:103-369`）、举报列表/详情/处理（`:404-478`）、公告 CRUD（`:523-628`）、审计日志（`:659`）、系统配置（`:710,725`）、等级配置（`:760,778`）、敏感词 CRUD/批量/开关（`:813-922`）、**内容审核（按模块：`:1263` 列表、`:1315` 详情、`:1374` 隐藏/显示、`:1414` 删除）**。
前端 11 页（`AdminDashboard/UserList/UserDetail/ReportList/ReportDetail/AnnouncementManage/AuditLogList/SystemConfig/SensitiveWordsManage/ContentList/ContentDetail`），桌面侧栏形态（`components/Admin/AdminSidebar.jsx`）。

---

## 三、使用场景聚类

频次与时间压力按"学生一天里的真实使用"给出；"支撑能力"指 §2 的域编号。

| # | 场景簇 | 频次 | 时间压力 | 支撑能力 | 对 IA 的硬性含义 |
|---|---|---|---|---|---|
| S01 | **课间/睡前刷一刷**（看今天有什么动静） | 每天多次 | **30 秒内要有结果** | D06 D07 D08 D09 | 首屏内容必须秒出；需要断点续刷（`TreeHole.jsx:25-34,127-140` 已用缓存+预取）；万能墙是"一屏一篇"的独立节奏，不能与瀑布流混在一个列表里 |
| S02 | **饭点前决定吃哪家** | 每天 1–2 次 | **30 秒内** | D10 | "3 次点击到菜品"；随机选餐（`pick-random`）与榜单是决策捷径；`CanteenHome` 现在 5 段纵向堆叠，App 需重排 |
| S03 | **上课/找教室** | 每天多次 | **30 秒内** | D19 + D04 | 必须能在锁屏/通知里看到（课前 30 分钟推送）；课表页需"今天"默认视图 |
| S04 | **看通知、公告、谁回了我** | 每天多次 | **30 秒内** | D04 | 必须一级可达 + 角标；现状 Web 移动端**零入口**（§1.2 事实 2） |
| S05 | **匿名倾诉 / 找共鸣** | 每天多次（峰值深夜） | 无压力，但要即时 | D09（+D08） | 匿名与非匿名是两种产品心智，**混流会破坏万能墙的匿名承诺** |
| S06 | **卖东西 / 找东西** | 每周 | 混合：浏览 30 秒 / 发布 3–5 分钟 | D14 | 私信要能"离开页面继续收"（依赖 D04 的系统推送）；否则用户会直接在详情里给微信，产品价值外流 |
| S07 | **找人帮忙（跑腿）** | 每周～偶发 | 发布 1 分钟内 | D15 | 强"当下"属性；无站内私信，联系方式在详情直给（`errands.js:1-6`）→ App 端要考虑隐私与骚扰成本 |
| S08 | **社团发现与活动报名** | 每周 | 可慢慢填 | D12 | 报名有截止提醒（`activity_deadline_reminder`）→ 与 S04 打通 |
| S09 | **期末/作业找资料** | 每学期高峰（考前 2 周每天多次） | 可慢慢填 | D18 | "找到 + 下载"是主干；"App 内阅读"是增量（§5-Q5） |
| S10 | **选课季查课评** | 每学期 1–2 次 | 可慢慢填 | D17 | 长文阅读 + 结构化评分；低频但对决策权重高 |
| S11 | **新生季看指南** | 一次性（入学前后） | 可慢慢填 | D16 | 清单 checklist（`handbook.js:912-1048`）是"可执行项"，天然属于 App |
| S12 | **记录与自我管理**（待办/日记/课表） | 每天 1 次+ | 可慢慢填 | D19 | 成败在输入体验（键盘、日期/时间选择器、连续记录），不在列表美观 |
| S13 | **商家经营**（改菜品/看评价/投轮播） | 每周 | 可慢慢填 | D11 | 极低频 + 重表单 + 重上传；与"学生随手用"的交互预算冲突 |
| S14 | **内容运营与审核** | 管理员每天 | 可慢慢填 | D21 D13 | 表格/批量操作是桌面形态；手机端只适合"应急处理单条举报" |
| S15 | **举报与维权** | 偶发 | 30 秒内 | D20 | 每个内容详情页都必须有入口（`ReportButton`），且不可埋进二级菜单 |
| S16 | **找路/找店** | 偶发 | 30 秒内 | D10（贴图地图） | 现状是"背景图+贴图"，只读浏览在 App 可行；运营编辑模式（`CanteenArea.jsx:390-412`）不应进 App |

**聚类结论（直接支撑 IA）**：

- **高频且 30 秒内要结果**的只有 5 件事：刷内容（S01/S05）、吃饭（S02/S16）、上课（S03）、看通知（S04）、记录（S12）。这 5 件事之外的全部能力，都不该占用一级导航格。
- **匿名表达（S05）的节奏与信息流（S01）不同**：一个是"一屏一篇、上下翻"，一个是"无限瀑布"。两者共享"内容消费"预算，但**不共享同一个列表**。
- **交易类（S06/S07）的闭环不在本产品内完成**（跑腿明说不做私信，二手私信只靠 4 秒轮询）。这类场景在 App v1 的价值是"发布与发现"，不是"沟通"。
- **运营/商家（S13/S14）与目标用户的一天完全不重叠**，属于"另一款产品"。

---

## 四、IA 候选方案

### 4.1 平台约束（外部事实，含引用）

| 平台 | 约束 | 原文/出处 |
|---|---|---|
| Android（Material 底部导航） | **3–5 个一级目的地**；最多 5；超过 6 应改用抽屉等替代入口 | "Three to five top-level destinations"；"**Use up to five top-level destinations** in a bottom navigation bar"；"Don't. **Avoid using more than five destinations** in bottom navigation as tap targets will be situated too close to one another."；"If your top-level navigation has more than six destinations, provide access to destinations not covered in bottom navigation through alternative locations, such as a navigation drawer." — [Material 底部导航规范](https://m1.material.io/components/bottom-navigation.html)（Material 1 原文，M3 延续该规则：[M3 Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines)；另见 [Android 官方 Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)，该页为客户端渲染，本次未能抓取正文） |
| iOS（HIG Tab Bars） | **3–5 个 Tab**；超过可见数量时最后一个变成 **More**，官方明确这是"糟糕的空间利用" | "In general, **use between three and five tabs on iPhone**. A few more are acceptable on iPad."；"**Avoid having too many tabs**… Although a More tab can display extra tabs, this requires additional taps and is a poor use of space." — [Apple HIG · Tab Bars](https://web.archive.org/web/20201210233914/https://developer.apple.com/design/human-interface-guidelines/ios/bars/tab-bars/)（Apple 官方文档快照；现行页面 [developer.apple.com/…/tab-bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) 为客户端渲染） |
| Android + iOS 共同 | 底部导航**不应用于单一任务视图（如发布/撰写页）**，也不应用于设置页 | "The bottom navigation bar shouldn't be used for: Views focused on a single task, such as an email 'Compose' screen; Views containing user preferences or settings" — [Material 底部导航规范](https://m1.material.io/components/bottom-navigation.html) |
| Android + iOS 共同 | 一级 Tab 之间切换应使用**淡入淡出**，避免横向位移动画 | "Do. Transition between active and inactive views using a cross-fade animation. Don't. **Avoid using lateral motion to transition between views.**" — 同上 |
| Android | 系统返回手势 = 左/右边缘内滑，应用不可遮蔽 | 见 §4.2 现状警示 |

**结论**：**5 格是 Android 与 iOS 的共同上限**，且 3–5 是"推荐区间"。因此候选方案的差异本质是"**第 5 格给谁**"，而不是"能不能更多"。

### 4.2 现状（Web，作为对照基线）

| 项 | 现状 | 证据 |
|---|---|---|
| 一级导航 | 4 格：**广场 / 树洞 / 食堂 / 我的** | `TabBar.jsx:5-10` |
| 路由归属 | `/about`→广场、`/`+`/post*`+`/treehole`→树洞、`/eat`→食堂、`/myzone`→我的 | `TabBar.jsx:13-19` |
| 发布入口 | 树洞 Tab 上悬浮 FAB（管理员显示"公告"角标）；另有 `/publish` 发布中心 | `Layout.jsx:185-213`；`PublishCenter.jsx:16-20`（只有 3 项：发树洞/发二手/发跑腿） |
| Tab 切换动效 | 4 个 Tab 页面常驻 + **横向 translateX 滑动**（非手势，`touch-action:none`） | `Layout.jsx:141-162`；`Layout.css:106` |
| 无入口的能力 | **信箱**（TopBar 是死代码）、**万能墙**、**学习资料** | §1.2 事实 2/3 |
| 桌面端 | 完全不同的壳（顶栏 + 侧栏 + 侧边栏小部件） | `components/shell/SiteShellRoute.jsx`、`SiteHeader.jsx:45-52`、`PersonalAside.jsx:54-89` |

**警示**：`Layout.jsx:141-162` 的横向滑动过渡与 Material"避免横向位移动画"的规范相冲突；新 App 应改为淡入淡出（Android 用 M3 NavigationBar 自带过渡，iOS 用 TabView 默认）。另外，**不要用横向滑动手势切换 Tab**——Android 左右边缘内滑是系统返回手势，iOS 左边缘内滑是返回手势，两者都不可遮蔽。

### 4.3 三套候选方案

**方案 A：现状延续（四格 + 发布 FAB）**

| 项 | 内容 |
|---|---|
| Tab | 广场 / 树洞 / 食堂 / 我的（4 格） |
| 发布入口 | 树洞 Tab 悬浮 FAB + 全局"发布中心"（从 我的 与 广场 可达） |
| 低频收纳 | 广场的"模块入口区"（社团/一站通/帮帮我/出物/万能墙/资料/课评/活动）+ 我的的"工具区"（课表/待办/日记/收藏/通知） |
| 代价 | 只用了上限的一半；**信箱仍然不是一级**，而通知是每天多次的场景（S04）；"广场"要承担过多入口，容易变成"什么都塞"的目录页；与 Web 现状几乎一样，等于放弃了"从零重做"的机会 |
| 迁移成本 | 最低 |

**方案 B：五格（内容四格 + 信箱）+ 发布常驻 FAB —— 推荐**

| 项 | 内容 |
|---|---|
| Tab | 广场 / 树洞 / 食堂 / **信箱** / 我的（5 格，恰好用满且不越界） |
| 发布入口 | **不做 Tab**（依据 §4.1：底部导航不用于单一任务视图）：① 树洞页常驻 FAB（保留现状心智，管理员显示"公告"）；② 全局"发布中心"从 我的 与 广场 入口进入，覆盖 树洞/二手/跑腿/万能墙/社团帖/活动/课评/指南投稿 |
| 低频收纳 | 三层：① 一级 5 格只放最高频；② "广场"承担**发现类模块入口**（热搜/校园此刻/社团/一站通/课评/资料/万能墙，用九宫格 + 卡片，正好复用后端 `home-summary` 的 `hot_*` 数据）；③ "我的"承担**个人事务与低频**（课表/待办/日记/收藏/我的帖子/我的点评/设置/商家与管理入口，按角色显示） |
| 代价 | ① "树洞"与"万能墙"仍分属两个 Tab 体系之外，需要明确的入口纪律；② 5 格在 iPhone SE 级小屏上文字标签略挤，需图标优先 + 4–5 格时"仅激活项显示文字"（Material 规范原文亦如此）；③ 新 App 的一级结构与 Web 不同，双端维护两套导航心智 |
| 迁移成本 | 中（Tab 归属变更，页面本身不用重写） |

**方案 C：任务型五格（逛 / 吃 / 用 / 消息 / 我）+ 中央发布**

| 项 | 内容 |
|---|---|
| Tab | **逛**（广场+热搜+校园此刻+树洞+万能墙 聚合信息流）/ **吃** / **用**（课表/待办/资料/日记/指南）/ **消息**（信箱）/ **我** |
| 发布入口 | 中央发布格（第 3 格）或常驻 FAB |
| 低频收纳 | "用"格收纳所有工具；"逛"格用内容类型切换（树洞/热搜/校园/万能墙）而不是一级 Tab |
| 代价 | ① **把匿名（万能墙）与实名（树洞）放进同一个"逛"**，与 D09 的匿名不变量心智冲突；② "逛"格要同时承载瀑布流与一屏一篇翻页两种交互，实现复杂度最高；③ 用户原有"树洞=首页"的习惯被打破（`TabBar.jsx:16` 现状把 `/`+`/post*` 都归到树洞）；④ 与 Web 结构差异最大，双端认知成本最高 |
| 收益 | 唯一真正解决"低频功能收纳"的方案——按"任务"而非"内容来源"切分 |
| 迁移成本 | 高 |

### 4.4 对比与推荐

| 判据 | A | **B（推荐）** | C |
|---|---|---|---|
| 覆盖 S01–S04 高频场景（含通知一级） | 差（信箱非一级） | **好** | 好 |
| 尊重万能墙的匿名心智 | 中 | **好**（独立入口，不混流） | 差（与树洞混流） |
| 发布入口符合平台规范 | 好 | **好** | 中（中央格占用一级名额） |
| 与现状（Web/用户习惯）的连续性 | 最高 | **高** | 低 |
| 低频功能（资料/指南/课评/工具）有明确归宿 | 中（全靠广场目录页） | **好**（广场发现区 + 我的工具区） | 好 |
| 双端（Android/iOS 各自最优）适配难度 | 低 | **中** | 高 |

**推荐：方案 B**，理由三条（每条都能落到证据）：

1. **第 5 格给"信箱"而不是"发布/万能墙"，是频次与场景决定的**。通知是每天多次、30 秒内要结果的场景（S04），且现状 Web 移动端**完全无入口**（`Layout.jsx:170` + `TopBar.jsx` 死代码）；而发布是偶发～每周场景，且平台规范明确"底栏不用于单一任务视图"（§4.1）。
2. **万能墙不进一级、但必须有稳定入口**。它的匿名承诺（`confessions.js:6-10`）与"一屏一篇"节奏（`ConfessionPager.jsx:25`）决定了它既不能与瀑布流混流（排除 A/C 的做法），也不能继续当孤岛（现状问题）。放在"广场"发现区的固定位置 + 独立页面，是唯一同时满足两条约束的解。
3. **后端聚合能力已经支持"广场=发现页"**。`GET /api/square/home-summary` 已返回 `hot_treeholes / hot_topics / hot_activities / campus_highlights / quick_stats`（`services/squareHomeService.js:199-210`），而 Web 只用了其中一小部分（7 个首页组件是死代码，§1.2-C7）。App 的广场页应直接消费这份聚合，做成"发现九宫格 + 热搜/活动/校园卡片"。

**给方案 B 的三条落地纪律**：

1. Tab 过渡用**淡入淡出**，禁止横向位移与横向滑动手势（§4.1）。
2. 一级 5 格之外的所有能力，只能落在两个"收纳器"里：广场的**发现区**（内容/社区类）与我的的**工具区**（个人事务类 + 角色化入口）。**禁止新增第三个收纳器**，也禁止把低频功能塞到顶栏图标堆里。
3. 发布相关表单统一走"发布中心 → 具体表单"，表单**以模态/全屏推入**呈现，不改变 Tab 状态。

---

## 五、必须由所有者拍板的问题清单

每项给出：问题 / 事实 / 建议 / 理由 / 影响面。

| # | 问题 | 事实（证据） | 我的建议 | 理由与影响面 |
|---|---|---|---|---|
| Q1 | **管理后台是否进 App v1？** | 29 端点（`admin.js`）、11 页面、桌面侧栏形态；内容审核按模块分（`:1263-1414`） | **不进**。仅保留"举报应急处理"的单条链路（列表 + 处理 + 封禁），且以隐藏入口给管理员 | 表格/批量/审计日志是桌面形态，手机复刻成本极高；S14 与目标用户的一天不重叠。影响：可省掉 11 页 + 复杂的权限 UI |
| Q2 | **商家端是否进 App v1？** | 14 端点 + 7 页面 + 图片上传（`canteen.js:882-1327`）；商家注册需邀请码（`auth.js:254`） | **不进 v1**，v1.1 再评估；若必须进，只做"改菜品价格/上下架 + 看新评价"两条最小链路 | 商家是少数用户，但带来最重的表单与上传；S13 与学生高频场景冲突。影响：v1 可少 7 页，且不用处理角色化导航 |
| Q3 | **匿名内容（树洞 / 万能墙）是否合并？** | **前提需更正**：树洞**非匿名**（`posts.js:130-135`）；万能墙**强制匿名**（`confessions.js:6-10`），且有 3 种版式与 1–10 条窗口翻页（`:31-33`） | **不合并**。二者是两种产品：树洞=可搜索、有标签、有作者的社区信息流；万能墙=不可搜索、无作者、一屏一篇的情绪墙。**但两者都不该"实名化"**——若产品意图是"树洞也匿名"，那是后端必须改的事实性变更（`posts.js` 需引入匿名投影），不是 App 设计能补的 | 合并会同时破坏万能墙的匿名承诺与树洞的社区结构（标签/搜索依赖作者与帖子关系）。影响：D08、D09 各自独立设计；若所有者确认树洞应匿名，需要先立后端改造需求 |
| Q4 | **地图类功能是否进 App？** | 不是真地图：`CanteenArea.jsx:6,282-412` 与 `AboutUs.jsx:373-414` 是"背景图 + 可拖拽贴图"，含运营编辑模式（拖拽贴图 + 复制配置） | **只读贴图地图可进 v1（低优先级）；运营编辑模式不进**。若要升级为可交互地图（搜索/导航/定位），需单独立项，因当前无任何地理坐标数据 | 现状没有经纬度、没有 POI 数据，做成地图等于新建数据模型；作为"看图找店"的只读页面成本很低。影响：D10 的一个二级页面 |
| Q5 | **学习资料是否需要 App 内阅读？** | 已有 `MarkdownViewer`（react-markdown + TOC）与 `PdfViewer`（iframe 内联，不用 pdf.js，失败降级仅下载，见 `PdfViewer.jsx:1-18`）；单文件 20 MiB 上限（`shared/constants/materials.js:65`） | **v1 只做"Markdown 内阅读 + 全部格式一键下载/系统分享"；PDF 内阅读作为 v1.1**（iOS 用 Quick Look / PDFKit，Android 用系统 PDF 组件或 PdfRenderer） | 资料是 GitHub 公开仓库 + CDN 直连（`materials.js:1-12`），文件字节不经我方服务器；Web 端受"不暴露源仓库地址"约束（`PdfViewer.jsx:12-16`），App 端反而可以用原生预览器绕开。影响：D18 的重交互预算 |
| Q6 | **二手私信是否要在 v1 做实时化？** | 现状 **无 WebSocket/SSE**，`MarketplaceChat.jsx:34` 每 4 秒轮询 | **v1 不必做实时**，但必须做**离线可达**：依赖 APNs/FCM 推送"收到新消息"，页面内继续轮询即可。若不做推送，建议直接把私信降级为"留联系方式"（照抄跑腿的做法） | 实时化需要长连接服务 + 移动端后台策略，是独立工程量；没有推送的私信 = 用户看不到，价值为负。影响：D04 与 D14 的耦合，是 v1 的关键路径 |
| Q7 | **热搜 / 校园此刻 / 树洞是否合并为一条"广场"流？** | 三套独立表与端点：`trending_*`（`square.js:180-559`）、`campus_*`（`:576-891`）、`posts/comments`（`posts.js`）；后端的 `home-summary` 已把它们聚合为一个摘要对象 | **不合并数据流，但合并呈现位**：广场页用"分区卡片 + 类型切换"呈现三种内容（各自保留分页/排序语义），不要做单条混排时间线 | 三者内容资格、通知类型、经验规则都不同（`notificationService.js:11-50`），混排会让排序规则与已读状态难以解释。影响：D05/D06/D07 的页面结构 |
| Q8 | **课表导入在 App 里怎么做？** | 后端只接受**纯文本**（`schedule.js:32-38`：`text` 且 ≥10 字符），解析器在服务端（`utils/scheduleParser.js`）；来源是教务 HTML 课程表 | **保留"粘贴文本"作为兜底**，但 App 端优先做：① 从浏览器/剪贴板一键导入；② 未来做"图片/HTML 文件解析"（后端解析器已存在，可扩展输入） | 现状要求用户复制教务网页文本，移动端体验脆弱（切应用、复制不全）。影响：D19 的输入链路；若要做 HTML 文件导入，需要后端加一个"文件 → 文本"的预处理端点（本次不属 App 设计范围，需另立需求） |
| Q9 | **通知 / 公告 / 推送是否统一为一套？** | 三套并行：① App 内弹窗（`Layout.jsx:214-253` 未读公告聚合弹窗）；② 信箱列表（`notifications.js:156`，3 分类）；③ Web Push（`push.js`） | **统一为"信箱是唯一真相 + 角标 + 系统推送"三层**：App 内不再做阻塞式公告弹窗（改为信箱置顶 + 角标），系统推送只推"需要立刻知道"的（私信、接单、报名截止、课前提醒） | 现状的公告弹窗会打断任意页面（含发布表单），在 App 里属于强打断，应降级。影响：D04 的交互形态与所有"到达率"指标 |
| Q10 | **中英双语是否继续？** | `LanguageContext` + 页面内 `isZh` 三元表达式遍布（如 `TabBar.jsx:6-9`、`MyZone.jsx:36-58`）；后端也返回 `labelZh/labelEn`（如 `constants/confessionTemplates.js`） | **继续双语，但改为"文案表集中管理"**，不再在页面里写三元表达式；新 App 的文案层应与 `shared/constants` 的 zh/en 双字段对齐 | 现状双语已存在且用户是国际生源（XMUM），砍掉会丢用户；但散落在 103 个页面里的三元表达式是维护债。影响：所有页面的文案层设计 |
| Q11 | **社团（clubs）与组织（organizations）是否合并？** | 两套并行系统：`clubs.js` 31 端点（用户侧社团/活动）；`organizations.js` 9 端点（运营侧组织 + 权限等级 `can_post`，`organizations.js:24-27,49`）；广场运营台把它们放在同一个 tab 组（`SquareOrgAdmin.jsx:59-70`） | **数据不合，UI 分角色**：学生侧只出现"社团"；"组织"只作为运营/发布权限的载体（如发公告、投轮播）出现在有权限的用户界面里 | 合并会牵动成员/权限/内容归属三张表；分角色呈现即可覆盖现有用法。影响：D12/D13 的入口位置 |
| Q12 | **推送通道从 Web Push 迁到 APNs/FCM 的范围与归属？** | 现状：VAPID（`push.js:15,27`）+ 课前提醒定时任务（`services/classReminderPush.js`，`server.js:231-240`） | **v1 必做，且必须先做**：它是私信（Q6）、接单、报名截止（S08）、课前提醒（S03）的共同前置。需要后端新增设备 token 表与推送服务 | 这是"App 化"的核心增量，也是唯一无法靠前端设计绕开的后端工程。影响：D04 + 全部依赖通知的场景 |
| Q13 | **广告/轮播是否进 App？** | 有完整投放链路（`advertisements.js` 7 端点 + CTA 6 种 + 点击统计 `:182`）与运营面板（`shared/components/AdvertisementAdminPanel.jsx`）；广场/食堂各有轮播位 | **展示侧进 v1**（广场/食堂轮播 + 点击上报），**投放管理不进** | 展示侧成本极低且是现有收入/运营位；管理侧属 S14。影响：D05/D11 的边界 |
| Q14 | **日记 / 待办是否进 v1（低频但粘性）？** | 日记 4 端点（`diary.js`，一天一篇）、待办 6 端点（`todos.js`，含优先级与截止）；MyZone 已有"当前课 + Todo 预览"卡片（`MyZone.jsx:293-309`） | **进 v1，但只做"记录 + 今天视图"**：日记（写今天 / 翻历史月历）、待办（今天 + 勾选 + 截止），不做提醒/重复任务等高级特性 | 它们是"我的"页的留存锚点（每天打开一次的理由），且后端已完备；但它们的价值来自输入体验而非功能数量。影响：D19 的范围与"我的"页的工具区 |

---

## 六、能力 ↔ 交互原型映射

目的：为后续"**新需求先扩原型库，不许单页自造样式**"提供可执行的纪律。原型库不是审美分类，而是"渲染骨架 + 交互契约"的分类。

### 6.1 原型库（8 核心 + 9 扩展）

| 原型 | 骨架定义 | 交互契约（必须能力） |
|---|---|---|
| **P1 信息流 Feed** | 单列卡片流 / 双列瀑布流，无限加载 | 下拉刷新、分页预取、滚动位置恢复、图片懒加载/缩略图、卡片点赞/评论就地更新 |
| **P2 列表 List** | 单列等宽行 + 可选 tab/筛选头 | 分页或无限加载、空态/错误态/骨架、筛选持久化 |
| **P3 详情 Detail** | 头图/标题 + 正文 + 互动条 + 评论区 | 返回、举报、点赞/收藏、评论分页与嵌套、作者信息（可匿名投影） |
| **P4 表单/发布 Form** | 分节表单，可带媒体选择与草稿 | 校验、错误定位、媒体多选与压缩上传、离开确认、提交后跳转语义 |
| **P5 对话 Chat** | 气泡列表 + 输入条 | 发送、已读回执、轮询/推送更新、键盘避让、图片消息 |
| **P6 翻页 Pager** | 一屏一篇，纵向吸附翻页 | 上下翻页、边界回弹、预取、位置指示（第 n / 共 m）、手势可访问性 |
| **P7 仪表盘 Dashboard** | 摘要卡 + 统计块 + 快捷入口网格 + 区块列表 | 分区加载、按角色显示/隐藏入口、下拉刷新 |
| **P8 后台表格 Table/CRUD** | 过滤栏 + 数据表 + 行操作 + 详情抽屉 | 批量选择、分页、行内状态切换、危险操作二次确认 |
| **P9 榜单 Ranking** | 名次 + 主体 + 指标 + 涨跌 | 榜单类型切换、周期说明、空态 |
| **P10 阅读器 Reader** | 文档渲染 + 目录/页码 + 操作条 | 字体/缩放（图片）、目录跳转、下载/分享、失败降级 |
| **P11 课表网格 Timetable** | 星期 × 节次网格 + 周切换 | 周切换、今天高亮、课程卡点击、导入入口 |
| **P12 地图贴图 Map** | 底图 + 贴图热点 + 说明 | 缩放/拖拽、热点点击、只读（编辑模式不入 App） |
| **P13 日历/时间轴 Calendar** | 月历/时间轴 + 当日详情 | 日期选择、有内容日期标记、跳转今天 |
| **P14 检索 Search** | 搜索框 + 历史/建议 + 结果列表 | 防抖、结果分组、空结果引导、关键词高亮 |
| **P15 鉴权 Auth** | 品牌头 + 表单卡 + 次要动作 | 字段校验、验证码倒计时、错误提示、条款链接 |
| **P16 静态说明 Static** | 标题 + 富文本/列表 | 无交互（仅滚动与链接） |
| **P17 转发 Redirect** | 无 UI，直接渲染子页面 | 无（技术债：应合并到目标页） |

### 6.2 页面归属与占比（103 页）

| 原型 | 覆盖页面数 | 占比 | 代表页面 |
|---|---|---|---|
| P4 表单/发布 | 21 | 20.4% | `PostNew` `ConfessionCompose` `MarketplacePublish` `HandbookEditor` `MaterialsUpload` `PublishCenter` |
| P2 列表 | 18 | 17.5% | `MarketplaceHome` `Mailbox` `TodoList` `SquareTrendingList` `MyPosts` |
| P3 详情 | 16 | 15.5% | `PostDetail` `FoodDetail` `ClubProfile` `ActivityDetail` `MarketplaceDetail` |
| P8 后台表格 | 9 | 8.7% | `UserList` `ReportList` `ContentList` `FoodManage` `SquareOrgAdmin` |
| P16 静态说明 | 7 | 6.8% | `PrivacyPolicy` `TermsOfService` `Disclaimer` `AboutProfile` |
| P1 信息流 | 5 | 4.9% | `TreeHole` `PostTagFeed` `SquareCampusFeed` `ClubsHome` `HandbookHome` |
| P7 仪表盘 | 5 | 4.9% | `MyZone` `UserZone` `SquareHome` `CanteenHome` `AdminDashboard` |
| P17 转发包装 | 4 | 3.9% | `SquareClub` `SquareErrands` `SquareFreshmanGuide` `SquareSecondHand` |
| P9 榜单 | 3 | 2.9% | `Rankings` `FoodShopHot` `AreaProductRanking` |
| P14 检索 | 3 | 2.9% | `CanteenSearch` `PostSearch` `MaterialsHome` |
| P15 鉴权 | 3 | 2.9% | `Login` `Register` `ResetPassword` |
| P10 阅读器 | 2 | 1.9% | `HandbookArticleDetail` `MaterialDetail` |
| P12 地图贴图 | 2 | 1.9% | `AboutUs` `CanteenArea` |
| P13 日历 | 2 | 1.9% | `Diary` `Holidays` |
| P5 对话 | 1 | 1.0% | `MarketplaceChat` |
| P6 翻页 | 1 | 1.0% | `ConfessionWall` |
| P11 课表网格 | 1 | 1.0% | `Schedule` |
| **合计** | **103** | **100%** | — |

**核心 8 原型（P1–P8）覆盖 76 页 / 73.8%；扩展 9 原型（P9–P17）覆盖 27 页 / 26.2%。**

### 6.3 能力域 → 原型（跨域复用关系）

| 域 | 用到的原型 | 说明 |
|---|---|---|
| D01 认证 | P15 | 3 页同构 |
| D02 资料/空间 | P7 + P2 + P3 | `UserZone`=P7，`MyPosts/MyReviews`=P2 |
| D03 等级 | 跨域组件 | 只出现在 P3/P7 内部（Badge/进度条/弹层），无独立页面 |
| D04 信箱 | P2 + 弹层 | 通知列表=P2；公告弹窗在 App 应改为 P2 置顶（§5-Q9） |
| D05 广场 | P7 + 轮播组件 | 首页=发现型 P7（摘要卡+入口网格） |
| D06 热搜 | P2 + P1 + P3 + P4 | 列表/话题流/帖详情/发帖 |
| D07 校园此刻 | P1 + P3 + P4 | — |
| D08 树洞 | P1 + P3 + P4 + P14 | 瀑布流是 P1 的变体 |
| D09 万能墙 | **P6** + P4 + P3(评论面板) | 全站唯一 P6 用点 |
| D10 食堂 | P2 + P3 + P4 + P9 + P14 + P12 + P7 | 原型最密集的域（7 种） |
| D11 商家端 | P8 + P4 + P2 | 与后台同构 |
| D12 社团 | P1 + P2 + P3 + P4 | — |
| D13 组织 | P8 | 与 D21 同构 |
| D14 二手 | P2 + P3 + P4 + **P5** | 全站唯一 P5 用点 |
| D15 跑腿 | P2 + P3 + P4 | — |
| D16 指南 | P1 + P2 + P3 + P4 + **P10** | — |
| D17 课评 | P2 + P3 + P4 | — |
| D18 资料 | P14 + P2 + **P10** + P4 | 阅读器由 kind 分派（`EXT_KIND`，`shared/constants/materials.js:90-108`） |
| D19 效率 | **P11** + P2 + **P13** + P4 | 课表网格全站唯一用点 |
| D20 举报 | 跨域组件（P4 变体/弹层） | 必须在 P3 内可达 |
| D21 管理后台 | P8 + P7 | — |

### 6.4 现状差距（为什么必须立这条纪律）

| 事实 | 证据 | 结论 |
|---|---|---|
| 现成模板只有 9 个，且使用率极低 | `components/templates/`：`ListPageLayout` 被 **5** 页使用、`DetailPageLayout` **1** 页、`DashboardPageLayout` **1** 页、`AdminPageLayout` **2** 页、`FormPageLayout` **0** 页 | Web 的"原型层"名义存在、实际未落地 |
| 同构页面大多自造样式 | `PostCard` 被 4 页复用（`MyPosts/PostSearch/PostTagFeed`+`PostCard`），但另一批帖子类页面各写各的（`SquareCampusFeed`、`ConfessionWall`、`ClubPostDetail` 等） | 同一原型在不同域被重复手写 |
| 同一能力两套组件 | 校园/热搜各有自己的图片表与卡片；`square/` 下 11 个组件 7 个是死代码 | 原型不统一 → 组件无法回收 |
| 存在 4 个纯转发页 | `SquareClub/SquareErrands/SquareFreshmanGuide/SquareSecondHand.jsx` 各 7 行 | P17 应被消灭（直接路由到目标页） |

**建议落地的纪律（供 IA/设计宪法采用）**：

1. **原型库 = 8 核心 + 9 扩展**，每个新需求必须先声明它属于哪个原型；不属于任何一个时，先评审"是否新增原型"，而不是先写页面。
2. **P4（表单）与 P2（列表）是两个最大的桶（合计 37.9%）**，应优先做成参数化框架（字段描述符 + 校验规则 + 提交语义），收益最高。
3. **P6（万能墙）与 P5（二手私信）虽然各只有 1 页，但交互契约特殊，必须单独立原型**，不允许被"塞进 P1/P2"降级实现。
4. **P17 禁止新增**；现存 4 个应删除。
5. P10（阅读器）在 App 端要按平台分派（iOS Quick Look、Android 系统组件），共用同一份"kind → 渲染器"映射表（`shared/constants/materials.js:90-108`）。

---

## 附录 A：端点分布（按文件，273 个）

| 文件 | 端点数 | 主要能力 |
|---|---|---|
| `routes/canteen.js` | 40 | 食堂四级 + 点评 + 收藏 + 5 类排行榜 + 搜索 + 随机 + 文章 + 轮播 + 商家管理 |
| `routes/handbook.js` | 36 | 新生指南文章/标签/评论/清单 + 课程评价 + 图片上传 |
| `routes/clubs.js` | 31 | 社团 + 活动 + 报名 + 帖子 + 评论 + 关注点赞 |
| `routes/admin.js` | 29 | 管理后台全部 |
| `routes/square.js` | 26 | 热搜 + 校园此刻 + 首页摘要 + 推荐 + 轮播 |
| `routes/marketplace.js` | 15 | 二手 + 私信 |
| `routes/materials.js` | 15 | 学习资料（含 GitHub 上传流水线） |
| `routes/posts.js` | 15 | 树洞（帖子/标签/评论/点赞） |
| `routes/notifications.js` | 6 | 通知/未读/公告 |
| `routes/users.js` | 6 | 资料/空间/等级/头像/注销 |
| `routes/todos.js` | 6 | 待办 |
| `routes/errands.js` | 6 | 跑腿 |
| `routes/auth.js` | 5 | 注册/登录/验证码/重置 |
| `routes/diary.js` | 4 | 日记 |
| `routes/push.js` | 4 | Web Push |
| `routes/confessions.js` | 9 | 万能墙 |
| `routes/organizations.js` | 9 | 组织与成员权限 |
| `routes/advertisements.js` | 7 | 内容型广告投放 |
| `routes/schedule.js` | 3 | 课表导入/查询 |
| `routes/reports.js` | 1 | 举报 |
| **合计** | **273** | — |

## 附录 B：103 个页面 → 原型归属（原始数据）

| 原型 | 页面 |
|---|---|
| P1 信息流（5） | TreeHole, PostTagFeed, SquareCampusFeed, ClubsHome(Clubs/), HandbookHome(Handbook/) |
| P2 列表（18） | ClubListPage, ClubMembersPage, MyClubs（Clubs/）；ErrandsHome（Errands/）；FoodList, CourseReviewPage(Handbook/), HandbookMe(Handbook/), Mailbox, MarketplaceHome(Marketplace/), MarketplaceMyWants(Marketplace/), MaterialsCourse(Materials/), MaterialsMine(Materials/), MerchantList, MyPosts, MyReviews, SquareTrendingList, TodoList, Settings |
| P3 详情（16） | ActivityDetail, ClubPostDetail, ClubProfile（Clubs/）；ErrandDetail（Errands/）；FoodDetail, CourseReviewDetail(Handbook/), MarketplaceDetail(Marketplace/), PostDetail, SquareCampusPostDetail, SquareTrendingDetail, SquareTrendingPostDetail, MerchantFoodDetail, AdvertisementDetail, Admin/ContentDetail, Admin/ReportDetail, Admin/UserDetail |
| P4 表单（21） | CreateClub, PublishActivity, PublishClubPost（Clubs/）；ConfessionCompose, PublishErrand（Errands/）, FoodCreate, FoodReviewPublish, CourseReviewCreate(Handbook/), HandbookEditor(Handbook/), MarketplacePublish(Marketplace/), PostNew, SquareCampusPostNew, SquareTrendingPostNew, ProfileEdit, StoreCreate, MerchantShopEdit, CanteenShopManage, CanteenBannerManage, Admin/SystemConfig, MaterialsUpload(Materials/), PublishCenter |
| P5 对话（1） | MarketplaceChat（Marketplace/） |
| P6 翻页（1） | ConfessionWall |
| P7 仪表盘（5） | MyZone, UserZone, SquareHome, CanteenHome, Admin/AdminDashboard |
| P8 后台表格（9） | Admin/AnnouncementManage, Admin/AuditLogList, Admin/ContentList, Admin/ReportList, Admin/SensitiveWordsManage, Admin/UserList, FoodManage, Materials/AdminMaterials, SquareOrgAdmin |
| P9 榜单（3） | Rankings, FoodShopHot, AreaProductRanking |
| P10 阅读器（2） | Handbook/HandbookArticleDetail, Materials/MaterialDetail |
| P11 课表（1） | Schedule |
| P12 地图贴图（2） | AboutUs, CanteenArea |
| P13 日历（2） | Diary, Holidays |
| P14 检索（3） | CanteenSearch, PostSearch, Materials/MaterialsHome |
| P15 鉴权（3） | Login, Register, ResetPassword |
| P16 静态说明（7） | AboutAlgorithm, AboutLevelAlgorithm, AboutProfile, Disclaimer, JoinUs, PrivacyPolicy, TermsOfService |
| P17 转发（4） | SquareClub, SquareErrands, SquareFreshmanGuide, SquareSecondHand |

> 归类方法：按页面的主渲染骨架与主交互（页面名 + `layoutRoutes.jsx:103-198` 的路由形态 + 抽样阅读源码）判定；一个页面只归一个原型。**此表是纪律的基准线，不是审美评价。**

## 附录 C：外部事实来源（平台约束）

| 事实 | 出处 |
|---|---|
| Material 底部导航：3–5 个一级目的地；最多 5；超过 5 个点击目标过密；超过 6 个应提供抽屉等替代入口；不用于单一任务视图（如发布页）与设置页；一级切换应用淡入淡出、避免横向位移 | [Material Design · Bottom navigation](https://m1.material.io/components/bottom-navigation.html)（正文已抓取核验） |
| Material 3 的对应组件（Navigation bar）与同一 3–5 规则 | [M3 Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines)、[Android · Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)（两页均为客户端渲染，本次仅能确认标题与来源，正文未抓取） |
| iOS：一般使用 3–5 个 Tab；Tab 过多会缩小点击区并增加复杂度，More 需要额外点击且"空间利用很差"；Tab 栏只用于导航、不用于动作 | [Apple HIG · Tab Bars](https://web.archive.org/web/20201210233914/https://developer.apple.com/design/human-interface-guidelines/ios/bars/tab-bars/)（官方文档快照，正文已抓取核验；现行地址 [developer.apple.com/…/tab-bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)） |
| Android 左右边缘内滑 = 系统返回，应用不可遮蔽；iOS 左边缘内滑 = 返回 | 平台既定行为；本次未取得可引用的官方原文，已在 §4.2 标注为"设计警示"而非规范引用 |

---

## 附录 D：本报告的结论清单（供 IA 决议直接引用）

1. 能力面共 **21 个域、273 个端点、103 个页面**；其中与"学生一天"直接相关的是 15 个域，管理后台/商家端是"另一款产品"（§2、§3）。
2. 高频且 30 秒内要结果的只有 5 件事：刷内容、吃饭、上课、看通知、记录（§3）。
3. 匿名能力**只有万能墙**；树洞是实名信息流（§1.2-C1）。
4. 信箱、万能墙、学习资料在 Web 移动端**都没有入口**（§1.2 事实 2/3）→ 这三者的入口归属是 IA 必须解决的问题。
5. **推荐方案 B：广场 / 树洞 / 食堂 / 信箱 / 我的（5 格）+ 发布常驻 FAB**；发布不做一级 Tab 有平台规范依据（§4.3/§4.4）。
6. 一级 5 格之外只允许两个收纳器：广场的**发现区**、我的的**工具区**（§4.4 纪律 2）。
7. **14 个问题需所有者拍板**，其中 Q12（推送通道迁移）是唯一"必须先做、且无法用前端设计绕开"的工程项（§5）。
8. 原型库建议为 **8 核心 + 9 扩展**，覆盖 103 页 100%；表单与列表合计 37.9%，应优先框架化（§6）。
