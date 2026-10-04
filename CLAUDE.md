# XMUMDorm Agent-Native Project

## Project Identity

- **Name**: XMUMDorm (厦马小筑 / Jack Dorm)
- **Type**: Monorepo — Express Backend + React Web（App 客户端已全盘废弃，待从零重建）
- **Primary Directive**: Spec-Driven, Agent-Native, Documentation-Driven Development
- **Version**: V3.0

## Core Principles

1. **Read docs first, write code second** — Every feature starts with a document
2. **Agent-Native** — Documentation is the communication protocol between agents (PM → Architect → Task → Dev → QA → DevOps)
3. **Constitution governs all** — `docs/00-Constitution/` has final authority on technical decisions
4. **Write docs after code** — Every implementation produces an implementation record
5. **Test everything critical** — New routes require tests (see `docs/00-Constitution/测试铁律.md`)
6. **Migration-only schema changes** — Never ALTER TABLE manually (see `docs/00-Constitution/数据库变更铁律.md`)

## Agent Workflow (10-Stage Lifecycle)

```
Idea → Constitution → Requirements → Clarify → Architecture → Modules → Tasks → Analysis → Implementation → Test → Deploy
```

See `docs/README.md` for the full documentation structure.

## When Working on This Project

1. **Read** relevant docs in `docs/` first
2. **Follow** rules in `.claude/rules/`
3. **Use** skills in `.claude/skills/` for common workflows
4. **Reference** agent definitions in `.claude/agents/` for role boundaries
5. **Apply** document templates from `.claude/templates/`
6. **协作前先读** [`docs/team/`](./docs/team/README.md) 的四份手册：**团队协作契约**（规则）、**本地开发环境手册**（怎么跑起来）、**协助者 Agent 守则**（AI 的写作用域/验证门槛/汇报格式/停机条件）、**Git 协作手册**（具体命令与事故处置）

## Quick Reference

### Backend
- **Entry**: `server.js`
- **Routes** (20 modules, 273 endpoints): `admin`, `advertisements`, `auth`, `canteen`, `clubs`, `confessions`, `diary`, `errands`, `handbook`, `marketplace`, `materials`, `notifications`, `organizations`, `posts`, `push`, `reports`, `schedule`, `square`, `todos`, `users`
- **Middleware** (6): `adminAuth`, `auth`, `checkSanction`, `materialUpload`, `sensitiveWordFilter`, `upload`
- **Services** (16): `objectStorage`, `auditLog`, `expService`, `notificationService`, `pushSend`, `squareHomeService`, `squareRecommendationService`, `imageProcessing`, `email`, `githubMaterials`, `materialValidation`, `materialErrors`, `courseCatalog`, `rankingStats`, `advertisementTarget`, `classReminderPush`
- **Database**: `database.js` (MySQL pool), `init-db.sql`, `migrations/` (73 files)

### Frontend Web
- **Tech**: React 19 + Vite + React Router 7 + TanStack Query, Tailwind 4
- **Pages**: `frontend/src/pages/` (103 `.jsx`)
- **Components**: `frontend/src/components/` (124 `.jsx`)
- **Shared logic**: 根目录 `shared/`（23 个 API 模块 + 常量/工具/query，Web 与客户端共用）
- **Styles**: `frontend/src/styles/tokens.css`（265 个设计令牌；**Web 为纯亮色，无暗色模式**）
- **Context**: `frontend/src/context/`（Auth、Toast、Language）
- **注意**: `frontend/src/api/` 是**空目录**（0 文件），API 封装已收口到 `shared/api/`

### App 客户端
- **状态**: 全盘废弃并从工作区移除 —— 旧 Expo RN 端（`mobile/`）与旧 Capacitor 端（`frontend-app/` + `android/` + `ios/` + `capacitor.config.ts`）均已删除，归档于 git tag `app-legacy-v1`
- **设计哲学 / 设计宪法 / 前端风格**: **已从零重写** —— 旧版全部作废（归档 tag `app-legacy-v1`）。新产出：
  - [App 设计哲学提案](./docs/app/design/App设计哲学提案.md)（v1.2；方向已由所有者指定）
  - [App 前端风格体系](./docs/app/design/App前端风格体系.md)（v1.3）
  - [App 页面骨架与布局规范](./docs/app/design/App页面骨架与布局规范.md)（**五格骨架 / 二级顶部 Tab / 安全区 / 冻结边界**）
  - [App 设计令牌规范](./docs/app/design/App设计令牌规范.md)（**令牌清单**：逐令牌实测对比度与角色）
  - [App 品牌主色提案](./docs/app/design/App品牌主色提案.md)（色阶准入过程的历史记录；**色相已定案**，见下）
  - [App 设计宪法](./docs/app/constitution/App设计宪法.md)（**v1.4 · 已批准（2026-10-02）**，17 条）
  - 调研在 [`docs/app/research/`](./docs/app/research/)：设计调研 00–06、[基座调研](./docs/app/research/App基座调研-Expo与原生iOS混编.md)、[组件层调研](./docs/app/research/App组件层调研-现成组件库评估.md)、[图标方案](./docs/app/research/App图标方案-Lucide与平台图标.md)、[实时私聊](./docs/app/research/App实时私聊调研-技术难度与服务器开销.md)
  - **两个跨层登记册**：[待确认问题 TO-CONFIRM](./docs/app/TO-CONFIRM.md)（**唯一入口**，固定承接所有者待拍板事项）、[TODO](./docs/app/TODO.md)（我们的待办：拼车/问答 等）
- **已定方向**: 真原生 App；**以 React Native 为主，iOS 可混原生**；**Android 优先**；双端并重、各自最优（不追求 1:1）。设计语言 = **苹果的舒适感（质感标准）+ Discord 的社区感 + 一点点 Neo-Brutalism（限 CTA / Badge / 分区标题三类）**；**暗色优先**；吉祥物**仅图标与启动页**
- **设计哲学主线**: **全局组件化，一改全部改** —— 界面视觉只能来自「令牌」或「消费令牌的组件」；⛔ 禁止组件嵌套套壳
- **2026-10-01 第一轮裁决**: ① 信箱不做 Tab，改为**全局顶栏小按钮** ② 品牌主色 App 自建、不照搬 Web ③ **字体只用系统字体** ④ **无硬性上限，尽量 1 个月内** ⑤ 组件层分三层（平台原语用现成优先 `@expo/ui`、设计系统层自研、完整 UI kit 不作基座）
- **2026-10-01 第二轮裁决（9 项，其中 4 项取代同日早前决定）**:
  - **功能范围**: 除 **M10 学习资料**外，面向学生/用户能力**全面对齐 Web**（约 85 页）；⛔ 不对齐 M06 管理员后台与商家端（宪法 4.2.2）
  - **一级导航**: **见下方第三轮裁决（已由五格取代）**。此轮为 **广场**（食堂/社团/二手/跑腿/新生指南）· **工具**（课程表/待办/放假日 + 校方系统快速打开与会话记忆，**本 App 最主要功能入口**）· **校园里**（万能墙 + 树洞，**仅导航层合并**）· **我的**；信箱为顶栏动作（宪法 4.1／4.1.1／4.1.2）
  - **品牌色**: **厦大蓝 `#173874` + 美团黄 `#ffc300`**（均为**实测官方资产**）→ 暗色必须配同色相提亮档；美团黄永不作亮色文字；警告色相移至 **55°** 使 25° 色相门无例外通过（宪法 2.1.1）
  - **令牌**: 单一 **CSS 创作源** `tokens/design-tokens.css` + `node scripts/gen-tokens.js` 生成 App 侧 TS（RN 运行期无 CSS 变量）（宪法 2.1）
  - **红线**: ⛔ 渐变背景（1.3.5）· ⛔ Emoji 图标 → **两层图标体系**（品牌位 Lucide / 系统控件位平台原生，第 16 条）· ⛔ 组件嵌套套壳（9.14）· ⛔ 说明性文案，按钮/标签 ≤6 汉字（10.5）· ✅ 错误提示必须「可感知/可理解/可改正」（10.4）
- **2026-10-02 第三轮裁决（7 项 + 2 项文档结构指令，其中 2 项取代前面的决定）**:
  - **底栏＝五格**：广场 / 工具 / 校园里 / 我的 / **＋发布**。**发布收束到第 5 格**（动作型 Tab：没有内容区、不参与选中态、不进返回栈），取代第二轮的"发布 FAB"；**第六格禁令**（Material 官方原文 *"Navigation bars can have three to five destinations."*，五格已满）；⛔ **不得保留第二个发布入口**（S-01/S-17/C-01 的发布 FAB 删除）；发布中心必须**注册表驱动**（宪法 4.1／4.9）
  - **二级导航＝顶部 Tab 条**：一级 Tab 内的子栏目用顶部 tab 切换，⛔ **不做模块化宫格入口页**；六条硬规则（各自保持滚动/分页、导航 Tab ≠ 筛选 Chips、溢出横向滚动而非"更多 ▾"、不横向滑动切 Tab…）（宪法 4.8）
  - **安全区**：新增宪法**第 17 条**（八条铁律 + 四类 insets + ≥8 机型矩阵 + 10 条验收）；⛔ 禁止写死数值、禁止用 RN 内置 `SafeAreaView`（官方已标记 Deprecated 且仅 iOS 生效）
  - **工具 Tab 澄清**：**只有 AC 系统 / Moodle / 签到系统是网页**，其余全部原生（宪法 4.1.2-1）
  - **不做笔记**：学习笔记/资料（M10）整体出局，且今后不得以"笔记"名义新增记录类功能（宪法 4.2.2-5；日记是否算笔记待裁）
  - **页面级布局不一次性冻结**：骨架现在定死、每页内部布局开发期逐个确认，且改动必须回写文档（宪法 15.4 / 骨架规范 §7）
  - **拼车 / 问答**（竞品 Lumo 的启示）：后端未建，**先记录**在 [TODO.md](./docs/app/TODO.md) TD-01/TD-02；这正是发布中心必须做成注册表的原因
  - **文档结构**：新增 **`docs/app/research/`** 层（原 `evaluation/` 的调研文档全部迁入，`evaluation/` 专放评估判定）；新增两个跨层登记册 **TO-CONFIRM.md**（待所有者拍板，固定承接）与 **TODO.md**（我们的待办）
  - **实时私聊**（所有者提问）：调研结论＝难度不高、低并发开销不大（成本在无游标整页读放大 + 写路径同步通知）、**不放 Tab**（归「我的」+ 信箱未读角标）；先做阶段 0 的游标与未读计数，实时通道列 v1.1（[调研文档](./docs/app/research/App实时私聊调研-技术难度与服务器开销.md)）
- **✅ 第 4 件现为 v3.0（2026-10-02 按第三轮改骨架）**: [App 页面清单与结构盘点](./docs/app/product/App页面清单与结构盘点.md) —— **骨架已定死**（五格 + 二级顶部 Tab + 顶栏信箱），**页面级布局开发期再确认**（宪法 15.4）；页面口径仍 **88 页 / 首发 81 页**，已知需重切处登记为 §2.5 的 **D-1…D-6**。范围累计裁决：**不做管理后台、不做地图、不做推荐、学习资料/笔记整体出局**，课表导入改为**App 内登录校方系统抓取 HTML**（新增 T-03/T-04/T-05 校方系统模块）。[App 组件类型定义](./docs/app/design/App组件类型定义.md) 为 **v2.0**（**82 个组件**，按宪法 9.14 套壳审计删/降 20 项）
- **📁 文档结构（2026-10-02）**: **App 全部设计层文档在 [`docs/app/`](./docs/app/README.md)**，分 **constitution / product / design / task / test / research / evaluation** **七层** + 2 个跨层登记册；**待确认问题只有一份**（TO-CONFIRM），**待办只有一份**（TODO）。旧的 `docs/03-Architecture/app-design/`、`docs/05-Tasks/App设计阶段/`、`docs/06-Analyze/{ui-research,tech-research}/App*` 已删除，相关路径全部失效
- **开工前提**: ✅ **已满足** —— 《App 设计宪法》**v1.4 已于 2026-10-02 获批准**，可以进入脚手架 + 首周 spike。**所有待所有者拍板的问题在 [TO-CONFIRM.md](./docs/app/TO-CONFIRM.md)** —— 当前最卡的两条：**C-02 开发者账号类型**（决定 1 个月是否成立）、**C-03/C-04 二级 Tab 集合**（卡广场/工具 Tab）
- **可执行尺子**: `node scripts/design-debt-report.js --path <app>/src --fail-on-zero`（14 项设计债）、`node scripts/contrast-check.js --file tokens/generated/tokens.check.json --fail`（WCAG 对比度；**必须带 `--file`**，否则走内置候选预设会永远红）、`node scripts/brand-ramp.js --hue <选定色相> --fail`（品牌色阶准入：6 条对比度门 + 3 条色相间距门；⛔ `--compare --fail` 被脚本拒绝，退出码 2）、`node scripts/gen-tokens.js`（令牌生成 + `textSafe` 自校验）——四把都须接入 CI

### Testing
- **Framework**: Jest 30 + Supertest
- **Location**: `__tests__/`
- **Current**: **46 suites, 668 cases, 100% pass rate**（`npx jest` 实测；改动前请以实测为准，不要引用本行的历史快照）

### Documentation
- **Structure**: `docs/` (10-layer lifecycle: 00-Constitution through 09-Deploy)
- **Index**: `docs/README.md`

## Environment

- **Config**: `.env` (not committed), `.env.example`
- **Key vars**: `PORT`, `JWT_SECRET`, `DATABASE_URL`, `PUBLIC_ASSET_BASE_URL`
- **Node**: LTS
- **Package Manager**: npm
