---
name: frontend-dev
description: Implement React web frontend features. Use for pages, components, API integrations, context, CSS Modules, and liquid glass design.
---

# Frontend Development

## Purpose
Implement React web frontend features according to task plans, following project conventions: React 18, Vite, React Router, TanStack Query, CSS Modules, and liquid glass design system.

## When to Use
- Assigned a Frontend task from `docs/05-Tasks/`
- Creating new pages or components
- Integrating with backend APIs
- Styling with CSS Modules

## Workflow Stage
`07-Implementation` (Frontend Web)

## Inputs
- `docs/05-Tasks/` — Assigned task with acceptance criteria
- `docs/04-Module/` — Module design with UI specifications
- `docs/03-Architecture/` — API endpoints to consume
- `docs/00-Constitution/编码规范.md` — Coding standards
- (Reference) Web counterpart pages for layout parity

## Outputs
- `frontend/src/pages/<Page>.jsx` + `<Page>.css` — New/updated page
- `frontend/src/components/<Component>.jsx` + `<Component>.css` — New component
- `frontend/src/api/<module>.js` — API integration (if new endpoint)
- `docs/07-Implement/<feature>-frontend-record.md` — Implementation record

## Rules (from `.claude/rules/frontend.md`)
1. Server data → TanStack Query (never useState for API data)
2. UI state → React Context or local useState
3. Loading → Skeleton components (never blank screen)
4. Error → EmptyState components with retry
5. Styles → CSS Modules with component-name.css
6. Images → alt text required
7. Forms → labels required

## Component Checklist
- [ ] Loading state handled (Skeleton)
- [ ] Error state handled (EmptyState)
- [ ] Empty state handled (EmptyState)
- [ ] Edge cases handled
- [ ] Responsive layout
- [ ] Matches liquid glass design system
- [ ] API calls through `api/` layer
- [ ] JWT token in Authorization header
