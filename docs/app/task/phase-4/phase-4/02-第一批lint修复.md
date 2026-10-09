# Phase 4 Task 02 · 第一批 lint 修复

## 1. Where this task sits

- Phase 4 工程出口稳定化：清偿一批可安全修复的生产代码 warning。
- This task moves R-7 按规则清偿 lint warning without changing product behavior.
- Starts after：Task 01 基线。 Waits on：Task 03 测试探针与句柄修复。

## 2. What the developer needs to know

**Read first**

- Task 01 baseline — selected rules and files.
- `app/src` files named by the baseline — the actual warning context.
- `app/src/__tests__` nearby tests — behavior that must stay unchanged.
- `app/AGENTS.md` — Expo and React Native constraints.

**Settled**

- Fix one warning class at a time.
- Reuse existing hooks and components; do not add an abstraction for lint.
- A warning that needs a product decision stays open and is recorded.

**Edges and seam**

- Touches only the first selected production warning group and its direct tests.
- Seam: existing lint output plus affected behavior tests.

**Run**

- Run targeted App tests, `npm.cmd run typecheck`, and `npm.cmd run lint`.
- Run the relevant ruler if a design-system file changes.

**Unknowns**

- If a fix changes behavior or needs a rule exception, stop and record it instead of suppressing the warning.

## 3. The workflow

1. Read this brief and restate the selected warning group.
2. Inspect every caller and the nearest behavior test.
3. Write or adjust the smallest behavior-preserving fix.
4. Run the targeted test and typecheck.
5. Re-run lint and compare the baseline delta.
6. Commit the warning group as one intent.

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | selected warning | warning count decreases | lint |
| 2 | affected behavior | existing test stays green | behavior test |
| 3 | typecheck | no new type error | typecheck |
| 4 | unrelated warning | remains traceable | baseline |
