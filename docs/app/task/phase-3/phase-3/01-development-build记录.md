# Phase 3 Task 01 · development build 记录

## 1. Where this task sits

- Phase 3 设备证据与发布材料收口：让设备验收有可复现的构建基线。
- This task moves R-4 完成 13.1 development build 设备验收 into a named build record.
- Starts after：Phase 2 code closeout. Waits on：设备批次验收。

## 2. What the developer needs to know

**Read first**

- `app/package.json` — available build and validation commands.
- `app/app.json` — SDK, platform, and version identity.
- `docs/app/task/phase-0/P0-10-安全区与机型矩阵验收.md` — device matrix baseline.
- `docs/app/test/甲-逐屏13.1验收记录.md` — required evidence fields.

**Settled**

- Use a development build; do not call an Expo preview a device acceptance build.
- Record the exact build identity before changing acceptance status.
- Production release and store submission stay out of this task.

**Edges and seam**

- Touches build configuration and the evidence record. Leaves product behavior unchanged.
- Seam: the existing app build command and build metadata record.

**Run**

- Run the repository's documented development-build command.
- Run `npm.cmd run typecheck` after any configuration change.

**Unknowns**

- If credentials, native toolchain, or device access is unavailable, record the exact blocker and stop; do not invent a build number.

## 3. The workflow

1. Read this brief and restate the task as: create a reproducible development-build baseline.
2. Inspect available scripts and SDK metadata.
3. Run the narrowest supported development-build command.
4. Record build identity, commit, SDK, platforms, and result.
5. Run typecheck if files changed.
6. Commit the build record and any required minimal configuration change.

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | documented build command | build completes or blocker is recorded | build command |
| 2 | build metadata | commit and SDK are identifiable | evidence record |
| 3 | changed config | typecheck passes | App typecheck |
