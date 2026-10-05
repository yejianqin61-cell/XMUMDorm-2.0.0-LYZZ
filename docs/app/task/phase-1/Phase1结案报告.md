# Phase 1 结案报告 · App 骨架层与两个纵向切片

**日期**：2026-10-02　**版本**：v1.0
**范围**：`docs/app/task/phase-1/` 的 **17 个子任务**（P1-01 … P1-17）
**依据**：《App 设计宪法》v1.4 · 组件类型定义 v2.0 · 页面清单（88 页 / 首发 81）· 任务包 [README](README.md) · [测试用例](Phase1测试用例.md)

---

## 1. 结论（先看这段）

**Phase 1 全部 17 个子任务已完成并逐个提交**，全量机器验证通过：

| 门 | 判据 | 实测 |
|---|---|---|
| A1 | `npx tsc --noEmit` | ✅ exit 0 |
| A2 | `npx jest --ci`（App） | ✅ **30 suites / 888 tests**，0 failed |
| A3 | 仓库根 `npx jest`（`shared/` 无回归） | ✅ 46 suites / 668 tests |
| A4 | 四把尺子（设计债 / 对比度 / 品牌色阶 / 令牌生成） | ✅ 全部 exit 0，`宪法级违规：无` |
| A5 | `npx expo-doctor` | ✅ 21/21 |
| A6 | `npx expo export --platform android` | ✅ exit 0 |
| A7 | 提交纪律（一任务一提交 · `conventional commit`） | ✅ 见 §4 |

**⛔ 未 push**（所有者决定）。本地领先 `origin/dev-yjq` **50 个提交**。

---

## 2. 交付了什么

### 2-1 地基（P1-01 … P1-03）
- **平台接线**：`shared/api/platform.js` 是 `shared/**` 里**唯一**允许"宿主告诉我事实"的注入点（`baseUrl` + 同步 `getToken`）；App 侧 `configureAppApi()`，Web 侧不注入 → Web 零变化（宪法 9.6/9.7）。
- **数据层**：落盘（`xmumdorm` 命名空间 + **凭据护栏** `CredentialStorageError`）、连通性、query client、`useListPagination`、分页状态机。
- **字阶**：字体度量令牌 + `Text` 的 14 个 role；**只用系统字体**。

### 2-2 组件库（P1-04 … P1-10，共 **60+ 个组件**）
- A 层原语（`Surface` `Stack` `Divider` `Icon` `Avatar` `Badge` `Chip` `Skeleton` `Progress` `Pressable`）
- C 层控件（`Button` `Input` `TextArea` `SearchField` `Select` `MultiSelect` `Checkbox` `Switch` `SegmentedControl` `OtpInput` `TagPicker` `RatingScale` `StarRating` …）
- K 层复合（`ListItem` `SectionHeader` `Card` `RankingRow` `EntityCard` `MediaGrid` `CommentItem` `CommentThread` `CommentComposer` `QuickActionGrid` `MarkdownReader` `SchoolSystemCard` **`ListScreen`** **`Form`/`FormSection`/`FormField`/`ErrorSummary`**）
- T 层四态（`EmptyState` `ErrorState` `LoadingState` `OfflineBanner` `ListFooter` `PullToRefresh`）
- O 层覆盖层（`Toast` `InlineNotice` `AlertDialog` `ActionSheet` `InputSheet`）

### 2-3 四个骨架（P1-09 … P1-12）
`P2 ListScreen` / `P4 Form`（组件层）· `P3 DetailScreen` / `P16 StaticPage`（`src/proto/`）。
落点已在**组件定义 §2.7 回写**（含"为什么不落 `src/proto/`"的理由）。

### 2-4 鉴权最小链路（P1-13）
`expo-secure-store` 存 JWT + **内存镜像**供请求层同步读；会话状态机；登录页。
⚠️ 更正上游"401 口径"：后端**用两个状态码**（没带令牌 `401` / **令牌过期 `403`**），
且 `403` **还**表示封禁（靠响应体 `banned`/`muted` 区分）→ 为此给 `shared/api/request.js`
补了 `err.body`（独立提交）。

### 2-5 两个纵向切片（P1-14 … P1-17）
| 切片 | 交付 | 关键口径 |
|---|---|---|
| **工具 A** | `T-04` 会话列表 + `T-05` 内嵌浏览器（含「读取本页课表」） | 会话三态**基于 DOM 事实**（页面有没有密码框），⛔ 不猜登录 URL |
| **工具 B** | `T-03` 课表导入（预览 → **整表覆盖**二次确认 → 提交） | 路径按实际 `/import/commit`；改文本即**作废预览** |
| **工具 C** | `T-02` 周视图（`P11` 网格 + 周窗口 + 本地优先） | 行键=**开始时间**（接口无"节次"）；今天高亮**仅当前教学周**（吉隆坡时区） |
| **食堂** | `S-07` → `S-08` → `S-09` → `S-10` | 评分是**五档枚举不是星星**；评论**匿名投影**；`null` 不冒充 0 |

---

## 3. 测试用例体系（口径已在 [测试用例](Phase1测试用例.md) 固化）

**五层架构 + 6 条接缝**（S-1 组件渲染 / S-2 集成 / S-3 落盘 / S-4 纯规则 / S-5 静态扫描）：
- **纯规则**（S-4）最厚：状态机、刷新/追加口径、TTL、解析、档位映射、**网格行**；
- **源码扫描**（S-5）用**共享的 `stripComments`** —— 这条工具本身是被 3 次误报逼出来的；
- **依赖准入**是**可执行门**：P1-02 的用例要求"每个依赖都在准入登记里有记录"，它在 Phase 1 里**抓到 3 次真实漏登**（`expo-system-ui`、`expo-image`、`expo-asset`）。

**统计**：17 个子任务共 **34 个编号 / 200+ 条断言**（自动化）+ 17 条真机人工项。

---

## 4. 提交纪律与独立修复

**一任务一提交**（`conventional commit`）全部遵守。Phase 1 期间产生的**独立修复提交共 8 个**：

| 提交 | 修的是什么 | 怎么发现的 |
|---|---|---|
| `e56209d` | 源码扫描误报 `strokeWidth`（注释） | P0-05 用例 |
| `dfa7afc` | 源码扫描误报 `▾`（注释） | P0-06 用例 |
| `9096208` | **根因**：扫描必须剥注释 → 抽出共享 `helpers/sourceScan.ts` | 第 3 次误报 |
| `0fd6e37` | `Pressable` 的 `accessibilityState` 被覆盖成 `undefined` | P1-05 用例 |
| `1ba93b5` | `ErrorCopy.objectLabel` 缺失（文案模板引用不到） | P1-06 用例 |
| `4dfb848` | 测试脚手架：一次 `it` 里两次 `render()` 会**污染下一个用例** | P1-07 用例 |
| `83f2a6a` | `shared/api/request.js` 抛错**丢掉响应体** → App 无法区分 403 的两种含义 | P1-13 设计 |
| `fed918a` | 补装 `expo-asset`（`expo-font` 的运行时依赖，未装未声明） | P1-14 用例（准入门禁） |
| `371c237` | `K01` 草稿**异步恢复覆盖外部初始值** | P1-15 用例 |

---

## 5. 上游文档更正（**已在本包内更正**，共 13 条）

完整表在 [README §7](README.md#7-已发现的上游文档错误必须在本包内更正)。最要紧的四条：
1. **`T-03` 的路径**：文档 `POST /api/schedule/import` → 实际 `/import/commit`；
2. **食堂三个路径**：`/ranking` → `/top-products`、`/hot` → `/hot-products`、`/reviews` → `/comments`；
3. **P1-13 的"401 口径"**：后端实际用 `401`+`403` 两个码，且 `403` 有**两种含义**；
4. **`S-10` 的 `StarRating`**：评分是**五档中文枚举**，没有星级字段。

另有两处"命名与真实不一致"：`SessionBadge`（实为 `D27` 内部徽标）、`P11` 的"节次"（接口只给时间）。

---

## 6. 遗留与风险（**如实登记，不掩盖**）

### 6-1 待真机（**所有者执行**）——17 条 `TC-P1-xx-1M`
其中最关键的三条：
- **R3 会话持久性**：打开校方系统 → 学号登录 → **杀进程重启**看会话是否保持；
- **`T-05` 读表**：在 AC 课表页点「读取本页课表」，看回显行数与实际课表是否一致；
- **`T-02` 离线**：飞行模式下仍能看到上次缓存的课表，且明确标注"不是最新"。

### 6-2 已登记的技术债
| 编号 | 内容 |
|---|---|
| **TD-45** | iOS 真动态字体需要本地原生模块（当前只做字号缩放） |
| **TD-46** | `P1-05` 组合控件的中文 a11y 标签需要补齐 `a11y.*` 词条 |
| — | 「清除会话」清不掉校方 cookie（需未准入的原生 cookie 模块），页面已**如实说明** |
| — | 食堂评分的服务端 `errors[]` 是中文串（需后端返回结构化错误码） |
| — | 食堂四页**未接本地优先缓存**（TTL 与 key 已备好，接的时候不改页面契约） |
| — | `K05` 的 `listHeader` 槽位为 P1-17 新增；P1-09 的 `header` 禁令**继续有效** |

### 6-3 范围外（**已明确不属于 Phase 1**）
`S-07` 的广告位/榜单 · `S-10` 发评论（需已暂缓的 `O07 PickerSheet`）与收藏 ·
`TodayCard`（与 `T-01` 完整内容一并裁）· `T-01`/`S-01` 的完整内容。

---

## 7. 下一步建议（**不擅自开工**）

1. **真机验收**（6-1）：这是唯一能证伪"骨架在真设备上成立"的手段，也是 `R3` 的结论来源；
2. **`TO-CONFIRM C-03/C-04`**（二级 Tab 集合）与 **`C-02`（开发者账号类型）** 仍卡着广场/工具 Tab 的完整内容；
3. Phase 2 建议按"**逐页交付 + 逐页回写**"（宪法 15.4）推进，并把 §6-2 的债**随页清偿**（而不是另开"还债期"）。

---

## 8. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | Phase 1 结案：17/17 子任务完成；30 suites / 888 tests；8 个独立修复；13 条上游更正；§2.7 原型落点回写；遗留与范围外登记 |
