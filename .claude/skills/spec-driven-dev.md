---
name: spec-driven-dev
description: Core workflow for Spec-Driven, Agent-Native, Documentation-Driven Development. Use for ALL non-trivial work on the XMUMDorm project.
---

# Spec-Driven Development

## Purpose
The mandatory core workflow for XMUMDorm. Every feature follows: read docs → plan in docs → implement from docs → record in docs.

## When to Use
- **ALWAYS** for any feature, bug fix, or refactoring that touches more than one file
- Required before writing any implementation code
- The default workflow for all XMUMDorm development

## Workflow Stage
All stages (00-09). This is the meta-skill that orchestrates the lifecycle.

## Core Workflow

### 1. READ (Before Writing Any Code)
```
docs/00-Constitution/     ← Understand constraints
docs/01-Requirement/      ← Understand what to build
docs/03-Architecture/     ← Understand how it fits
docs/04-Module/           ← Understand module context
docs/05-Tasks/            ← Find the assigned task
```

### 2. PLAN (Write Docs Before Code)
```
docs/01-Requirement/  ← Write PRD if feature is new
docs/03-Architecture/ ← Write architecture doc if design changes
docs/05-Tasks/        ← Break down into tasks
docs/06-Analyze/      ← Write impact analysis for changes
```

### 3. IMPLEMENT (From Docs)
```
Read: docs/05-Tasks/<task>.md
Implement: routes/ or frontend/src/ or mobile/src/
Test: __tests__/
```

### 4. RECORD (After Code)
```
docs/07-Implement/<feature>-record.md  ← What was done, decisions made
docs/08-Test/<feature>-test-report.md  ← Test results
```

## Anti-Patterns (DO NOT DO)
- ❌ Start coding before reading docs
- ❌ Skip writing docs for new features
- ❌ Implement without a task plan
- ❌ Commit without implementation record
- ❌ Skip tests for new routes

## Agent Communication
Agents communicate through documents:
- PM Agent writes → `01-Requirement/`
- Architect Agent reads `01-Requirement/` → writes `03-Architecture/`
- Task Agent reads `03-Architecture/` → writes `05-Tasks/`
- Dev Agents read `05-Tasks/` → write code + `07-Implement/`
- QA Agent reads `07-Implement/` → writes `08-Test/`
- DevOps Agent reads `08-Test/` → writes `09-Deploy/`
