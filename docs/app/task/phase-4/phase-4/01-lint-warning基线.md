# Phase 4 Task 01 · lint warning 基线

## 1. Where this task sits

- Phase 4 工程出口稳定化：先把 lint 告警变成可追踪基线。
- This task moves R-7 按规则清偿 lint warning by recording current counts and files.
- Starts after：Phase 3 收口。 Waits on：Task 02 warning fixes。

## 2. What the developer needs to know

**Read first**

- `app/package.json` — the authoritative lint command.
- `docs/app/evaluation/App依赖准入登记.md` — known warning policy and historical count.
- `docs/app/TODO.md` — TD-70 ownership and scope.
- `app/eslint.config.*` — active rules and severity.

**Settled**

- Keep rules enabled; do not hide warnings with ignore patterns.
- Report errors and warnings separately.
- Group the baseline by rule and file before changing code.

**Edges and seam**

- Touches the lint baseline document only. Leaves source code and config unchanged.
- Seam: `npm.cmd run lint` output.

**Run**

- Run `npm.cmd run lint` from `app` and capture the raw result.
- Run typecheck only if the baseline task changes no code; it is a reference check.

**Unknowns**

- If lint cannot start because of missing dependencies, record the exact environment failure before fixing dependencies.

## 3. The workflow

1. Read this brief and restate the task as: record the current lint debt without changing its meaning.
2. Run lint with warnings preserved.
3. Parse counts by rule and file.
4. Compare with the historical baseline and explain drift.
5. Write the baseline document and command metadata.
6. Commit the baseline only.

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | lint command | exit and output are recorded | lint command |
| 2 | warning count | errors and warnings are separate | baseline |
| 3 | warning rule | each count has a rule | baseline |
| 4 | warning file | each group has file paths | baseline |
