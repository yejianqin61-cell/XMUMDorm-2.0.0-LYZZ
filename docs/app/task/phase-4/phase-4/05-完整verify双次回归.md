# Phase 4 Task 05 · 完整 verify 双次回归

## 1. Where this task sits

- Phase 4 工程出口稳定化：用连续两次完整出口结果证明资源边界和告警记录可复现。
- This task moves R-7 按规则清偿 lint warning and R-8 让 verify 在资源边界内稳定完成 to evidence.
- Starts after：Task 01–04. Waits on：Phase 4 summary.

## 2. What the developer needs to know

**Read first**

- Task 01 lint baseline — before/after warning counts.
- Task 03 handle record — cleanup proof.
- Task 04 verify boundary — commands to repeat.
- `docs/app/evaluation/Phase2审计报告.md` — completion criteria.

**Settled**

- Two successful runs are required; one green run is not enough.
- Report errors, warnings, skips, and resource fallback separately.
- Remaining warnings may stay open only with a named rule and file list.

**Edges and seam**

- Touches the Phase 4 acceptance record and summary only.
- Seam: full verify command and its raw result.

**Run**

- Run the documented full verify twice from a clean process.
- Run the fallback if the host is resource constrained and record both outcomes.

**Unknowns**

- If either run differs, keep the task open and record the first divergent stage.

## 3. The workflow

1. Read this brief and restate the final proof requirement.
2. Confirm all predecessor commits are present.
3. Run verify once and save counts and exit status.
4. Start a fresh process and run it again.
5. Compare warning, test, ruler, OOM, and handle results.
6. Write the Phase 4 acceptance record and commit.

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | verify run one | all stages have result | verify |
| 2 | verify run two | same exit and stage result | verify |
| 3 | lint output | counts are comparable | lint record |
| 4 | constrained fallback | documented and reproducible | fallback |
