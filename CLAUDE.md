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
  - [App 设计哲学提案](docs/03-Architecture/app-design/App设计哲学提案.md)（方向已由所有者指定）
  - [App 前端风格体系](docs/03-Architecture/app-design/App前端风格体系.md)（v1.1）
  - [App 品牌主色提案](docs/03-Architecture/app-design/App品牌主色提案.md)（主色相与色阶的准入过程；**色相待选定**）
  - [App 设计宪法](docs/00-Constitution/principles/App设计宪法.md)（**草案 · 待批准**）
- **已定方向**: 真原生 App；**以 React Native 为主，iOS 可混原生**；**Android 优先**；双端并重、各自最优（不追求 1:1）。设计语言 = **苹果的舒适感（质感标准）+ Discord 的社区感 + 一点点 Neo-Brutalism（限 CTA / Badge / 分区标题三类）**；**暗色优先**；吉祥物**仅图标与启动页**
- **2026-10-01 追加裁决**: ① **信箱不做 Tab，改为右上角小按钮** → 一级导航 = **四格**（广场/树洞/食堂/我的）+ 顶栏信箱动作 + 发布 FAB ② **品牌主色 App 自建，不照搬 Web**（Web 品牌蓝被本项目自己的尺子判不合格）③ **字体只用系统字体，不引入自有字体** ④ **无硬性上限，尽量 1 个月内** ⑤ 组件层自研/现成边界见 `docs/06-Analyze/tech-research/App组件层调研-现成组件库评估.md`
- **开工前提**: **先取得《App 设计宪法》批准**，再进入脚手架与模块铺开。宪法 §15 列有待决项。设计阶段计划见 `docs/05-Tasks/App设计阶段/`
- **可执行尺子**: `node scripts/design-debt-report.js --path <app>/src --fail-on-zero`（14 项设计债）、`node scripts/contrast-check.js --fail`（WCAG 对比度）、`node scripts/brand-ramp.js --compare`（品牌主色准入：6 条对比度门 + 3 条色相间距门；**CI 门用 `--hue <选定值> --fail`**，`--compare` 是探索用法、候选清单故意含未过门项）——三把都须接入 CI

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
