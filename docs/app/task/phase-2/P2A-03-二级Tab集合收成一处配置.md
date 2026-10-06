# P2A-03 · 二级 Tab 集合收成一处配置

**Phase A 跨域机制与发布一条线**，其目标是发布链路端到端可见、且**二级 Tab 集合只存在于一处配置里**。
**本任务推进 JR-3 二级 Tab 集合收成一处配置**：加机器可判的守卫，把"改集合要动页面"变成不可能。
**Starts after**：无。**Waits on it**：无（`C-03`/`C-04`/`C-05` 拍板后只改这一处）。

## 1. 本任务需要知道什么

**Read first**

- `app/src/features/navigation/secondaryTabs.ts` — 集合现在长什么样、`SecondaryTabStore` 的键怎么组。
- `app/src/components/ui/TopTabStrip.tsx` — 空集合时它渲染什么（`null` 还是空条）。
- `app/src/__tests__/p0-06-secondary-tabs.test.tsx` — 既有断言（R2/R3/R5、不得用下拉）。
- `docs/app/design/App页面骨架与布局规范.md` §4.2 — 六条硬规则（R1–R6），本任务的判据来源。
- `docs/app/task/phase-2/开发设计文档-甲.md` §3-JR-3 — 验收项与"我的"那处未定项。

**Settled**

- 集合**只**定义在 `secondaryTabs.ts`；⛔ 任何第二处硬编码都算返工。
- 未拍板期间 `square` / `tools` / `me` 保持**空数组**，⛔ 不预占所有者的决定。
- 空集合 ⇒ **不渲染** Tab 条；⛔ 不出现空条，⛔ 不出现"更多 ▾"（R5）。

**Edges and seam**

- 只碰 `app/src/features/navigation/**` 与自己的用例；⛔ 不改 `components/ui/**`。
- Seam：**S-4 纯规则** + **S-5 源码扫描**（"只有一处声明集合"是结构约束，渲染测测不出来）。

**Run**

- `cd app && npx jest src/__tests__/p2a-03 --ci`
- `cd app && npx tsc --noEmit`

**Unknowns**

- "一处配置"的扫描判据要能容忍测试文件与注释：⛔ 用 `stripComments`，别把说明文字判成违规。
- 若发现 `TopTabStrip` 对空集合会渲染空条 → 那是它的缺陷，停下说明，⛔ 不在页面里绕开。

## 2. 工作流

1. 读上面五处，用一句话复述本任务。
2. 写 1 号用例（空集合 ⇒ `hasSecondaryTabs` 为假）—— 先红。
3. 加纯函数与守卫，让它变绿。
4. 加 2–4 号用例：非空为真、重复 key 抛、`labelKey` 不在词条表抛。
5. 加 5 号用例：源码扫描证明集合只声明在一处。
6. 跑 jest 与 tsc，提交。

## 3. 测试用例

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `'me'`（空集合） | `hasSecondaryTabs('me')` 为假 | S-4 |
| 2 | `'campus'`（树洞 / 万能墙） | 为真，且两项顺序与宪法 4.1.1 一致 | S-4 |
| 3 | 同一一级格下两个相同 key | 不变量断言抛错 | S-4 |
| 4 | `labelKey` 不在 `zh` 词条表 | 不变量断言抛错 | S-4 |
| 5 | 全 `app/src` 扫描（排除 `__tests__`） | 只有 `secondaryTabs.ts` 声明二级集合常量 | S-5 |
