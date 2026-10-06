# P2A-02 · viewer 真源与发布中心接线

**Phase A 跨域机制与发布一条线**，其目标是发布链路端到端可见。
**本任务推进 JR-2 发布中心接真实 viewer**：删掉 `PHASE0_VIEWER` 硬编码，权限只读后端字段，拿不到就 fail-closed。
**Starts after**：无。**Waits on it**：`P2A-04 发布表单宿主 hook 与提交门控`（宿主读同一个 viewer）。

## 1. 本任务需要知道什么

**Read first**

- `app/src/features/auth/session.tsx` — 会话给的是什么（`useSession().isSignedIn`），以及它在用例里怎么被提供。
- `shared/api/clubs.js` — `listMyClubs()` 的行字段（`role` 是不是 `admin`）。
- `shared/api/organizations.js` — `getMyOrganizations()` 行里的 `can_post`。
- `app/src/features/publish/registry.ts` — `Viewer` 的三个字段与 `visibleEntries`。
- `docs/app/task/phase-2/开发设计文档-甲.md` §6-G3/G4 — 缺真源时的口径与登记。

**Settled**

- 拿不到就当 `false`（fail-closed）；⛔ 不显示为"禁用"占位。
- 权限推断**只允许在 `viewer.ts` 一处**；页面里不许再判断。
- ⛔ **不动** `complianceGate.canSubmit` 的语义（既有用例要求"未接受条款必拦"）；源缺失的放行属于 P2A-04 的 `resolveSubmitGate`。
- `acceptedTerms` 今天恒为 `null`（后端 0 实现，登记 G4），表现为 `viewer.acceptedTerms === undefined`。

**Edges and seam**

- 碰 `app/src/features/publish/**` 与 `app/src/app/publish-center.tsx`；⛔ 不改 `shared/`（两个函数都已存在）。
- Seam：**S-4 纯映射** + **S-1 发布中心渲染**。

**Run**

- `cd app && npx jest src/__tests__/p2a-02 --ci`
- `cd app && npx tsc --noEmit`

**Unknowns**

- `publish-center.tsx` 既有用例禁止出现 `'wall'` 这类字面量 → 新代码不许引入。
- 两个请求都失败时仍要能进发布中心（降级为通用条目），⛔ 不许整屏报错。

## 2. 工作流

1. 读上面五处，用一句话复述本任务。
2. 写 1 号用例（未登录 → 0 条）—— 先红。
3. 写纯映射 `resolveViewer`，让它变绿。
4. 加 2–4 号用例：club admin、请求失败降级、组织与条款源缺失，逐条红→绿。
5. 把 `publish-center.tsx` 的 `PHASE0_VIEWER` 换成真实 viewer，并加一条渲染用例。
6. 跑 jest 与 tsc，提交。

## 3. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `signedIn:false` | 可见条目 0 条 | S-4 / `visibleEntries` |
| 2 | 已登录 + `role:'admin'` 的一个社团 | `canManageClub:true`，可见 5 条 | S-4 |
| 3 | 已登录 + clubs 请求失败（`null`） | `canManageClub:false`，可见 4 条，降级原因含 `clubs-unavailable` | S-4 |
| 4 | 组织取到空数组 / 组织请求失败 | 前者 `isOrgMember:false` 无降级；后者 `false` + `orgs-unavailable` | S-4 |
| 5 | 条款源为 `null` | `viewer.acceptedTerms` 为 `undefined`，降级原因含 `terms-source-missing`；发布中心仍正常渲染条目 | S-1 |
