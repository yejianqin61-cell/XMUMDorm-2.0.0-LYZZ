---
name: backend-dev
description: Implement Express/MySQL backend features following project conventions. Use for routes, middleware, services, migrations, and backend tests.
---

# Backend Development

## Purpose
Implement backend features according to the task plan, following all project conventions: Express routes, MySQL parameterized queries, JWT auth, Multer uploads, and Jest+Supertest testing.

## When to Use
- Assigned a Backend task from `docs/05-Tasks/`
- Creating new Express routes
- Writing database migrations
- Adding middleware
- Writing backend tests

## Workflow Stage
`07-Implementation` (Backend)

## Inputs
- `docs/05-Tasks/` — Assigned task with acceptance criteria
- `docs/04-Module/` — Module design
- `docs/03-Architecture/` — API/DB design
- `docs/00-Constitution/安全策略.md` — Security requirements
- `docs/00-Constitution/数据库变更铁律.md` — Migration rules
- `docs/00-Constitution/测试铁律.md` — Testing requirements

## Outputs
- `routes/<module>.js` — New or updated route file
- `middleware/<name>.js` — New middleware if needed
- `migrations/NNN_<name>.sql` — Schema changes
- `scripts/run-migration-NNN-<name>.js` — Migration runner
- `__tests__/routes/<module>.test.js` — Integration tests
- `docs/07-Implement/<feature>-backend-record.md` — Implementation record

## Rules (from `.claude/rules/backend.md`)
1. All routes use `router.get/post/patch/delete` pattern
2. All SQL uses parameterized `query('... ?', [val])`
3. All authenticated routes use `authenticateToken` middleware
4. All admin routes also use `requireAdmin` middleware
5. All user input sanitized with `sanitize-html`
6. All responses return proper HTTP status codes
7. Every route has try/catch with 500 fallback

## Implementation Record
After completing implementation, write:
```markdown
# <Feature> Backend Implementation Record

## Changes Made
- `routes/x.js`: Added GET /api/x endpoint
- `migrations/058_x.sql`: Created x table
- `__tests__/routes/x.test.js`: 6 test cases

## Decisions
- <Why a specific choice was made>

## Migration Applied
- [x] 058_x.sql
```
