---
name: requirement-analysis
description: Analyze feature requests and write Product Requirement Documents (PRDs). Use when defining WHAT to build, user stories, business requirements, and acceptance criteria.
---

# Requirement Analysis

## Purpose
Transform a human feature request/idea into a structured PRD that defines WHAT to build and WHY, without specifying HOW.

## When to Use
- Starting a new feature
- Major feature redesign
- User asks "write a PRD" or "define requirements"
- Before any architecture or implementation work

## Workflow Stage
`01-Requirement`

## Inputs
- Human description of the feature/idea
- `docs/00-Constitution/` — Project constraints and principles
- Existing `docs/01-Requirement/` — Prior requirements for context

## Outputs
- `docs/01-Requirement/<feature>-PRD.md` — Structured PRD
- Update `docs/01-Requirement/README.md` if needed

## Process

1. **Understand the Idea**: Read the human's description. Identify the core problem.
2. **Check Constitution**: Ensure alignment with project principles, technical constraints, security policies.
3. **Define Scope**: What's in, what's out. Draw clear boundaries.
4. **Write User Stories**: "As a <role>, I want <goal>, so that <reason>"
5. **Define Acceptance Criteria**: Specific, testable conditions.
6. **Identify Dependencies**: What other modules/features does this depend on?
7. **Output PRD**: Using the template from `.claude/templates/requirement.md`

## Rules
- Define WHAT, not HOW (leave architecture to Architect Agent)
- Every user story must have acceptance criteria
- Scope boundaries must be explicit
- Reference existing modules when relevant
