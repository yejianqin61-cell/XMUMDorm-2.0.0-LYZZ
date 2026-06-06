# /new-feature

Scaffold a new feature through the full Agent-Native lifecycle.

## Usage
```
/new-feature <feature-name>
```

## Workflow
1. Prompt user for feature description (if not provided)
2. Act as PM Agent → Write PRD to `docs/01-Requirement/<name>-PRD.md`
3. Act as Architect Agent → Write architecture to `docs/03-Architecture/<name>-architecture.md`
4. Act as Task Agent → Write task plan to `docs/05-Tasks/<module>/<name>-tasks.md`
5. Report completion with links to all generated docs

## Agent Mode
This command chains through PM → Architect → Task agents in sequence, producing all three documents.
