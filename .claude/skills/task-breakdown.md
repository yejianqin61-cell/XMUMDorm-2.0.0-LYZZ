---
name: task-breakdown
description: Break architecture designs into executable, ordered, dependency-aware development tasks for assignment to Backend/Frontend/Mobile agents.
---

# Task Breakdown

## Purpose
Transform architecture designs into granular, executable tasks with clear ownership, dependencies, and acceptance criteria.

## When to Use
- After architecture design is complete
- Before any implementation begins
- When replanning or rescoping a feature

## Workflow Stage
`05-Tasks`

## Inputs
- `docs/03-Architecture/<feature>-architecture.md` — The architecture to break down
- `docs/04-Module/` — Module designs for context
- Existing `docs/05-Tasks/` — Prior task plans

## Outputs
- `docs/05-Tasks/<Module>/<feature>-tasks.md` — Task breakdown
- Format: Use `.claude/templates/task-plan.md`

## Process

1. **Read Architecture**: Understand the full design
2. **Identify Work Streams**: Backend stream (DB → API → tests), Frontend stream (pages → components → API integration), Mobile stream (screens → components → API integration)
3. **Order by Dependency**: Database first, then API, then UI
4. **Assign Agents**: Each task to Backend/Frontend/Mobile agent
5. **Estimate Complexity**: ⭐ (trivial) to ⭐⭐⭐⭐⭐ (complex)
6. **Define Acceptance**: Specific, testable completion criteria per task

## Task Granularity Rules
- One task = one deliverable (one migration, one route, one page, one component)
- If a task description exceeds 3 lines, it's too big → split it
- Every task must have exactly one assigned agent type
- Every task must list its dependencies (task #s)

## Task Table Format
```markdown
| # | Task | Agent | Depends On | Complexity | Acceptance |
|---|------|-------|------------|------------|------------|
| B-A1 | Create migration for X table | Backend | — | ⭐⭐ | Table exists with correct schema |
| B-A2 | Create GET /api/x endpoint | Backend | B-A1 | ⭐⭐⭐ | Returns 200 with correct JSON |
| F-A1 | Create X list page | Frontend | B-A2 | ⭐⭐⭐ | Matches design, loads data from API |
```
