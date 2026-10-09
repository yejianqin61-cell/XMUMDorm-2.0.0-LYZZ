# Phase 4 Task 04 · verify 资源边界

## 1. Where this task sits

- Phase 4 工程出口稳定化：让默认 verify 在可用资源边界内完成，并保留串行回退。
- This task moves R-8 让 verify 在资源边界内稳定完成 after lifecycle fixes.
- Starts after：Task 03. Waits on：Task 05 双次完整验证。

## 2. What the developer needs to know

**Read first**

- `app/package.json` — current verify composition.
- `.github/workflows/app-rulers-and-tests.yml` — CI resource and command boundary.
- Task 03 diagnostic record — handles that must not be masked.
- `docs/app/evaluation/Phase2审计报告.md` — original OOM acceptance criteria.

**Settled**

- Keep typecheck, tests, and rulers as separate observable stages.
- A worker limit is allowed only after lifecycle causes are addressed.
- Preserve an explicit serial fallback for constrained machines.

**Edges and seam**

- Touches package scripts and CI command parameters. Leaves test assertions unchanged.
- Seam: `npm.cmd run verify` and documented serial fallback.

**Run**

- Run the default verify once before changing resource settings.
- Run the configured verify and serial fallback after changes.

**Unknowns**

- If the default command still exceeds the host memory limit, record the measured limit and choose a documented bound.

## 3. The workflow

1. Read this brief and restate the resource failure.
2. Capture one baseline verify result and its failing stage.
3. Add the smallest explicit worker or memory boundary.
4. Keep the serial fallback command visible in scripts or docs.
5. Run typecheck, tests, rulers, and verify in the documented order.
6. Commit the resource-boundary change.

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | default verify | full stages run or failure is explained | verify |
| 2 | bounded verify | no OOM | verify |
| 3 | serial fallback | complete result is reproducible | fallback |
| 4 | rulers stage | still runs after tests | verify |
