# XMUMDorm Agent-Native Project

## Project Identity

- **Name**: XMUMDorm (厦马小筑 / Jack Dorm)
- **Type**: Monorepo — Express Backend + React Web + React Native Mobile
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
- **Routes** (17 modules): `routes/auth.js`, `posts.js`, `canteen.js`, `square.js`, `clubs.js`, `marketplace.js`, `errands.js`, `handbook.js`, `schedule.js`, `diary.js`, `todos.js`, `notifications.js`, `push.js`, `users.js`, `admin.js`, `reports.js`, `organizations.js`
- **Middleware** (5): `auth.js`, `adminAuth.js`, `checkSanction.js`, `sensitiveWordFilter.js`, `upload.js`
- **Services** (7): `objectStorage.js`, `auditLog.js`, `expService.js`, etc.
- **Database**: `database.js` (MySQL pool), `init-db.sql`, `migrations/` (57 files)

### Frontend Web
- **Tech**: React 18 + Vite + React Router + TanStack Query
- **Pages**: `frontend/src/pages/` (86 pages)
- **Components**: `frontend/src/components/` (~60 components)
- **API**: `frontend/src/api/` (20 files)
- **Context**: `frontend/src/context/` (Auth, Toast, Language)

### Frontend Mobile
- **Tech**: Expo SDK 52+ + Expo Router + TanStack Query
- **Pages**: `mobile/src/app/` (Expo Router file-based routing)
- **Components**: `mobile/src/components/`
- **API**: `mobile/src/api/` (reused from Web)

### Testing
- **Framework**: Jest 30 + Supertest
- **Location**: `__tests__/`
- **Current**: 5 suites, 108 cases, 100% pass rate

### Documentation
- **Structure**: `docs/` (10-layer lifecycle: 00-Constitution through 09-Deploy)
- **Index**: `docs/README.md`

## Environment

- **Config**: `.env` (not committed), `.env.example`
- **Key vars**: `PORT`, `JWT_SECRET`, `DATABASE_URL`, `PUBLIC_ASSET_BASE_URL`
- **Node**: LTS
- **Package Manager**: npm
