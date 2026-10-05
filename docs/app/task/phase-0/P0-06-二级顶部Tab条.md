# P0-06 · 二级顶部 Tab 条

| 项 | 值 |
|---|---|
| 负责人 | 甲 |
| 依赖 | P0-04（容器）· P0-05（一级骨架） |
| 写作用域 | `app/src/components/ui/TopTabStrip.tsx` · `app/src/features/navigation/secondaryTabs.ts` |
| 状态 | ✅ 已完成（2026-10-02；真机冲突项见 §6 末条） |

## 0. 执行结果速览（详见 §8）

- `features/navigation/secondaryTabs.ts`：**集合声明 + 状态仓库 + 两条守卫**（纯逻辑）
- `components/ui/TopTabStrip.tsx`：二级导航的**唯一**形态（tablist / tab / selected / 位置播报 / 溢出横滚 / reduced-motion）
- `components/ui/FilterChips.tsx`：筛选的**另一个**组件（button + selected、可多选、可清除、⛔ 无指示器）
- 测试 **201 例全过**（本任务 +15）· `tsc --noEmit` exit 0 · 尺子 exit 0
- ⚠️ 「校园里」两项已落库；广场 / 工具 / 我的**按 C-03/C-04/C-05 留空**（⛔ 不猜）

## 1. 目标

建出**二级导航＝顶部 Tab 条**这一**唯一**形态：⛔ 不得出现"宫格入口页 + push 子页面"作为子栏目导航（宪法 4.8.2 的核心禁令）；**六条硬规则 R1–R6** 逐条有实现与判据。

## 2. 依据

- 宪法 **4.8**（形态 + 禁令 + 允许的首屏摘要）· **4.8.1**（R1–R6 六条硬规则）· **4.8.2**（状态保持 / 深链 / 无障碍 / 动效 / 视觉取值未冻结）
- 宪法 **4.1.1**（校园里两个子视图**互斥、各自独立**，⛔ 不得混排信息流）· **4.6**（⛔ 无横向位移切 Tab）
- 宪法 **7.3**（reduced-motion 降级）· **6.2**（英文定宽、系统字号放大不裁字）
- [骨架规范](../../design/App页面骨架与布局规范.md) **§4**（形态/硬规则/状态保持/深链/无障碍/视觉规格【提案】）

## 3. 交付物

| 文件 | 说明 |
|---|---|
| `app/src/features/navigation/secondaryTabs.ts` | **纯逻辑**：子栏目集合声明 + `secondaryTabStore`（每个二级 Tab 的状态：滚动位置、分页游标、筛选条件） |
| `app/src/components/ui/TopTabStrip.tsx` | 唯一的顶部 Tab 条组件（指示器、横向溢出滚动、a11y tablist/tab/selected、位置播报、选中项自动滚入可见区、reduced-motion 降级） |
| `app/src/components/ui/FilterChips.tsx` | **筛选**用 Chips（可多选、可清除）——与 Tab 条**是两个组件**（R4） |
| `app/src/__tests__/p0-06-top-tab.test.ts` | 状态保持 + 规则断言 + 源码扫描 |

> ⚠️ **子栏目的具体集合未定**（TO-CONFIRM **C-03/C-04/C-05**）。本任务只落**机制**与**校园里**的确定集合（树洞 / 万能墙，宪法 4.1.1 已定），广场/工具的集合在所有者拍板后**加注册表一行**即可。

## 4. 实现要点

| 规则 | 实现 | 判据 |
|---|---|---|
| **R1** 一律用顶部 Tab，不混用两套 | 一级 Tab 内容区**只允许**由 `TopTabStrip` 提供子栏目导航；提供 `assertNoGridEntry()` 静态检查 | review 时数入口形态 |
| **R2** 各自独立保持滚动/分页/筛选 | `secondaryTabStore` 按 `(一级格, 二级格)` 为键存 `{ offset, cursor, filters }`；切换**只改选中键**，不清状态 | 切走再切回，值仍在 |
| **R3** 一级格保留自己的二级选中项 | 键里含一级格 → 天然保留 | 来回切一级 Tab 验证 |
| **R4** 导航 Tab ≠ 筛选 Chips | 两个**独立组件**、独立文件；`TopTabStrip` 无 `multiSelect`，`FilterChips` 无指示器 | 二手页同时有分类筛选时最易出错 |
| **R5** >5 个横向可滚，⛔ 无"更多 ▾" | `ScrollView horizontal` + 选中项 `scrollIntoView`；**禁止**下拉容器 | 溢出时看实现 |
| **R6** 内容区不做横向滑动切 Tab | 内容区**不使用** `PagerView`/横向手势；切换动效 = 淡入淡出 / 指示器位移 | 手势冲突实测 |

**无障碍**：暴露 `tablist` / `tab` / `selected`；读屏播报**位置**（"第 2 个，共 5 个"）→ `accessibilityLabel` 由 `t('a11y.tabPosition', {i, n})` 生成；每个 Tab 命中区 ≥48dp/≥44pt，Tab 条本身 ≥48dp。

**动效**：`motionDuration` 令牌 + `reduceMotion` 时**时长归零**（宪法 7.3）。

## 5. 验收标准

| # | 判据 |
|---|---|
| F1 | `secondaryTabStore` 键为 `一级格 + 二级格`；切二级 Tab 后原键状态**逐字段不变** |
| F2 | 切换一级格再切回，二级选中项与状态保留（R3） |
| F3 | `TopTabStrip` 与 `FilterChips` 是**两个文件、两个组件**，props 无交集语义（R4） |
| F4 | `TopTabStrip` 无"更多/overflow 下拉"路径（R5）；溢出走横向 `ScrollView` |
| F5 | 内容区无 `PagerView` / `horizontal` 手势切 Tab（R6，源码扫描） |
| F6 | `reduceMotion` 为真时动效时长为 0 |
| F7 | a11y：`accessibilityRole="tab"`、`accessibilityState={{selected}}`、位置文案存在 |
| F8 | 校园里的两个子视图**互斥**且各自独立返回栈/滚动（宪法 4.1.1） |

## 6. 测试用例

| 编号 | 类型 | 内容 | 期望 |
|---|---|---|---|
| TC-P0-06-1A | 自动 | 存 A 的 `{offset:120,cursor:'p2',filters:{cat:'吃'}}` → 切 B → 切回 A | 逐字段相等 |
| TC-P0-06-2A | 自动 | 一级格来回切（广场→工具→广场） | 二级选中项保留 |
| TC-P0-06-3A | 自动 | `TopTabStrip` 与 `FilterChips` 导出面断言：前者无 `multiple`/`onToggleAll`，后者无 `indicator` | 通过 |
| TC-P0-06-4A | 自动 | 源码扫描：`app/src` 无 `PagerView`、无 `更多`/`ellipsis` 下拉切 Tab 的路径 | 0 命中 |
| TC-P0-06-5A | 自动 | `reduceMotion=true` → 动效时长 0；`false` → 取令牌值 | 通过 |
| TC-P0-06-6A | 自动 | 位置播报文案：`t('a11y.tabPosition',{i:2,n:5})` 含"2"与"5" | 通过 |
| TC-P0-06-7A | 自动 | 溢出（7 个子栏目）时 `scrollToIndex` 被调用（选中项自动滚入可见区） | 通过 |
| TC-P0-06-8M | 人工（真机） | 二手页同时有分类筛选与子栏目 | Tab 与 Chips 视觉可区分、不互相冒充 |

## 7. 风险与降级

| 风险 | 降级 |
|---|---|
| C-03/C-04 未定 → 广场/工具子栏目集合不明 | 机制先落，集合留注册表；**校园里**先跑通（已定） |
| 横向 Tab 条与 iOS 左边缘返回手势冲突 | Tab 条本身可横滚（系统允许），**内容区**绝不横滑（R6）；冲突处记 ADR |
| 系统字号放到最大导致标签换行破版 | 允许换行/缩短，⛔ 不裁字（宪法 6.2） |

## 8. 执行记录

| 时间 | 动作 | 结果 |
|---|---|---|
| 2026-10-02 | `secondaryTabs.ts` | ✅ `SECONDARY_TABS`（校园里=树洞/万能墙；其余留空）· `SecondaryTabStore` 按 `(一级格, 二级格)` 存状态 → **R2/R3 可被证明** · `assertNoOverflowMenu()` 让"加下拉"显式失败（R5）· `resolveTransitionDuration()` 的 reduced-motion 归零（7.3） |
| 2026-10-02 | `TopTabStrip.tsx` | ✅ `tablist`/`tab`/`selected` + **位置播报**（"第 i 个，共 n 个"）· 溢出横向滚动 + 选中项自动滚入可见区 · 命中区用 `touchTarget` 令牌 · ⛔ 无横向滑动切 Tab（R6） |
| 2026-10-02 | `FilterChips.tsx` | ✅ 与 Tab 条**两个文件两个组件**：角色 `button`、可多选、有"清除"、**无指示器**（R4） |
| 2026-10-02 | i18n | ✅ 新增 `action.clear`（zh/en 同步，编译期保证不缺） |
| 2026-10-02 | `npx jest --ci` / `tsc` / 尺子 | ✅ 9 suites / **201 tests** · tsc exit 0 · 尺子 exit 0（宪法级违规：无） |
| 2026-10-02 | 4 处自我修正（**全是"测试抓到注释"**） | ① 注释里的 `更多 ▾` / `overflowMenu` 被自测扫描命中 → 改措辞 ② `showsHorizontalScrollIndicator` 里的 "Indicator" 被 R4 用例误判 → 改成**基于 import 的复用检查**（更准）③ R5 用例的正则把守卫函数名 `assertNoOverflowMenu` 自己也算命中 → 收窄为 `MoreMenu\|▾` |

### 8.1 与本文档原口径的差异

| 项 | 文档原口径 | 实际做法 | 原因 |
|---|---|---|---|
| 切换动效 | "淡入淡出 / 指示器位移 + reduced-motion" | Phase 0 **不做动画**：指示器是静态色块；`reduceMotion` 已接进"自动滚入可见区"的 `animated` 开关 | 视觉取值未冻结（宪法 15.4 / 骨架规范 §4.6 全为【提案】），现在编数值就是"凭感觉定规格" |
| 二级集合 | 文档列了广场/工具 | **只落校园里**，其余留空 + 断言为空 | C-03/C-04/C-05 未拍板；15.1 明确"不得据推测实现" |
| 真机项 | §6-8M 一条 | 未跑（无真机） | 见 P0-05 §4.8 的真机清单（同一批设备矩阵里一起验） |
