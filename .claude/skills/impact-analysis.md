---
name: impact-analysis
description: Analyze the impact, risk, dependencies, and performance implications of proposed changes before implementation.
---

# Impact Analysis

## Purpose
Before implementing a change, analyze its impact across the codebase: what files are affected, what modules depend on it, what risks exist, and what performance implications arise.

## When to Use
- Before implementing any change that touches multiple modules
- When modifying shared infrastructure (auth, database, middleware)
- When refactoring existing code
- User asks "analyze the impact" or "what are the risks"

## Workflow Stage
`06-Analyze` (between Tasks and Implementation, or ad-hoc)

## Inputs
- `docs/05-Tasks/<feature>-tasks.md` — The proposed changes
- `docs/03-Architecture/` — Architecture context
- `docs/04-Module/` — Module dependency graph
- Source code in `routes/`, `frontend/src/`, `mobile/src/`

## Outputs
- `docs/06-Analyze/<feature>-impact-analysis.md` — Impact report

## Analysis Dimensions

### 1. File Impact
- Which files need to change? (list them)
- Which files are read-only but referenced? (list them)

### 2. Dependency Impact
- What upstream modules depend on the changed code?
- What downstream modules will be affected?
- Are there circular dependency risks?

### 3. Risk Assessment
| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| Breaking existing API | Low/Med/High | Low/Med/High | ... |
| Database migration failure | ... | ... | ... |
| Performance regression | ... | ... | ... |
| Security vulnerability | ... | ... | ... |

### 4. Performance Analysis
- Will this change increase query count?
- Will this add N+1 query patterns?
- Will this increase bundle size?
- Are there caching opportunities?

### 5. Rollback Plan
- How to undo this change if it fails in production?
- Migration reversible? (DROP TABLE IF EXISTS...)
- API backwards compatible?
