# <Feature/Module Name> — Task Plan

**依据**: `docs/03-Architecture/<feature>-architecture.md`
**编写日期**: <YYYY-MM-DD>
**总任务数**: N
**预估工期**: <estimate>

---

## 任务总览

### Backend Tasks

| # | Task | Depends On | Complexity | Acceptance |
|---|------|------------|------------|------------|
| B-A1 | <task> | — | ⭐⭐ | <criteria> |
| B-A2 | <task> | B-A1 | ⭐⭐⭐ | <criteria> |

### Frontend Tasks (Web)

| # | Task | Depends On | Complexity | Acceptance |
|---|------|------------|------------|------------|
| F-A1 | <task> | B-A2 | ⭐⭐⭐ | <criteria> |

### Mobile Tasks

| # | Task | Depends On | Complexity | Acceptance |
|---|------|------------|------------|------------|
| M-A1 | <task> | B-A2, F-A1 | ⭐⭐⭐ | <criteria> |

---

## 执行顺序

```
B-A1 (DB migration)
  ↓
B-A2 (API endpoint)
  ↓
┌─────────────┐
│ F-A1 (Web)  │     M-A1 (Mobile)
│ ↓           │     ↓
│ F-A2 (Web)  │     M-A2 (Mobile)
└─────────────┘
```

---

## 详细任务

### B-A1: <Task Name>
- **Agent**: Backend Agent
- **Type**: Migration
- **Description**: <详细描述>
- **Files**: `migrations/NNN_<name>.sql`, `scripts/run-migration-NNN.js`
- **Acceptance**: <具体验收条件>
- **Estimate**: <时间估算>
