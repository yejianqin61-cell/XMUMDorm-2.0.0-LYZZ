# Phase 1 · 设计系统内测子集 + 四个骨架 + 两个纵向切片 —— 子任务包（索引）

**日期**：2026-10-02　**版本**：v1.0
**性质**：**task 层执行文档包**。上游：[生产开发计划-三周到内测](../生产开发计划-三周到内测.md) §3（Phase 1）· [App 设计宪法](../../constitution/App设计宪法.md)（v1.4，已批准）· [App 组件类型定义](../../design/App组件类型定义.md) v2.0（**§8.1 交付批次**）· [App 页面骨架与布局规范](../../design/App页面骨架与布局规范.md) · [App 设计令牌规范](../../design/App设计令牌规范.md)
**执行者**：所有者（"phase1 也是我来"）。**但本文档包的拆解与实现由协助者 Agent 按所有者指令执行**（所有者 2026-10-02 目标指令："针对 phase1，你先拆解出一批可直接依据开发子任务 task 文档。并设计好测试用例。然后逐个 task 进行实现"）。
**前置**：[Phase 0 结案报告](phase-0/P0-12-Phase0结案报告.md) —— G1/G2/G3/G5 成立，G4 部分成立，G6 接口就绪。

---

## 0. 一句话

**Phase 1 的目标是把"写页面"变成"拼骨架"**：交付 [组件类型定义 §8.1 第 0 批](../../design/App组件类型定义.md) 的 **32 个组件** + **四个参数化骨架**（列表/表单/详情/静态）+ **两个纵向切片**（工具、食堂），并且让**第一个纵向切片真正消费组件库与令牌**（宪法 9.5）。

> ⚠️ **交付量比生产计划 §3 的"≈30 个"要大，这是有据的修正，不是膨胀**：把两个切片的**必经链路**逐页反推后，组件总数是 **约 50 个**（生产计划 §3 的 ≈30 只算了"通用组件"，没算切片的域组件）。
> · 工具切片**第一页** `T-04` 的交付物含"**会话状态**" → 必须 `D27 SchoolSystemCard`；
> · 食堂切片 `S-07` 的榜单前置与 `S-08` 的区域榜是**同一个组件** → 必须 `K12 RankingRow`；
> · `S-10` 的点评区要 `D01/D02/D03`、图片要 `K18 MediaGrid`、评级要 `D11 RatingScale`（§2.6 明令不得用 `D10` 代替）；
> · 另有 `K11 QuickActionGrid`、`D24 BannerSlot` 只服务 `S-07` 首屏，列为**可降级**（降级即回写页面清单）。
> **复用项**：`A02 Text`、`C02 IconButton`、`K20 FilterChips`、`TopTabStrip`、`Screen`、`TopBar`、`SchoolSystemWebView` 已在 Phase 0 交付，Phase 1 **改造而不重写**。

---

## 1. 出口门（全部打勾才算 Phase 1 结束）

| # | 出口门 | 判据 | 与生产计划 §3 的对应 |
|---|---|---|---|
| **E1** | **组件库被真消费** | 第 0 批每个组件的 `引用` ≥1 且**真被切片消费**；`design-debt-report.js` 的 `ownUiComponentRefs ≥1`、`#hex=0`、`fontSize=0` 三项达标 | §3 出口门③ |
| **E2** | **两个切片跑通** | 工具 `T-04→T-05→T-03→T-02`、食堂 `S-07→S-08→S-09→S-10` 的**路由可进入、四态齐全**；⛔ 真机可用归所有者（见 §6） | §3 出口门② |
| **E3** | **四个骨架可用** | `P2/P3/P4/P16` 四个骨架各被**至少一个真实页面**消费，且骨架内 0 个 `switch (domain)` | §3「甲的交付」 |
| **E4** | **机器证据全绿** | `npx tsc --noEmit` exit 0 · `npx jest --ci` 0 failed · `npm run rulers` 四把 exit 0 | §0 DoIT 第 6 条 |
| **E5** | **无灰色地带** | ⛔ 提交里不留 `skip` / `todo` / `only`；⛔ 不留 `|| true`；未做完的项**显式登记**在 §5 而不是隐藏 | 测试铁律 T5 |

> ⛔ **不属于 Phase 1 的出口门**：EAS 真机构建、真机安全区矩阵、内测分发 —— 全部归所有者（需要账号 + 真机）。

---

## 2. 子任务清单与执行顺序

> **顺序即依赖**：P1-01/02/03 是全部后续任务的前置（数据层、依赖、字阶）；P1-04→05→06 是组件批次（按 §8.1 第 0 批分层）；P1-07…11 是骨架；P1-12 是切片必需的域组件；P1-13…16 是两个纵向切片。

| 批次 | 编号 | 子任务 | 依赖 | 写作用域 |
|---|---|---|---|---|
| **地基** | [P1-01](P1-01-平台接线App消费根shared.md) | **平台接线：让 App 消费仓库根 `shared/`** | — | `shared/api/**`、`app/jest.config.js`、`app/tsconfig.json`、`app/src/shared/**` |
| | [P1-02](P1-02-依赖准入与数据层.md) | 依赖准入与数据层（query / 落盘 / 列表容器 / Markdown） | P1-01 | `app/package.json`、`app/jest.*`、`app/src/shared/**`、[依赖准入登记](../../evaluation/App依赖准入登记.md) |
| | [P1-03](P1-03-字阶落地.md) | 字阶落地（关 **TD-44**：M3 官方表 → 生成 `fontMetrics` + 三条生成期自校验） | — | `tokens/design-tokens.css`、`scripts/gen-tokens.js`、`scripts/design-debt-report.js`、`tokens/generated/**`、`app/src/design-system/typography.ts` |
| **组件** | [P1-04](P1-04-A层组件.md) | A 层原子 **12 个**（`A01`–`A12`）＋补齐 `icon-size` 令牌组 | P1-03 | `app/src/components/ui/**`、`app/src/design-system/**`、`tokens/design-tokens.css`、`scripts/gen-tokens.js`、`tokens/generated/**` |
| | [P1-05](P1-05-C层控件.md) | C 层控件 **11 个**（`C01 C04 C05 C06 C07 C09 C10 C12 C14 C19 C21`） | P1-04 | `app/src/components/ui/**` |
| | [P1-06](P1-06-K层组合.md) | K 层**内容与列表组合** **5 个**（`K06 ListItem` · `K07 SectionHeader` · `K08 Card` · `K12 RankingRow` · `K17 EntityCard` 5 域变体） | P1-05 | `app/src/components/ui/**` |
| | [P1-07](P1-07-T层四态与O层覆盖层.md) | T 层**四态 6 个** + O 层**覆盖层 5 个**（`O01 O02 O03 O05 O08`） | P1-05/P1-06 | `app/src/components/ui/**`、`app/src/app/_layout.tsx`、`app/src/i18n/errors.ts` |
| | [P1-08](P1-08-切片必经域组件.md) | **切片必经的域组件** **10 个**（`K11 K18 D01 D02 D03 D10 D11 D18 D24 D27`） | P1-05…07 | `app/src/components/ui/**`、`app/src/i18n/**`、`app/src/design-system/typography.ts` |
| **骨架** | [P1-09](P1-09-骨架P2列表.md) | 骨架 **`P2` 列表**（= **`K05 ListScreen`**：分页状态机 + 四态 + 位置/筛选保持） | P1-06/P1-07/P0-06 | `app/src/components/ui/**`、`app/src/features/navigation/secondaryTabs.ts` |
| | [P1-10](P1-10-骨架P4表单.md) | 骨架 **`P4` 表单**（= **`K01 Form` + `K02`/`K03`/`K04`**：字段 DSL + 校验 + 草稿 + 离开确认） | P1-05/P1-07/P1-02 | `app/src/components/ui/**`、`app/src/i18n/**` |
| | [P1-11](P1-11-骨架P3详情.md) | 骨架 **`P3` 详情**（作者投影 + 互动条 + 评论区）→ 落 **`src/proto/P3`**（§5-3） | P1-06/P1-08/P1-09 | `app/src/proto/P3/**` |
| | P1-12 | 骨架 **`P16` 静态**（离线优先富文本 + 回落本地） | P1-02/P1-04 | `app/src/components/ui/**` |
| **鉴权** | P1-13 | **token 供给与登录最小链路**（`expo-secure-store` + 401 口径） | P1-01/P1-02 | `app/src/features/auth/**`、`app/src/app/**` |
| **切片** | P1-14 | **工具 A**：`T-04` 校方系统列表 + `T-05` 内嵌浏览器（含 `D27` 会话三态） | P1-06/P1-08 | `app/src/features/tools/**`、`app/src/app/**` |
| | P1-15 | **工具 B**：`T-03` 课表导入（注入读表 → 制表符 → preview → 确认） | P1-14 | `app/src/features/tools/**` |
| | P1-16 | **工具 C**：`T-02` 课表周视图（`P11` 网格 + 本地优先缓存） | P1-15/P1-13 | `app/src/features/tools/**` |
| | P1-17 | **食堂**：`S-07` 区域 → `S-08` 店铺 → `S-09` 菜品 → `S-10` 详情 | P1-09/P1-11/P1-13 | `app/src/features/square/**`、`app/src/app/**` |

> **为什么鉴权（P1-13）排在骨架之后、切片之前**：`T-04/T-05`（内嵌校方系统）与课表抓取**只依赖校方站点的 cookie**，与我们的 JWT 无关；只有 `T-02`（`GET /schedule/week`）与写操作需要 JWT。这样 P1-04…12 **完全不阻塞**。

> ⚠️ **K 层 10 个的归属已修正（v1.0 → v1.1）**：原 P1-06 写的是"K 层 10 个（`K01`–`K08`、`K12`、`K17`）"，但其中
> **`K05 ListScreen` 就是 `P2` 列表骨架**、**`K01`–`K04` 就是 `P4` 表单骨架与它的三件内部件** ——
> 它们已经分别安排在 **P1-09** 与 **P1-10**，落在 P1-06 就是**同一个组件被两个任务各做一半**。
> 现改为按**内聚性**切：**P1-06 只做内容/列表组合 5 个**；`K05` 归 P1-09；`K01`–`K04` 归 P1-10。
> **合计仍是 K 层 10 个**，只是分布到 3 个任务（5 + 1 + 4）。

> **进度**：**P1-01 ✅ · P1-02 ✅ · P1-03 ✅ · P1-04 ✅ · P1-05 ✅ · P1-06 ✅ · P1-07 ✅ · P1-08 ✅ · P1-09 ✅ · P1-10 ✅ · P1-11 ✅**（2026-10-02；24 suites / 688 tests · tsc 0 · 四把尺子 exit 0 · 另有 6 个独立 bug 修复提交）；P1-12…P1-17 ⏳。
> ⛔ 提交策略：**一个子任务一个提交**；测试没过先修 bug，**bug 修复也是独立提交**（所有者指令）。

> **两个切片为什么各自需要 P1-08 的域组件**（组件调研结论，⛔ 不是可选项）：
> · 工具切片**第一页** `T-04` 的交付物是"单项配置 + **会话状态**" → 缺 `D27 SchoolSystemCard` 就没有地方呈现会话三态；
> · 食堂切片 `S-07` 的"榜单前置"与 `S-08` 的区域榜**是同一个组件** `K12 RankingRow`；
> · `S-10` 的点评列表要 `K17(review)`、图片要 `K18 MediaGrid`、评价区要 `D01/D02/D03`、评级要 `D11 RatingScale`（§2.6 明令**不得**用 `D10 StarRating` 代替）。


---

## 3. 施工原则（**本包的五条纪律**）

1. **一个子任务 = 一个提交**，conventional commit；**测试没过就先修 bug，bug 修复也是独立提交**（所有者指令）。
2. **每个子任务先写测试再写实现**（测试用例写在本文档包各子任务的「测试用例」节；编号 `TC-P1-xx-yA/M`）。⛔ 但**不做水平切片**：按"一条用例 → 一段实现"推进，而不是"先把所有测试写完"。
3. **界面视觉只能来自令牌或消费令牌的组件**（宪法 1.4）；⛔ 自有 UI 组件**必须**落 `app/src/components/ui/**`（`design-debt-report.js` 的 `ownUiComponentRefs` 硬编码统计这个路径，放别处尺子永远红）。
4. **不新建第二套机制**：安全区只用 `Screen`/`useScreenInsets`；状态保持只用 `SecondaryTabStore`；错误文案只用 `i18n/errors.ts` 的 `toErrorResponse`/`toErrorCopy`；分页状态只在骨架里实现一处。
5. **改动必须回写文档**（宪法 15.4-3）：凡与本包或上游文档口径不一致的，改完在对应文档加注记，⛔ 不留"文档说 A、代码做 B"。
6. **⛔ 不要用 shell 传非 ASCII 文本去改文件**（P1-10 实测事故：PowerShell 命令行按本地代码页编解码，`Get-Content -Raw` + `WriteAllText` 会把整个文件的中文写成乱码）。改文件一律用编辑器工具（`write`/`edit`），它们不经过 shell；需要批量文本处理时，写成**脚本文件**再跑，⛔ 不要把中文放在命令行参数里。

---

## 4. 已实测的前置断点（P1-01 的存在理由）

Phase 1 一开始就会撞上两堵墙，**已实测确认，不是推测**：

| 断点 | 实测命令与结果 | 影响的子任务 |
|---|---|---|
| `shared/api/config.js` 用了 **Vite 专有的 `import.meta.env`** | `app` 内 `jest` 加载该模块 → `TypeError: Cannot read properties of undefined (reading 'VITE_API_BASE_URL')` | P1-01…16 全部（任何数据请求） |
| 根 `node_modules` **没有 `@babel/runtime`**（只有 `app/node_modules` 有），而 `shared/*.js` 由 app 的 babel 编译后会 require 它 | `jest` 加载 `shared/api/canteen.js` → `Cannot find module '@babel/runtime/helpers/interopRequireDefault' from '../shared/api/canteen.js'` | 同上 |
| `shared/api/request.js` 从 **`localStorage`** 取 token（`typeof window !== 'undefined'`），RN 下恒为 `null` | 代码通读 + `shared/api/request.js:13-15` | P1-12…16（需要鉴权的接口） |

> Web 侧已有的解法可作模板：[`frontend/vite.config.js:32-36`](../../../frontend/vite.config.js) 用 `@shared` 别名指向 `../shared`，**并且显式把 `@tanstack/react-query` 也别名到 `frontend/node_modules`** —— 正是同一类"跨包解析"问题。
> ⛔ **不允许 fork `shared/`**（宪法 9.6/9.7）：它是 App 与 Web 的**唯一真源**，只能让它变得平台中立。

---

## 5. 阻塞与待所有者拍板项（**本包不自行拍板**）

| # | 事项 | 阻塞本包的哪个任务 | 本包的规避方式 |
|---|---|---|---|
| 1 | **C-03 / C-04 / C-05 二级 Tab 集合**（TO-CONFIRM） | 只影响"页面挂在哪个二级格下"，不影响页面本身 | **两个切片一律从 `T-01`/`S-07` 首页入口进入**，`SECONDARY_TABS` 保持为空 → **不预占所有者决定**；所有者定了之后接线 = 改 3 个数组 + 3 行断言 |
| 2 | **C-06 详情页是否保留顶栏信箱** | `P1-09`(DetailScreen) 的顶栏归属 | 骨架把顶栏做成**可注入**（`topMode`/`headerOverlay`），两种口径都能接 |
| 3 | **`DetailScreen` / `StaticPage` 无正式组件 ID**（组件定义 §1.1 要求七项声明） | P1-09/P1-10 的落点 | 按 §1.2「原型骨架豁免 9.14-③」落 **`src/proto/P3`、`src/proto/P16`**，Phase 1 完成时回写 §2.7（宪法 15.4-3） |
| 4 | **列表容器选型**（`FlatList` / `FlashList` / `LegendList`，宪法 9.9） | P1-07 与全部列表页 | 由 P1-02 按宪法 3.4 **依赖准入五项**定，并在 [依赖准入登记](../../evaluation/App依赖准入登记.md) 留档 |
| 5 | **落盘层**（草稿 / 本地优先缓存；现有仓库只有 `expo-secure-store`，而 4.1.2-2 规定它只存 JWT） | P1-08 草稿、P1-15 缓存、P1-16 缓存 | 由 P1-02 定并留档 |
| 6 | **`P18` 内嵌容器与 `react-native-webview` 准入** | P1-13（`T-05`） | Phase 0 已落代码（P0-08），P1-13 只需补准入登记 |

> **口径**：上表 1/2 是**所有者的事**，3–6 是**技术选型**（走宪法 3.4 的既有准入流程，不新增所有者决策）。⛔ 任何一条都不允许"先按我喜欢的做、以后再改文档"。

---

## 6. 归所有者的部分（**本包做到哪一步为止**）

| 项 | 为什么不是本包能做 |
|---|---|
| **真机跑通两个切片**（E2 的"真机可用"） | 需要设备 + 一个 development build（见 [TODO §5.1-④](../../TODO.md)） |
| **EAS 构建 / 内测分发** | 需要 Expo 账号（TO-CONFIRM C-17/C-02） |
| **R1/R2/R7 真机项** | 需要设备 |
| **二级 Tab 集合 / 详情顶栏口径** | 见 §5 第 1、2 条 |

---

## 7. 已发现的上游文档错误（**必须在本包内更正**）

反推过程中发现**上游文档与后端/代码事实不符**的 9 处。它们不是本包的错，但**照着写代码会 404 / 做错组件**，因此在所属子任务里一并更正，并**改原文**（⛔ 不能只在任务书里写"实际是 X"，否则下一份任务书还会踩同一个坑）。

| # | 位置 | 文档写的 | 实际（证据） | 更正落在 |
|---|---|---|---|---|
| 1 | 页面清单 §3-T `T-03` | `POST /api/schedule/import` | `POST /api/schedule/import/commit`（`routes/schedule.js:7`） | P1-15 |
| 2 | 页面清单 §3-S `S-08`/`S-13` | `GET /regions/:id/ranking` | `GET /regions/:regionId/top-products?limit=`（`routes/canteen.js:545`） | P1-17 |
| 3 | 页面清单 §3-S `S-09` | `GET /shops/:id/hot` | `GET /shops/:shopId/hot-products`（`:1054`） | P1-17 |
| 4 | 页面清单 §3-S `S-10` | `GET /products/:id/reviews` | `GET /products/:productId/comments`（`:1539`） | P1-17 |
| 5 | 页面清单 §3-S `S-30` | `GET /canteen/articles` | `GET /canteen/food-articles`（`:2449`） | 仅登记（非内测） |
| 6 | 页面清单 `S-25`/`M-04`/`M-15`/`F-01` | 关键组件写 `ConfirmDialog` | `O04` 已并入 `O03 AlertDialog(danger)`（组件定义 §0.6） | P1-14 / P1-17 |
| 7 | 页面清单 `C-05`/`S-29` | 关键组件写 `CharCounter` | ⛔ 组件定义 §3.3.1 明令**不得另建**，它是 `C05 TextArea` 的 `counter` 属性 | P1-05 |
| 8 | 页面清单 `S-09` | 关键组件写 `CategorySidebar` | 组件定义 §3.0 判它是**页面级布局**，不是组件 | P1-17 |
| 9 | 页面清单 §2.3 ↔ §4.1 | `K05 ListScreen` 引用数有 `≥22` / `26` / `27` 三个口径 | 需一次说清 | P1-09 |

> **另有 3 处"文档内部自相矛盾"**（不是错，但必须收敛，否则施工时会出现两种合法写法）：① 图标 5 档与 `strokeWidth=2` 在组件定义 §2.1.1 是**硬规则**、在 §8.3-12 是**【提案】**；② `gap.*` / `radius.*` / Skeleton 专色在令牌规范 §四**只有取值没有 token 名**；③ `K22 SegmentedTabs`（页内 ≤3）与 `TopTabStrip`（顶部 Tab 可 >5 横向滚）的**阈值与命名**未裁决（页面清单 `D-4`）。→ 分别落在 P1-03（①②）与 P1-09（③）。

---

## 8. 测试用例

全部用例编号与期望写在 **[docs/app/test/Phase1测试用例.md](../../test/Phase1测试用例.md)**（沿用 Phase 0 的五层架构；本包每个子任务文档的「测试用例」节给出自己那几条）。
编号规则 `TC-P1-<子任务号>-<序号><类型>`，`A` = 自动化（Jest / 脚本），`M` = 人工（真机或通读）。

---

## 9. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立。拆 **17 个子任务**（3 地基 + 5 组件批次 + 4 骨架 + 1 鉴权 + 4 切片）；对齐组件定义 §8.1 第 0 批；记录 **3 个已实测断点**；登记 **2 项所有者待拍板** + 4 项技术选型 |
