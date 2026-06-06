---
name: architecture-design
description: Design system architecture from requirements. Define API endpoints, database schema, component decomposition, data flow, and technical decisions.
---

# Architecture Design

## Purpose
Transform requirements (WHAT) into architecture (HOW at a high level). Design the system structure: API design, database schema, component tree, data flow, and technical decisions.

## When to Use
- After PRD is complete
- When adding a new module
- When modifying existing architecture
- User asks "design the architecture" or "how should we build this"

## Workflow Stage
`03-Architecture` (+ `04-Module` for detailed module designs)

## Inputs
- `docs/01-Requirement/<feature>-PRD.md` — The requirements to design for
- `docs/03-Architecture/` — Existing architecture docs
- `docs/04-Module/` — Existing module designs
- `docs/00-Constitution/` — Technical constraints, security, database rules

## Outputs
- `docs/03-Architecture/<feature>-architecture.md` — Architecture design doc
- May also create/update: `docs/04-Module/<Module>/` — Module-specific design
- Format: Use `.claude/templates/architecture.md`

## Process

1. **Read the PRD**: Understand WHAT needs to be built
2. **Survey Existing**: Check existing architecture for reuse points
3. **Design API**: Endpoints, methods, request/response shapes
4. **Design Database**: Tables, columns, relationships, migrations needed
5. **Design Components**: Frontend component tree / Mobile screen hierarchy
6. **Design Data Flow**: How data moves from DB → API → UI
7. **Document Decisions**: Record why each key decision was made
8. **Check Alignment**: Verify against Constitution constraints

## Architecture Doc Sections
1. **Overview** — One paragraph summary
2. **API Design** — Endpoint table with methods, paths, auth requirements
3. **Database Changes** — New tables/columns, migration plan
4. **Component/Screen Decomposition** — Tree diagram
5. **Data Flow** — Sequence: User → Component → API → DB
6. **Technical Decisions** — Key choices with rationale
7. **Risks & Mitigations** — What could go wrong, how to prevent
