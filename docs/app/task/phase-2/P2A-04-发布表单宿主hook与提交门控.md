# P2A-04 · 发布表单宿主 hook 与提交门控

**Phase A 跨域机制与发布一条线**，其目标是发布链路端到端可见。
**本任务推进 JR-1 的宿主 hook 与 JR-12 的缺口口径**：描述符 → 状态机 / 草稿 / 离开确认 / 提交语义 / 门禁，全在一处。
**Starts after**：`P2A-01 描述符契约与缺口账本`、`P2A-02 viewer 真源与发布中心接线`。**Waits on it**：`P2A-05 路由接线与端到端证明`。

## 1. 本任务需要知道什么

**Read first**

- `app/src/components/ui/Form.tsx` — `useForm` 的 `UseFormOptions` / `UseFormReturn` / `FormLabels` / `FormProps` 的准确签名。
- `app/src/features/publish/descriptor.ts` — 上一个任务定的描述符契约。
- `app/src/features/publish/complianceGate.ts` — 既有 `canSubmit` 与三段文案词条。
- `app/src/i18n/zh.ts` — 词条写法与命名空间白名单（`publish.` / `form.` 可用）。
- `app/src/__tests__/p0-03-i18n.test.ts` — 加词条必须过的闸（禁用词、字数、zh/en 键相等）。

**Settled**

- ⛔ 不新建 `FormScreen` 组件；宿主是**一个 hook**，不是 UI。
- 门禁三段文案用**既有** `publish.gate.terms.*`；⛔ 不新造一套。
- `resolveSubmitGate` 是**新增**纯函数：`acceptedTerms === undefined` ⇒ 放行 + 标记 `terms-source-missing`；否则委托既有 `canSubmit`。⛔ `canSubmit` 的语义一个字节不改。
- 被门禁拦住时 ⛔ **不发请求**（这是要断言的不变量，不是 UI 细节）。

**Edges and seam**

- 碰 `app/src/features/publish/**` 与 `app/src/i18n/**`（**只加 key**）；⛔ 不改 `complianceGate.canSubmit` 的行为。
- Seam：**S-4 纯规则**（门控与提交语义）+ **S-1**（`Form` 与 hook 的接线）。

**Run**

- `cd app && npx jest src/__tests__/p2a-04 --ci`
- `cd app && npx jest src/__tests__/p0-03 --ci`（加词条后必须仍然绿）
- `cd app && npx tsc --noEmit`

**Unknowns**

- `FormLabels` 需要 6 个槽位，其中 5 个词条现在是缺的 → 必须新增 `form.*`，且 en 同步。
- 若排序/依赖导致草稿 key 里出现 `password` 段 → 护栏会拒绝落盘，属预期。

## 2. 工作流

1. 读上面五处，用一句话复述本任务。
2. 写 1 号用例（条款源缺失 ⇒ 放行且带 `bypassed` 标记）—— 先红。
3. 加 `resolveSubmitGate`，让它变绿。
4. 加 2–3 号用例（明确 false ⇒ 拦住 + 三段文案；true ⇒ 放行），逐条红→绿。
5. 加词条（zh/en 同步），写宿主 hook；加 4–5 号用例（被拦住时 `submit` 不被调用、草稿 id 为 `publish:<id>`）。
6. 跑三个命令，提交。

## 3. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `viewer.acceptedTerms === undefined` | `allowed:true` 且 `bypassed:'terms-source-missing'` | S-4 |
| 2 | `viewer.acceptedTerms === false` | `allowed:false`，三段文案 key 都在词条表里，`fix` 以动词开头 | S-4 |
| 3 | `viewer.acceptedTerms === true` | `allowed:true` 且无 `bypassed` | S-4 |
| 4 | 门禁拦住时调用宿主的提交 | 描述符的 `submit` **一次都没被调用** | S-1 |
| 5 | 描述符未指定 `formId` | 草稿 key 为 `publish:<id>` 且可落盘（凭据护栏不拒） | S-4 |
