# App 组件类型定义

**日期**：2026-10-02　**版本**：**v2.0**（按第二轮 IA 重排 + 所有者第三轮范围裁决 + 宪法 9.14／10.5／§16 硬审计）
**性质**：本文件是[《App 前端风格体系》](./App前端风格体系.md) §十二所指的**组件规范正文**。风格体系回答"**做什么样**"，宪法回答"**不许越界**"，本文件回答"**有哪些组件类型、每个类型的解剖 / 变体 / 状态 / 契约 / 双端实现 / 引用数是什么**"。
**上游**：
- [App 设计宪法](../constitution/App设计宪法.md) 第 1.3（红线）/ 1.4（全局组件化）/ 2.1、2.1.1、2.3、2.4、2.5（令牌与字阶）/ **9.1–9.14（原型与组件纪律；9.14 为套壳禁令）** / **10.4、10.5（错误三要素与文案纪律）** / **16（两层图标）**
- [App 页面清单与结构盘点](../product/App页面清单与结构盘点.md) **v2.0**（**页面 ID 空间与 4 Tab IA 的唯一定义处**：`A-`/`S-`/`T-`/`C-`/`M-`/`F-`/`P-`）
- [App 设计令牌规范](./App设计令牌规范.md)（逐令牌实测对比度与角色）· [App 前端风格体系](./App前端风格体系.md)（§十二 三层买/建、§十三 无嵌套、§十四 文案、§十五 图标、§十六 红线）
- [App 图标方案调研](../research/App图标方案-Lucide与平台图标.md)（**已核实**的 Lucide 名、两层判据、尺寸 16/20/24/32/48、strokeWidth 全局 2、禁 barrel 导入、Tab 图标属第 2 层）
**下游**：[App 页面清单与结构盘点](../product/App页面清单与结构盘点.md)（页面声明"需要什么组件"）、设计阶段第 5 件（任务拆解）

> **数值与状态约定**：`【已定】`＝宪法或所有者裁决给定；`【实测】`＝本项目脚本/真机/官方资产测得；`【算得】`＝由实测机械推导；`【提案】`＝本次设计提案，**必须在脚手架期用真机复核后定稿**；`【待核实】`＝脚手架期须实测，**不得当已成立**。**不允许把 `【提案】`／`【待核实】` 当已验证规格使用。**
> **v2.0 变更摘要**：① 全部消费关系按**第二轮 IA**（广场/工具/校园里/我的）重排，v1.0 的 `B-/D-/E-/G-/H-` 页号**全部作废**；② 新增 **§0.6 宪法 9.14 套壳审计**（21 条逐条登记）；③ **每张注册表新增 `引用` 列**（消费页数 + 页面 ID）；④ 新增 **§3.5 校方系统会话组件**（`D27` + `P18`）；⑤ **§3.4 通知阶梯**并入 ToS 门禁/通知权限/账号受限/会话过期/禁阻塞公告；⑥ 新增 **§3.6 文案纪律绑定**与 **§3.7 错误文案三要素**；⑦ §5.1 令牌绑定表改用**新品牌令牌**；⑧ §5.2 禁止项 12 条增至 **19 条**；⑨ §6 双端映射新增 `react-native-webview` 与**图标层**列；⑩ §7 补 §16 专项 a11y 规则。

---

## 0. 一页速览
### 0.1 组件分层（7 层）
```
L0 平台原语        ← 买（原生容器 / 手势 / 动效 / 虚拟化 / 图片 / WebView）。宪法 4.3：导航壳禁止自绘
L1 令牌与主题      ← tokens / theme（唯一事实源，见风格体系 §一）
L2 原子      12 个 ← Surface / Text / Stack / Spacer / Divider / Icon / Avatar / Badge / Chip / Skeleton / Progress / Pressable
L3 控件      18 个 ← Button / IconButton / Fab / Input / TextArea / SearchField / Select / MultiSelect / Checkbox /
                     Switch / SegmentedControl / DatePicker / TimePicker / MonthPicker / Stepper / OtpInput /
                     MediaPicker / TagPicker
L4 组合      20 个 ← Form / FormSection / FormField / ErrorSummary / ListScreen / ListItem / SectionHeader / Card /
                     StatTile / MetricRow / QuickActionGrid / RankingRow / AuthorRow / AnonAuthorLabel / LevelBadge /
                     ExpBar / EntityCard / MediaGrid / FilterChips / SegmentedTabs
L5 状态四态   6 个 ← EmptyState / ErrorState / LoadingState / OfflineBanner / ListFooter / PullToRefresh
L6 覆盖层    11 个 ← Toast / InlineNotice / AlertDialog / ActionSheet / BottomSheet / PickerSheet /
                     InputSheet（文本底框）/ FullScreenModal / FullScreenNotice（全屏通知）/ PermissionPrompt / ReportSheet
L7 域专用    15 个 ← CommentThread / CommentItem / CommentComposer / ReplyBar / ChatBubble / ChatComposer /
                     ChecklistItem / StarRating / RatingScale / CalendarHeatmap / MarkdownReader / ImageViewer /
                     BannerSlot / CountdownButton / SchoolSystemCard
                    ────────────────
                     ＋ 原型骨架 15（14 使用 + 1 建议新增：P18 内嵌网页容器）
                     ＋ 系统契约 5（推送载荷 / 通知渠道 / 深链 / 触感 / insets —— 不是组件但必须定义）
```
### 0.2 关键数字（**v2.0 是收敛，不是扩张**）
| 指标 | 结果 |
|---|---|
| **自研组件总数** | **82**（原子 **12** + 控件 **18** + 组合 **20** + 四态 **6** + 覆盖层 **11** + 域专用 **15**） |
| v1.0 对照 | **102** → **82**，**净减 20** |
| **移除/降级登记条目** | **21**（20 条移除/降级 + 1 条移至原型层 `D15`）；其中 **19 条是「0 或 1 处使用」**，1 条移出组件层 |
| 核心必做（与域无关） | **67**（12 + 18 + 20 + 6 + 11） |
| 域专用（随模块逐个交付） | **15** |
| 原型骨架 | **15**（14 使用 + **1 建议新增待评审**：P18）；本轮未用 P8 / P12 / P17 |
| 系统契约 | **5**（不变） |
| 必须买、不许自研 | 平台原语（导航壳／手势／动效／虚拟化／图片／触感／安全区／**`react-native-webview`**） |
| 不允许做基座 | 完整设计系统 / UI kit（`react-native-paper`、`@ui-kitten`、`react-native-ui-lib`、`@rneui` 等） |
| Neo-Brutalism 允许出现的组件 | **仅 3 类**：CTA（`C01 Button.primary`）／`A08 Badge`／`K07 SectionHeader`。**第 4 类即越界，lint 或 review 阻断** |

> **为什么这一版要"减"**：v1.0 的 102 个建立在**首轮旧 IA**（广场/树洞/食堂/我的）之上，而学习资料、地图、推荐、管理后台、商家端随后整体出局，**它们当初的专用组件失去了消费者**。宪法 **9.14-③**（一处使用 = 就地写）与 **9.1**（不得预留）联合起来只有一个结论：**没有第二个消费者的组件不许存在**。
### 0.3 与《组件层调研》的粒度对照（**差异来自估算粒度与范围收敛，不是范围扩张**）
| 来源 | 说法 | 本文件展开后 |
|---|---|---|
| 组件层调研 §5 第 2 层 | 原子**约 12 个** | **12 个**（一致） |
| 组件层调研 §5 第 2 层 | 组合**约 20 个** | **控件 18 + 组合 20 + 四态 6 + 覆盖层 11 + 域专用 15 = 70** |
| 风格体系 §12.3 | 102 个（v1.0 口径） | **82 个**（见 §0.6）；风格体系该段数字**待随本文件更新**，登记为待同步项 |
| 差异原因 | 调研的"组合约 20"把控件、覆盖层、四态、域专用都算进一个桶 | 本文件按"**是否与业务域耦合**"拆开：核心 **67** 个 + 域专用 **15** 个 |
> **为什么必须拆开**：宪法 9.5 要求"**第一个纵向切片必须真正消费组件库与令牌**"。82 个一次性铺开，第一个切片只能验证其中几个；拆开后**先交付 32 个**（§8.1 第 0 批）即可让任何模块开工。这是控制"组件库写了 0 引用"风险的结构性手段。
### 0.4 四条不可协商的组件纪律（`【已定】`）
| # | 纪律 | 依据 | 违反后果 |
|---|---|---|---|
| 1 | **组件是令牌的唯一消费者**：组件内**不得出现 `#hex`、`fontSize` 字面量、间距字面量** | 宪法 2.4 | `design-debt-report.js` 直接判负 |
| 2 | **不得为了"一个页面"新增组件**：先声明原型、复用现有组合；新增需说明"现有组件为何不可参数化" | 宪法 9.1 | 旧 App 的"每屏自由发挥"复发 |
| 3 | ⛔ **不得建套壳组件**（透传壳／同语义多层／为复用而抽象／样式壳） | **宪法 9.14** | 一次全局改动要多穿一层壳 |
| 4 | **自绘即自负**：凡不用平台标准组件处，必须自己实现 Reduce Motion / Reduce Transparency / VoiceOver / TalkBack 全部旁路 | 宪法 7.4 | 无障碍不达标 |
### 0.5 与《风格体系》§12.3 清单的关系（**不是两份清单，是一份的两个粒度**）
| 风格体系 §12.3 | 本文件 | 关系 |
|---|---|---|
| 原子（约 12）：`Surface` `Text` `Stack` `Pressable` `Icon` `Badge` `Divider` `Avatar` `Skeleton` `Input` `Sheet` `Toast` | `A01`–`A12` | **层归属被修正**：`Input` → `C04`、`Sheet` → `O06`、`Toast` → `O01`、`Pressable` → `A12`。**原清单把三种不同层的东西装进了一个桶** |
| 组合（约 20）：`Button` `ListItem` `Card` `SectionHeader` `EmptyState` `ErrorState` `FormField` `SearchField` `TabSegment` `Chip` `ActionSheet` `Dialog` `Banner` `ConfirmDialog` `ProgressBar` `PaginationFooter` `Refreshable` `TermsGate` `CommentItem` `MailboxRow` | `C01` `K06` `K08` `K07` `T01` `T02` `K03` `C06` `C14` `A09` `O05` `O03` `O02` `C09`+`O05` `A11` `T05` `T06` **`O12`** `D02` **`K06` 的域变体** | **同样被拆层**：`Button` 是控件；`TermsGate` 是 `O12` 的**触发场景**（§3.4.3）；**`ConfirmDialog` 已并入 `O03` 的 `danger` 变体**；`MailboxRow` 是 `K06` 的域变体；`PaginationFooter`／`Refreshable` 归四态层 |
| 原型层：8 核心 + 9 扩展 = **17** | §2.7 的 **15** | P17 已废除（宪法 9.4）、P8 随管理后台出局、P12 地图本轮不做 → 14 使用 + 1 建议新增 |
> **"不得预留"在本文件里是一条可核对的门**：82 个组件**每一个都有确定的消费者**——要么被页面直接消费（`引用` 列），要么被本文件内其它组件消费（如 `A01 Surface` 被全部组件消费、`C01 Button` 被 `K01 Form` 消费）。
### 0.6 宪法 9.14 套壳审计（**21 条移除/降级逐条登记 —— v2.0 的审计证据**）
**判据（一句话，宪法 9.14）**：*删掉这个组件、把它的内容上提一层，是否丢失任何行为？* 不丢失就是壳，**必须删**。
| # | 条目（v1.0） | 判定 | 处置去向 |
|---|---|---|---|
| 1 | `O04 ConfirmDialog` | **变体非组件** —— 只是 `O03` 的 `danger` 形态（9.14-①：独立后唯一职责就是转发 variant） | **并入 `O03 AlertDialog` 的 `danger` 变体**（§2.5） |
| 2 | `O10 ContextMenu` | **属平台** —— 长按菜单由原生容器提供 | **由平台容器提供**，不进自研层（§6） |
| 3 | `C11 RadioGroup` | **为复用而抽象（2 处使用）** —— 余下 ≤7 项互斥已由 `SegmentedControl` 承担，配送方式只剩 2 项 | **就地写**：`C14`（2–5 项）／`C10 Checkbox`（表单勾选组） |
| 4 / 9 | `C13 Slider` / `C22 FilePicker` | **0 消费者** —— 本轮无任何连续量（评分用 `D10`／`D11`，难度用 `C18`）；文件上传属学习资料，**该模块整体出局**（宪法 4.2.2-1） | **需要时再建**（不预留） |
| 5 | `K19 ImageCarousel` | **同语义多层** —— 轮播由 `D24 BannerSlot` 承担，帖内多图由 `K18` + `D21` 承担 | **折叠进 `D24`** 与 `K18 MediaGrid` |
| 6 | `D07 ReadReceipt` | **同语义多层** —— "已读"是 `D05 ChatBubble` 的**状态**，不是独立视觉单元（9.14-②） | **成为 `D05` 的 `read` 状态** |
| 7 | `D19 TocDrawer` | **同语义多层** —— TOC 与正文同属一个渲染单元 | **折叠进 `D18 MarkdownReader`** |
| 8 | `C08 Combobox` | **为复用而抽象（0 消费者）** —— 原 >15 项场景只有「学习资料课程选择器」与「组织选择」；**前者整体出局**，后者只剩 **1 处**（`P-04`） | **就地写**：`P-04` 用 `C07` + `C06`；**需要时再建** |
| 10 | `K21 Tabs` | **为复用而抽象（0 消费者）** —— ">5 项 underline tab"本轮无消费者；所有页内 tab 集合 **≤3** | **全量改用 `K22 SegmentedTabs`** |
| 11 | `O09 Popover` | **属平台（手机端无消费者）** —— 锚点浮层是桌面式交互 | **以 `O05 ActionSheet` 承担** |
| 12 | `D08 TodoItem` | **为复用而抽象（1 处使用）** —— 只有 `T-06` | **就地写**：`T-06` 内联（`C10` + `K06`） |
| 13 | `D12 TemplatePicker` | **为复用而抽象（1 处使用）** —— 只有 `C-05` | **就地写**：`C-05` 内联（`C14` + `C05.counter`） |
| 14 | `D13 OrganizationPicker` | **为复用而抽象（1 处使用）** —— 只有 `P-04` | **就地写**：`P-04` 内联（`C07` + 成员资格校验） |
| 15 | `D14 TermPicker` | **变体非组件** —— 学期 = 年份范围 + 受限月份，就是 `C17 MonthPicker` 的配置 | **并入 `C17`**（`yearRange` + `allowedMonths:[2,4,9]`） |
| 16 / 17 | `D17 HotspotMap` / `D20 PdfViewer` | **0 消费者** —— 地图本轮不做（所有者第三轮指令）；学习资料整体出局 | **删除**；需要时再建（PDF 随 M10 单独立项） |
| 18 / 19 | `D22 DownloadBar` / `D23 UploadProgress` | **为复用而抽象（0 消费者）** —— 下载计数与服务端上传状态轮询都属学习资料 | **删除**；`C20 MediaPicker` 已 own 本地进度与单项重试 |
| 20 | `D26 DueBadge` | **样式壳（1 处使用）** —— 只有 `T-06`，且只是给日期加一层色块外壳（9.14-④：应直接用令牌） | **就地写**：`T-06` 行内用**状态色令牌 + 文案**（警告必须同时出现图标与文案） |
| 21 | `D15 TimetableGrid` | **它不是组件层的东西，而是 `P11 课表网格` 的骨架渲染器本身** | **移至原型层**（`src/proto/P11`） |

**21 条按判定分组（每条只记一个主因，故合计 21）**
| 判定 | 条数 | 条目 |
|---|---|---|
| **透传壳**（9.14-①） | **2** | `O04 ConfirmDialog`、`O10 ContextMenu` |
| **同语义多层**（9.14-②） | **3** | `K19 ImageCarousel`、`D07 ReadReceipt`、`D19 TocDrawer` |
| **为复用而抽象**（9.14-③，1 处或 0 处使用） | **9** | `C08 Combobox`、`C11 RadioGroup`、`C22 FilePicker`、`K21 Tabs`、`D08 TodoItem`、`D12 TemplatePicker`、`D13 OrganizationPicker`、`D22 DownloadBar`、`D23 UploadProgress` |
| **样式壳**（9.14-④） | **1** | `D26 DueBadge` |
| **0 消费者**（9.14-③ 的极端情形） | **3** | `C13 Slider`、`D17 HotspotMap`、`D20 PdfViewer` |
| **属平台**（不进自研层） | **1** | `O09 Popover`（`O10` 已记入"透传壳"） |
| **变体非组件** | **1** | `D14 TermPicker`（`O04` 已记入"透传壳"） |
| **移至原型层** | **1** | `D15 TimetableGrid` |
> **19 条是「0 或 1 处使用」**：见上表 `C08`(0) `C11`(2，已由它件承担) `C13`(0) `C22`(0) `K19`(0) `K21`(0) `O04`(1) `O09`(0) `O10`(由平台提供) `D07`(1) `D08`(1) `D12`(1) `D13`(1) `D14`(1) `D17`(0) `D19`(1) `D20`(0) `D22`(0) `D23`(0) `D26`(1)，**另 1 条（`D15`）移出组件层至原型层**。
> **宪法 9.1／9.14-③ 的合并结论**：上表标"需要时再建"的条目（`C08` `C13` `C22` `D17` `D20` `D22` `D23`）**一律不得以"先建着"的形式预留** —— 写出来就必然有人用，这是 9.14 的正面要求。

---

## 1. 命名、分层与判定规则
### 1.1 命名规则
| 项 | 规则 | 例 |
|---|---|---|
| 代码名 | `PascalCase`，**单数名词**；域变体用**一个组件 + 变体枚举**，不为每个域建组件 | `EntityCard variant="listing"`，不是 `MarketplaceItemCard` |
| 目录 | `src/tokens/`（L1）、`src/ui/atom/`（L2）、`src/ui/control/`（L3）、`src/ui/composite/`（L4）、`src/ui/state/`（L5）、`src/ui/overlay/`（L6）、`src/ui/domain/`（L7）、`src/proto/`（原型） | — |
| 本文件编号 | `A` 原子 / `C` 控件 / `K` 组合 / `T` 四态 / `O` 覆盖层 / `D` 域专用 / `P` 原型 / `S` 系统契约 | `O12` |
| **引用数口径** | **`引用` = 消费该组件的「不同页面」数**（同页多次使用只计 1）；页面 ID 采用**[页面清单 v2.0](../product/App页面清单与结构盘点.md) 的 `A-/S-/T-/C-/M-/F-/P-` 空间**；被组件消费时标 **`（组件）`**；`全部`＝每一页都必须经过该出口 | `K13` 引用 **10**：`C-02` `S-04` `S-06` `S-21` `S-27` `M-03` `T-10` `C-01` `F-01` `M-01` |

**每个组件必须声明七项**（缺一不得进代码库）：
```
1 解剖（anatomy）      由哪些原子组成、各部分的令牌职责
2 变体（variants）     语义变体（primary/secondary/ghost…）、尺寸档、域变体
3 状态（states）       见 §4 统一状态命名
4 契约（props）        必填/可选、受控与否、回调语义
5 令牌绑定（tokens）   允许消费哪些语义令牌，禁止哪些
6 双端实现（platform） 纯 JS 自绘 / @expo/ui 原生 / 由导航容器提供 + **图标层归属**
7 无障碍与降级         role / label / state、命中区尺寸、reduced-motion 降级
```
### 1.2 `引用 < 2` 的唯一合法情形（**9.14-③ 的可核对门**）
| 情形 | 合法？ | 说明 |
|---|---|---|
| **原型骨架**（`P*`） | ✅ | **原型骨架豁免 9.14-③**：骨架只有 1 个使用者时，那个使用者就是**该原型自己的唯一实现**；套壳禁令针对的是**组件层**。例：`P11` 只有 `T-02`（`D15` 已降为它的渲染器） |
| **系统契约**（`S*`） | ✅ | 不是组件，是**必须定义的边界**（推送载荷、深链表、insets）；不存在"引用数"概念 |
| **域专用（`D*`）引用 = 1** | ⚠️ **仅 `D06 ChatComposer` 获准** | 依据**宪法 9.3**：二手私信是**必须独立存在的原型 P5**，即使只有 1 页也不许降级实现。**其余 `D*` 引用必须 ≥2** |
| **组合／控件引用 = 1** | ⛔ | 就地写；第 2 处出现才抽组件（9.14-③） |
> **可执行检查**：`引用` 列中任何 `A*`／`C*`／`K*`／`O*`／`T*` 的引用 = 1，即本次设计债的一项；CI 的"组件被消费"门（§8.2）以 **1 引用**为判负线。
### 1.3 "算不算一个组件"的判定
| 情形 | 判定 |
|---|---|
| 只影响一个页面的排版片段 | ❌ 不是组件，是页面内布局 |
| 在两个以上页面出现，或有独立状态机 | ✅ 是组件 |
| 只有样式差异（同一结构换色/换尺寸） | ✅ 是**变体**，不是新组件 |
| 内容不同但结构相同（帖子/菜品/商品/活动卡） | ✅ 是 `K17 EntityCard` 的**域变体** |
| 只在某个域出现且含该域的交互契约（翻页器、聊天、课表网格） | ✅ 是**域专用组件**（L7） |
| 由导航容器提供（Header / Tab 栏 / Sheet / 返回手势 / 长按菜单） | ❌ 不自研（宪法 4.3） |
| 唯一 `return` 是另一个组件的调用 | ⛔ **套壳，删**（9.14-①，见 §0.6） |
### 1.4 三层现成/自研边界（照抄《组件层调研》§5，不得自行放宽）
| 层 | 判据 | 结论 |
|---|---|---|
| **平台行为**（导航、手势、动效、虚拟化、图片、触感、安全区、**WebView**） | 承担的是**平台行为**，不是视觉决定 | **买**，且**优先官方 `@expo/ui`**；一律 `npx expo install` |
| **设计系统**（令牌 → 主题 → 原子 → 组合 → 原型） | 本项目独有的视觉决定 + 两把尺子的硬约束 | **自研**（本文件全部 **82** 个） |
| **样式引擎**（`nativewind` / `restyle` / `unistyles` / `tamagui` styling） | 不带来视觉身份，但**解决的不是我们的问题** | **默认不引入**；需要时走依赖准入 + ADR |
| **完整 UI kit**（`react-native-paper` / `@ui-kitten` / `react-native-ui-lib` / `@rneui` …） | 自带调色板与字阶 → 采用即接受它的设计语言 | **不作基座**（可作局部参考） |

---

## 2. 组件类型总表（注册表）
> `来源`：**自研** / **原语**（买，优先 `@expo/ui`）/ **容器**（由导航壳提供，不自研）。`引用` 口径见 §1.1；**完整的逐页消费关系见[页面清单 v2.0](../product/App页面清单与结构盘点.md) §3**。
### 2.1 L2 原子（12，**不变**）
| ID | 名称 | 职责 | 变体 | 来源 | 引用 | 消费页 / 消费组件 |
|---|---|---|---|---|---|---|
| **A01** | `Surface` | 一切可见底色容器；**暗色层级由表面色表达，不用阴影** | `canvas` `surface` `raised` `sunken` `brandSoft` | 自研 | **全部（组件）** | 全部组件；页面级用于 `A-01` `S-01` `T-01` `M-01` |
| **A02** | `Text` | 唯一文字出口；字阶 + 字重 + 颜色三者由令牌给定 | 字阶 6 档 × 语义色 | 自研 | **全部** | 88 页；**业务代码不得直接用 RN `Text`** |
| **A03** | `Stack` | 一维布局（`direction` + `gap` + `align`）；**间距只允许取令牌档位** | `row` `column` | 自研 | **全部（组件）** | 全部组件 |
| **A04** | `Spacer` | 弹性或定值留白 | `flex` `size` | 自研 | **全部（组件）** | 全部组件 |
| **A05** | `Divider` | 分隔线（Discord 社区感的分组手段） | `subtle` `strong` `inset` | 自研 | **11** | `F-01` `S-26` `S-28` `T-04` `T-06` `M-01` `M-13` `M-14` `M-15` `M-18` `M-19` |
| **A06** | `Icon` | **两层图标体系第 1 层出口**；见 §2.1.1 | `size` 5 档（16/20/24/32/48）；`tint`；**`label?`** | **自研（唯一第 1 层来源 = `lucide-react-native` 逐图标子路径）** | **全部** | 88 页 |
| **A07** | `Avatar` | 用户/社团/组织头像 | `user` `club` `org`；`size` 4 档；`fallback`（首字母） | 自研 + `expo-image` | **13** | `C-01` `C-02` `S-04` `S-06` `S-17` `S-18` `S-21` `S-23` `M-01` `M-02` `M-03` `M-12` `F-01` |
| **A08** | `Badge` | 徽标/角标；**Neo-Brutalism 白名单第 2 类** | `count` `status` `level` `draft` | 自研 | **8** | `C-01` `C-02` `S-10` `M-01` `M-03` `M-09` `M-11` `F-01` |
| **A09** | `Chip` | 可点/可删的小标签 | `static` `selectable` `removable` `filter` | 自研 | **6** | `C-01` `C-04` `S-14` `S-22` `T-09` `P-05` |
| **A10** | `Skeleton` | 骨架占位（**加载先给东西看**） | `text` `card` `list` `media` `grid` | 自研 | **全部列表/详情** | `S-01` `S-02` `C-01` `C-02` `T-02` `T-06` `M-01` `M-04` `F-01` 等 |
| **A11** | `Progress` | 确定性进度 | `bar` `ring` `segmented` | 自研 | **4** | `M-01` `M-17` `S-12` `T-03` |
| **A12** | `Pressable` | 唯一可点原语；**统一命中区补足与按压反馈** | `opacity` `scale` `none` | 自研（包 RN `Pressable` + `gesture-handler`） | **全部（组件）** | 全部可点组件 |
#### 2.1.1 `A06 Icon` —— **宪法 §16 两层图标体系的唯一实现处**（v2.0 重写）
| 层 | 归属 | 由谁实现 | 落点 |
|---|---|---|---|
| **第 1 层：品牌位 / 自绘位置** | 我们画在内容里的图标：顶栏信箱、**发布中心内的条目图标**、列表与卡片语义图标、功能区、空/错状态 | **`A06 Icon` 原子**（唯一来源 `lucide-react-native`） | **本节** |
| **第 2 层：系统控件位** | 系统容器**自己提供**图标的位置：**原生 Tab 栏（含第 5 格「＋发布」）**、原生导航栏项、原生菜单、ActionSheet、日期选择器、分享面板、系统对话框 | **平台容器 + 包装层**；**不是本原子** | §6 与 §7.2 |
**第 1 层硬规则（宪法 16.5）**
| # | 规则 | 强制 |
|---|---|---|
| 1 | **只允许逐图标子路径导入**：`import Mail from 'lucide-react-native/icons/mail'` | ⛔ **禁止 barrel 导入**（官方原文：barrel 的 tree-shaking 在 Web 导出上*不可靠地*生效，且绕开两个 `EXPO_UNSTABLE_*` 实验开关）——**性能红线，不是风格偏好** |
| 2 | **`strokeWidth` 全局只设一次（取 2），只在 `LucideProvider` 设** | ⛔ 调用点传 `strokeWidth`／`absoluteStrokeWidth`／`nonScalingStroke`（只允许原子内部按尺寸档处理） |
| 3 | **尺寸只接受档位令牌**：`icon-inline 16` / `icon-body 20` / **`icon-default 24`（默认，＝Lucide 原生 24×24 网格）** / `icon-large 32` / `icon-hero 48` | ⛔ 裸数字尺寸；⛔ 屏内魔法数字（宪法 16.3） |
| 4 | **a11y 二选一由 `label?: string` 强制**：传 → `accessible` + `accessibilityRole` + `accessibilityLabel`；不传 → **隐藏出无障碍树** | ⛔ **不得用 `aria-hidden` 当隐藏手段** —— Lucide `hasA11yProp` 把 `aria-*` 一律判为"有语义"，**反而会把它暴露给读屏** |
| 5 | **同一含义全局只有一个图标**；⛔ 为单个图标引入第二个图标库 | 宪法 16.2.2／16.3 |
| 6 | **实测陷阱名不得写**：`filter`→`list-filter`、`more-horizontal`→`ellipsis`、`alert-circle`→`circle-alert`、`trash-2`→`trash`、`wall`→`brick-wall`（共 20 条替换） | 写错的表现是**不透明的模块解析失败**，不会提示"已重命名" |
**第 2 层的边界（本原子不得越界承担）**
| 事实（图标方案调研 §4.3） | 后果 | 处置 |
|---|---|---|
| `@expo/ui` 的 `Icon`：`accessibilityLabel` **仅 Android 生效**（官方原文 *"iOS accessibility is not yet wired up."*） | iOS 上 VoiceOver 读不出标签 | **标签必须由包装层在可聚焦父级上补**（Tab 触发器 / 原生 item） |
| `expo-symbols` 的 `SymbolView`：**根本没有 `accessibilityLabel` prop** | 同上 | 同上 |
| `@expo/ui` 的 `Icon` **在 Web 上什么都不渲染** | Web 第 2 层会空白 | Web 一律走 `expo-symbols` 的 `name={{ web: '<material_symbol>' }}` |
| Tab 栏由系统绘制（宪法 4.3 禁自绘） | Tab 图标**不能是 Lucide 组件** | Tab 图标以**平台图标名**传给原生 API（§6.1） |
> **第 1 层图标清单**（不重抄，按[图标方案调研 §3.3–§3.6](../research/App图标方案-Lucide与平台图标.md) 的 kebab-case 引用）：食堂 `utensils` · 社团 `users` · 二手 `shopping-bag` · 跑腿 `bike`（备选 `package`）· 新生指南 `compass`（备选 `book-open`）· 课程表 `calendar-days` · 待办 `list-checks` · 放假日 `calendar-heart`（备选 `party-popper`）· AC 系统 `app-window` · Moodle `graduation-cap` · 签到 `qr-code` · 信箱 `mail` · 发布 `square-pen` · 搜索 `search` · 筛选 `list-filter` · 更多 `ellipsis` · 分享 `share` · 举报 `flag` · 屏蔽用户 `user-x` · 设置 `settings` · 通知 `bell` · 收藏 `star` · 点赞 `thumbs-up` · 评论 `message-circle` · 图片 `image` · 上传 `upload` · 空态 `package-open` · 错误 `circle-alert` · 加载 `loader-circle` · 树洞 `tree-pine` · 万能墙 `brick-wall`。三处备选二选一与屏蔽语义分叉仍属待决（§8.3）。
**原子层的三条硬规则**：① **`A02 Text` 是唯一文字出口**（业务代码不得直接用 RN `Text`，否则字阶被绕过）；② **`A01 Surface` 是唯一底色出口**（不得写 `backgroundColor`）；③ **命中区在 `A12 Pressable` 内统一补足**（iOS ≥44×44pt / Android ≥48×48dp，宪法 7.1），视觉尺寸可更小——**四类元素最易违规**：`C02 IconButton`、`A09 Chip` 的删除叉、`A08 Badge`（若可点）、列表行尾部动作。
### 2.2 L3 控件（22 行 / **18 active**）
| ID | 名称 | 类型 | 关键变体 / 形态 | 双端实现 | 引用 | 消费页 |
|---|---|---|---|---|---|---|
| **C01** | `Button` | 行动 | `primary`（**Neo-Brutalism 唯一允许的 CTA**）`secondary` `ghost` `danger` `link`；`size` 3 档；`loading` `disabled` | 自研外观 + `@expo/ui` Button（可选） | **≥19** | `A-02`–`A-05` `A-07` `S-15` `S-17` `S-19` `S-20` `S-23` `S-25` `S-32` `T-03` `T-04` `T-05` `P-01`–`P-09` `M-22`；**并（组件）** `K01` `K04` `T01` `T02` `O03` `O05` `O12` `O13` |
| **C02** | `IconButton` | 行动 | 纯图标（顶栏动作 / 行尾动作） | 自研 | **4** | `F-01`（信箱动作）`C-02` `S-23` `S-25`；✅ 页面清单已对齐（顶栏信箱写作 `C02` + `A06 Icon(mail)` + `A08 Badge`，§8.3-9 已关闭） |
| **C03** | `Fab` | 行动 | `publish`（全局发布）`page`（页内动作）；**全局 FAB 与页内 FAB 不同时出现** | 原语（M3 FloatingActionButton / iOS 自绘） | **4** | `S-01` `S-07` `S-17` `C-01` |
| **C04** | `Input` | 文本输入 | `text` `number` `email` `password` `tel`；**`underline` 外观变体（＝口语"带下边框的文本输入框"）**；`prefix`/`suffix` `clearable` `error` | 自研外观 + 平台键盘 | **12** | `A-02`–`A-04` `S-14` `S-25` `T-06` `M-02` `P-02` `P-05`–`P-09` |
| **C05** | `TextArea` | 文本输入 | `autoGrow`（2–8 行）`fixed`；**`counter`（字数/上限）—— 计数器由本组件 own** | 自研 | **8** | `C-05` `T-03`（粘贴兜底）`T-08` `M-02` `P-02` `P-03` `P-07` `P-09` |
| **C06** | `SearchField` | 文本输入 + 检索 | `inline`（页内）`full`（检索页） | 自研 | **6** | `S-14` `S-15` `S-16` `S-26` `T-09` `C-03` |
| **C07** | `Select` | 选择（互斥，>7 项） | 单选；`plain` `withSearch`（>15 项时叠加 `C06`） | **`O07 PickerSheet`（底部滚轮/列表）+ 平台菜单** | **4** | `S-19`（分类）`P-04`（**组织身份 + 搜索**）`P-05`（分类/配送）`P-08` |
| **C09** | `MultiSelect` | 选择（多值） | `inline`（≤7 项）`sheet`（>7 项）`chips`（已选回显） | 自研 + `O07` | **2** | `P-05`（宿舍区 13 + 分类）`S-11`（点评标签） |
| **C10** | `Checkbox` | 选择（布尔/多选） | `single` `group`；`indeterminate` | 原语（`@expo/ui` Checkbox） | **5** | `A-05`（ToS 勾选）`T-06` `M-04` `P-02` `P-09` |
| **C12** | `Switch` | 选择（即时生效布尔） | — | 原语 | **4** | `M-13` `M-14` `C-06` `M-15` |
| **C14** | `SegmentedControl` | 选择（2–5 项互斥、平级切换） | `text` `textWithCount` | 原语（M3 SegmentedButton / iOS SegmentedControl） | **4** | `T-02`（周切换）`M-13`（语言）`P-06`（类型）`C-05`（三版式，就地实现） |
| **C15 / C16** | `DatePicker` / `TimePicker` | 选择（日期/时间） | 单选；`min`/`max`；24h（默认，马来西亚） | 原语（`@expo/ui` DateTimePicker 替代） | **5** | `T-06` `T-07` `T-08` `P-08`；**一律走平台选择器，不自绘日历** |
| **C17** | `MonthPicker` | 选择（年月 / 学期） | 年份范围可配（课评 `2016–今`）；**`allowedMonths` 受限月份**（课评**仅 `02/04/09`**） | 自研 + 原语 | **2** | `T-09`（筛选）`P-09`（学期，**`D14` 已并入**）；⛔ **不得用通用 `C15` 代替**——它会放行非法月份 |
| **C18 / C19** | `Stepper` / `OtpInput` | 选择（数值增减）/ 文本输入（定长码） | `compact` `withInput`；4/6 位 + `paste` | 自研 | **4** | `T-06`（优先级）`P-09`（难度）`A-03` `A-04`（验证码） |
| **C20** | `MediaPicker` | 媒体输入 | `single` `multi`（**上限由页面注入**）；`allowGif`（**二手为 false**） | 原语（系统相册/相机）+ `expo-image` | **6** | `M-02`（头像 1）`S-11` `S-19` `P-02` `P-05` `P-08` |
| **C21** | `TagPicker` | 标签输入（**枚举 + 自由文本同一组件**） | `enum`（白名单标签）`free`（自由标签）；`max` / `maxLength` | 自研 | **3** | `P-02`（帖子标签 ≤3）`P-05`（二手标签 ≤10 × ≤20 字）`P-09`（课评白名单 ≤8） |
**已移除**：`C08 Combobox`、`C11 RadioGroup`、`C13 Slider`、`C22 FilePicker` —— 全部登记为**"需要时再建"**，⛔ **不得预留**（宪法 9.1／9.14-③）。
> **`C21 TagPicker` 为什么是"一个组件覆盖两件事"**：`enum` 与 `free` 的区别**只是选项来源与校验规则**，而**输入方式、chips 回显、`max`/`maxLength`、删除叉、a11y 全部相同** → 按 9.14-①「同语义只留一层」，它们必须是**同一组件的两个 `source` 形态**。
### 2.3 L4 组合（22 行 / **20 active**）
| ID | 名称 | 职责 | 关键变体 | 引用 | 消费页 |
|---|---|---|---|---|---|
| **K01** | `Form` | **参数化表单框架**（字段描述符 + 校验 + 提交语义 + 草稿 + 离开确认）；**DSL 见 §3.2** | `screen` `sheet` | **13** | `A-02`–`A-04` `S-11` `S-19` `T-03` `T-08` `M-02` `P-02`–`P-09` |
| **K02** | `FormSection` | 表单分节（标题 + 字段组） | — | **13** | 同上（由 `K01` 消费） |
| **K03** | `FormField` | 单字段外壳：标签 + 控件 + 帮助 + 错误 + 必填标记 | `inline` `stacked` | **13** | 同上 |
| **K04** | `ErrorSummary` | 提交失败时置顶的错误摘要（**并把焦点移过去**）；**own 错误文案三要素呈现**（§3.7） | `top` `section` | **14** | 13 个表单页 + `T-03` |
| **K05** | `ListScreen` | **参数化列表骨架**：分页状态机 + 四态 + 筛选持久化 + 滚动位置恢复 | `paged` `infinite` `cursor` | **≥22** | `S-02`–`S-04` `S-08` `S-09` `S-12`–`S-16` `S-18` `S-22` `S-24` `S-26` `S-28` `S-30` `T-06` `T-09` `C-01`(树洞) `C-03` `C-04` `M-04`–`M-11` `M-15` `F-01` |
| **K06** | `ListItem` | 单列等宽行（左图标/头像 + 主副文案 + 尾部动作） | `nav` `action` `toggle` `select` `danger` | **≥14** | `S-08` `S-09` `S-14` `S-16` `S-18` `T-01` `T-04` `T-06` `T-07` `M-01` `M-06`–`M-11` `M-13`–`M-15` `M-17`–`M-23` `F-01` |
| **K07** | `SectionHeader` | 分区标题；**Neo-Brutalism 白名单第 3 类** | `plain` `withAction` | **7** | `S-01` `S-07` `T-01` `C-06` `M-01` `M-13` `M-18` |
| **K08** | `Card` | 内容卡容器（**Neo-Brutalism 不得用于卡底**） | `plain` `outlined` `interactive` | **8** | `S-01` `S-08` `S-25` `S-32` `T-01` `C-01` `F-01` `M-08` |
| **K09** | `StatTile` | 指标格（数字 + 标签 + 可选图标） | `sm` `md` | **5** | `S-01` `S-17` `S-20` `M-01` `M-03` |
| **K10** | `MetricRow` | 横向指标行（"工具"/"我的"顶部） | — | **2** | `T-01` `M-01` |
| **K11** | `QuickActionGrid` | 入口网格 | `grid` `list` | **7** | `S-01`（五类服务）`S-07` `S-15` `T-01` `C-01` `M-01` `P-01` |
| **K12** | `RankingRow` | 榜单行（名次 + 主体 + 指标） | `medal`（前 3 名）`plain` | **5** | `S-02` `S-07` `S-08` `S-12` `S-13` |
| **K13** | `AuthorRow` | **实名**作者行（头像 + 昵称 + 等级徽章 + 可点进主页） | `compact` `full` | **10** | `C-01`(树洞) `C-02` `S-04` `S-06` `S-21` `S-27` `T-10` `M-01` `M-03` `F-01` |
| **K14** | `AnonAuthorLabel` | **匿名**作者标签：**只渲染"匿名 / Anonymous"，无头像、无昵称、无等级、无主页跳转** | `inline` `block` | **4** | `C-01`(万能墙) `C-02`(万能墙帖) `T-09`(课评卡) `T-10`(匿名评论) |
| **K15** | `LevelBadge` | 等级徽章（6 级） | `icon` `iconWithName` | **6** | `C-02` `S-04` `M-01` `M-03` `M-17` `F-01` |
| **K16** | `ExpBar` | 经验进度条（当前 / 下一级阈值） | `compact` `full` | **3** | `M-01` `M-17` `F-01`（等级提升就地反馈） |
| **K17** | `EntityCard` | **域卡片唯一实现** | **13 个域变体**：`post` `trending` `campus` `confession` `review` `food` `shop` `listing` `club` `activity` `errand` `article` `notification` | **22** | `S-01`–`S-06` `S-09` `S-12` `S-15` `S-17` `S-21` `S-22` `S-26` `S-30` `T-09` `C-01` `C-02` `C-04` `M-03` `M-04` |
| **K18** | `MediaGrid` | 图片网格（1/2/3/4/9 宫格） | `grid` `hero`（头图） | **11** | `C-02` `S-04` `S-06` `S-10` `S-20` `S-21` `S-23` `S-32` `M-03` `P-02` `F-01` |
| **K20** | `FilterChips` | 可横滑筛选 chips（标签/分类/年份） | `single` `multi` `withCount` | **6** | `S-22` `S-26` `T-09` `C-03` `C-04` `C-06` |
| **K22** | `SegmentedTabs` | 页内**数据切换**（`tab` 角色 + 指示器）—— **⛔ 本轮不建**（与 `C14` 的分工见本节末的 P2B-05 裁决） | `text` `textWithCount` | **0（本轮）** | P2B-05 裁决 |
**已移除**：`K19 ImageCarousel`（轮播由 `D24 BannerSlot` 承担；帖内多图由 `K18` + `D21` 承担 → **0 消费者**）、`K21 Tabs`（**>5 项 underline tab 本轮无消费者**，所有剩余 tab 集合 ≤3，改用页内段控 —— 本轮即 `C14 SegmentedControl`，见下方裁决）。

> ### ⚠️ `K22 SegmentedTabs` 与 `C14 SegmentedControl` 的分工（**P2B-05 裁决**，2026-10-06）
> **问题**：`C14` 已经具备 `withCount`（`app/src/components/ui/SegmentedControl.tsx:29-36`），与 `K22` 声明的 `text`/`textWithCount` 形态**重叠** —— 再建一个 `K22` 就是 **9.14-① 同语义多层**（本表第 1–15 行删掉的那些组件，一半是这么来的）。
> **裁决**：
> 1. **`C14` = 控件**：`radio` 角色、值参与提交或查询参数；页内**筛选/数据切换**（如 `F-01` 的 互动/交易/系统）用它。
> 2. **`K22` = 页面级数据切换**：`tab` 角色 + 指示器形态。**本轮不建** —— 无消费者就抽象正是 9.14-③ 要拦的"为复用而抽象"。
> 3. `F-01` 的分类切换 **本轮用 `C14 withCount`**，且 ⛔ **不进 `K22` 的位子、也不进 `ListScreen` 的 `tabs` 槽位**（宪法 4.8.1-R4：导航 Tab ≠ 筛选组件）。
> 4. 一级 Tab **内部子栏目**仍然只能用 `TopTabStrip`（宪法 4.8 / 骨架规范 §4）→ 三者不得互相冒充。
> **状态**：**【提案·需所有者签字】**。本节是**裁决记录**，不是已批准规格；所有者追认后，`K22` 的 14 个引用页按同一判据逐页选型，并把本行的"本轮不建"改成正式规格。
> **配套用例**：`app/src/__tests__/p2b-05-segmented-ruling.test.ts` —— 它同时盯着"`K22` 没有被偷偷建出来"和"`C14` 的 `withCount` 还在"（本裁决的**前提**）。
> **`K17 EntityCard` 是"组件库必须被消费"的关键设计**：Web 侧同一原型在不同域被重复手写（`SquareCampusFeed`、`ConfessionWall`、`ClubPostDetail` 各写一套卡），且 `square/` 下 11 个组件里 7 个是死代码。App 侧**一个 `EntityCard` + 13 个域变体**，**不允许为某个域另写卡片**。
> **`K14` 与 `K13` 不得互换、不得混用**（宪法 4.1.1）：万能墙匿名是后端写死的不变量，`AnonAuthorLabel` **断开头像、昵称、等级、跳转四个出口**。
### 2.4 L5 状态与四态（6，**不变**）
| ID | 名称 | 职责 | 关键变体 | 引用 | 依据 |
|---|---|---|---|---|---|
| **T01** | `EmptyState` | 空态，**分三类** | `firstRun`（引导首次动作）`noResult`（提供放宽条件）`broken`（提供修复入口） | **全部列表/详情** | 宪法 10.2 |
| **T02** | `ErrorState` | 错误态：**own 错误文案三要素**（§3.7） | `network`（无网络/服务不可达/超时三分支）`server` `business`（如 `status:-1`）`permission` | **全部** | 宪法 10.4 |
| **T03** | `LoadingState` | 加载态：**先给东西看**（骨架/占位），**不配任何文字** | `skeleton` `spinner` `determinate` | **全部数据位** | 宪法 10.3／10.5 |
| **T04** | `OfflineBanner` | 离线/弱网横幅（**离线优先是数据层，不是一张图**） | `offline` `stale`（展示缓存数据） | **全部列表/详情** | 宪法 10.6 |
| **T05 / T06** | `ListFooter` / `PullToRefresh` | 分页尾部状态（加载中 / 没有更多 / 失败重试：`loading` `end` `retry` `idle`）；下拉刷新（**手势交原生**） | — | **≥22** | 宪法 10.3 状态机 / 宪法 8.2 |
**分页状态机（`【已定】`）**：`{refresh, append, prepend} × {NotLoading, Loading, Error}`，**错误必须带 retry**。`K05 ListScreen` 与 `T05 ListFooter` 是该状态机的**唯一实现处**——**页面不得自己写分页状态**。
### 2.5 L6 覆盖层（14 行 / **11 active**）——**通知阶梯的物理实现**
| ID | 名称 | 侵入度 | 用途 | 阻断 | 引用 | 备注 |
|---|---|---|---|---|---|---|
| **O01** | `Toast` | 极低 | **操作回执**（成功/失败/可撤销） | 否 | **≥12** | 2–4s，可滑走；⛔ **不得承载需要阅读的说明**（10.5） |
| **O02** | `InlineNotice` | 低 | 页内常驻状态说明 | 否 | **10** | `A-02` `A-07` `T-03` `T-04` `T-08` `T-10` `P-04` `P-06` `P-09` `M-16`；**含"校方系统会话已过期"**（§3.4） |
| **O03** | `AlertDialog` | 中 | **需要决策**（不可逆/高风险）；**own `danger` 变体（含二次输入确认）** | 是 | **8** | `S-25` `T-03` `P-02` `M-04` `M-05` `M-15` `M-16` `F-01`；`O04` 已并入 |
| **O05** | `ActionSheet` | 中 | **多个平级动作选一** | 是 | **7** | `S-10` `S-18` `S-23` `S-25` `M-03` `M-10` `P-01` |
| **O06** | `BottomSheet` | 中 | **就地展开内容**（不离开上下文） | 半模态 | **4** | `C-05`（版式）`C-01`（筛选）`S-22`（筛选）`M-13` |
| **O07** | `PickerSheet` | 中 | **`C07`／`C09`／`C17` 三类 sheet 选择器的唯一容器** | 半模态 | **3（组件）+ 4 页** | `C07` `C09` `C17`；页面：`S-19` `P-04` `P-05` `P-09`；键盘、insets、搜索位、已选回显**只在这里做一次** |
| **O08** | `InputSheet` | 中 | **文本底框**：底部输入条 / 底部输入 Sheet + 键盘避让 | 半模态 | **5** | `C-02` `S-04` `S-06` `S-27` `M-12`；**跑腿详情永不出现**（§3.3.3） |
| **O11** | `FullScreenModal` | 高 | **单一任务表单 / 沉浸式查看** | 是 | **13** | `A-01` `S-11` `S-19` `T-03` `M-02` `M-16` `P-02`–`P-09` |
| **O12** | `FullScreenNotice` | 最高 | **全屏通知**：接管整屏，**解释 + 单一动作**，不承载表单 | 是 | **5** | `A-05`（ToS 门禁）`A-06`（权限）`A-07`（受限/封禁）`M-16`（注销后果）`F-01`（强更） |
| **O13** | `PermissionPrompt` | 高 | 系统权限前置解释页（**先解释再申请**） | 是 | **2** | `A-06` `M-14`（`O12` 的 N7′ 形态，§3.4.1） || **O14** | `ReportSheet` | 中 | 举报（8 种原因 + 目标类型） | 是 | **≥6** | `C-02` `S-04` `S-06` `S-10` `S-21` `S-27` + `M-03`（举报用户）；⛔ 不可埋进二级菜单 |
**已移除**：`O04 ConfirmDialog`（**是 `O03` 的 `variant`，不是独立组件** —— 9.14-①）、`O09 Popover`（**手机端无消费者**）、`O10 ContextMenu`（**平台容器已提供，不属自研层**）。
### 2.6 L7 域专用（27 行 / **15 active**）
| ID | 名称 | 域 | 引用 | 消费页 | 为什么必须单独做（不可降级为通用组件） |
|---|---|---|---|---|---|
| **D01** | `CommentThread` | 通用 | **6** | `C-02` `S-04` `S-06` `S-21` `S-27` `T-10` | 评论分页 + **仅二级**（不能回复回复）+ 组内展开 |
| **D02** | `CommentItem` | 通用 | **6** | 同上（由 `D01` 消费） | 匿名/实名两种投影、`can_delete`、一级评论点赞；**匿名域不得带作者身份** |
| **D03** | `CommentComposer` | 通用 | **4** | `S-04` `S-06` `S-10` `S-21` | 上限**按域不同**（万能墙 500 / 指南 800）→ 由页面注入 |
| **D04** | `ReplyBar` | 通用 | **4** | 同 `D03`（由 `O08` 消费） | "正在回复 @昵称"上下文条；**匿名域不得回显被回复者身份** |
| **D05** | `ChatBubble` | 二手私信 | **1**（豁免，§1.2） | `M-12` | 发送/接收/**已读（`D07` 已并入，成为它的 `read` 状态）** + 时间分组；P5 的唯一实现 |
| **D06** | `ChatComposer` | 二手私信 | **1 —— 唯一获准的 1 引用** | `M-12` | **宪法 9.3**：二手私信是**必须独立存在的原型 P5**，即使 1 页也不允许塞进 `O08` 降级实现（≤1200 字、4s 轮询、无实时通道） |
| **D09 / D10** | `ChecklistItem` / `StarRating` | 新生指南 / 课评·菜品 | **2 / 4** | `S-28` `S-29` / `S-10` `S-11` `T-10` `P-09` | 勾选即 PATCH + 长按滑动删除 + `sort_order`；评分展示态（课评：评分 + 难度两组） |
| **D11** | `RatingScale` | 食堂 | **2** | `S-10`（读）`S-11`（写） | **5 档非线性评级**：`夯爆了 / 顶级 / 人上人 / NPC / 拉完了`，**权重 10/7/4/1/−1** → ⛔ **不得被 `D10 StarRating` 代替**（语义与权重都不是线性的） |
| **D16** | `CalendarHeatmap` | 工具 | **2** | `T-07` `T-08` | 月热力（有内容的日期标记；**空档需客户端补全**） |
| **D18** | `MarkdownReader` | 内容 | **5** | `S-27` `S-31` `M-19` `M-20` `M-21`（另 `M-22` `M-23` 同族） | Markdown 渲染 + **TOC 由它 own**（`D19 TocDrawer` 已并入）：后端只存原文，目录生成在客户端 |
| **D21** | `ImageViewer` | 通用 | **3** | `C-02` `S-10` `S-23` | 全屏查看 + 缩放（`P10 阅读器`的图片分派） |
| **D24** | `BannerSlot` | 广场 / 食堂 | **2** | `S-01` `S-07` | 轮播（`K19` 已并入本组件）：自动轮播 + 按 `link_type` 分发 + 点击上报；⚠️ **不展示排期**（后端 `parseBannerBody` 写不进 `starts_at/ends_at`） |
| **D25 / D27** | `CountdownButton` / `SchoolSystemCard` | 鉴权 / 校方系统 | **2 / 2** | `A-03` `A-04` / `T-01` `T-04` | 验证码 60s 倒计时重发（**注册用 `send-verification-code`、找回密码用 `send-reset-code`，两页各一处**）；**校方系统会话卡（未登录/已登录/已过期）+ 清除会话**，`T-05` 本体属 `P18`（§3.5） |
**已内联／移除（全部为宪法 9.14-③「1 处使用 = 就地写」）**
| v1.0 条目 | 去向 |
|---|---|
| `D07 ReadReceipt` | → **`D05 ChatBubble` 的 `read` 状态** |
| `D08 TodoItem` | → **`T-06` 内联**（`C10` + `K06`） |
| `D12 TemplatePicker` | → **`C-05` 内联**（`C14` + `C05.counter`） |
| `D13 OrganizationPicker` | → **`P-04` 内联**（`C07` + 成员资格校验） |
| `D14 TermPicker` | → **`C17 MonthPicker` 的配置**（`yearRange` + `allowedMonths:[2,4,9]`） |
| `D17 HotspotMap` | **0 消费者，删**（地图本轮不做） |
| `D19 TocDrawer` | → **`D18 MarkdownReader`** |
| `D20 PdfViewer` | **0 消费者，删**（学习资料整体出局） |
| `D22 DownloadBar` | **0 消费者，删** |
| `D23 UploadProgress` | **0 消费者，删**（`C20` 已 own 本地进度与单项重试） |
| `D26 DueBadge` | → **`T-06` 行内**（状态色令牌 + 文案，警告必须带图标） |
| `D15 TimetableGrid` | → **原型层 `P11` 的骨架渲染器**（§2.7） |
### 2.7 原型骨架（**15：14 使用 + 1 建议新增**，不是组件）
原型是"**渲染骨架 + 交互契约**"，实现为**可复用布局**（`src/proto/`），页面只提供数据与区块。
> **原型骨架豁免 9.14-③**：骨架只有 1 个使用者时，那个使用者就是**该原型自己的唯一实现**。**套壳禁令针对组件层，不针对原型层。**
| 原型 | 骨架 | 必须实现的交互契约 | 用它的页 | 引用 |
|---|---|---|---|---|
| **P1 信息流** | 单列/双列瀑布流 + 无限加载 | 下拉刷新、分页预取、**滚动位置恢复**、图片懒加载、点赞就地更新 | `C-01`(树洞) `S-05` `S-15` `S-26` `C-04` | **5** |
| **P2 列表** | 单列等宽行 + 可选 tab/筛选头 | 分页或无限加载、四态、**筛选持久化** | `S-08` `S-09` `S-12`–`S-14` `S-16` `S-18` `S-22` `S-24` `S-28`–`S-30` `T-04` `T-06` `T-07` `T-09` `C-03` `C-06` `M-04`–`M-11` `M-15` `F-01` | **26** |
| **P3 详情** | 头图 + 正文 + 互动条 + 评论区 | 返回、举报、点赞/收藏、评论分页与嵌套、作者信息（**可匿名投影**） | `S-04` `S-06` `S-10` `S-20` `S-21` `S-23` `S-25` `S-31` `S-32` `C-02` `T-10` | **11** |
| **P4 表单/发布** | 分节表单 + 媒体 + 草稿 | 校验、**错误定位**、媒体多选与压缩上传、**离开确认**、提交后跳转语义 | `S-11` `S-19` `T-03` `T-08` `M-02` `M-16` `P-02`–`P-09` | **14** |
| **P5 对话** | 气泡列表 + 输入条 | 发送、已读回执、轮询/推送更新、**键盘避让**、图片消息 | `M-12` | **1**（宪法 9.3 单独立原型） |
| **P6 翻页** | 一屏一篇 + 纵向吸附 | 上下翻页、边界回弹、预取、位置指示、手势可访问性 | **`C-01` 的第二子视图**（**不是独立页**） | **0 页 / 1 子视图**（宪法 9.3） |
| **P7 仪表盘** | 摘要卡 + 统计块 + 入口网格 + 区块列表 | 分区加载、**按角色显示/隐藏入口**、下拉刷新 | `S-01` `S-07` `S-17` `T-01` `M-01` `M-03` `P-01` | **7** |
| **P9 榜单** | 名次 + 主体 + 指标 | 榜单类型切换、周期说明、空态 | `S-02` `S-12` `S-13` | **3** |
| **P10 阅读器** | 文档渲染 + 目录 + 操作条 | 目录跳转、分享、**失败降级** | `S-27` `S-31` | **2** |
| **P11 课表网格** | 星期 × 节次 + 周切换 | 周切换、今天高亮、课程卡点击、导入入口 | `T-02`（**`D15` 已降为本骨架的渲染器**） | **1**（豁免 9.14-③） |
| **P13 日历/时间轴** | 月历 + 当日详情 | 日期选择、有内容日期标记、跳转今天 | `T-07` `T-08` | **2** |
| **P14 检索** | 搜索框 + 历史/建议 + 结果列表 | 防抖、结果分组、**空结果引导**、关键词高亮 | `S-14` `C-03` | **2** |
| **P15 鉴权** | 品牌头 + 表单卡 + 次要动作 | 字段校验、验证码倒计时、错误提示、条款链接 | `A-02` `A-03` `A-04` | **3** |
| **P16 静态说明** | 标题 + 富文本 | 无交互（仅滚动与链接） | `A-05` `A-07` `M-17`–`M-23` | **9** |
| **P18 内嵌网页容器【建议·待评审】** | **原生导航栏 + 平台 WebView + 页面级动作** | 见 §3.5：会话记忆、导航拦截、「读取本页课表」注入、失败降级 | `T-05` | **1** |
**本轮未用原型**：`P8 后台表格`（管理后台整体出局，宪法 4.2.2-2）· `P12 地图`（**本轮不做地图**）· `P17 纯转发`（**已废除，禁止新增**，宪法 9.4）。
**P18 的处理纪律（宪法 9.1）**：一个页面**不命中任何现有原型**时，**触发的是"是否新增原型"的评审，不是新写一个页面** → `T-05` 因此**不新增页面 ID**，它属于 `P18`。

**⭐ 原型落点（2026-10-02 Phase 1 收尾回写，宪法 15.4-3 / 任务包 README §5-3）**
"原型"在不同情况下落成的东西**不一样**，必须写清，否则后来者会去 `src/proto/` 找一个并不存在的模块：

| 原型 | 落点（实际代码位置） | 交付于 |
|---|---|---|
| **P2 列表** | **组件层** `app/src/components/ui/ListScreen.tsx`（`K05`）+ `EmptyState`/`ErrorState`/`LoadingState`/`ListFooter`/`PullToRefresh` | P1-09 |
| **P4 表单/发布** | **组件层** `app/src/components/ui/Form.tsx`（`K01`）+ `FormSection`/`FormField`/`ErrorSummary` + `C05 TextArea` | P1-10 |
| **P3 详情** | **`app/src/proto/P3/`**（`DetailScreen` + 纯函数 `resolveDetailState`） | P1-11 |
| **P16 静态说明** | **`app/src/proto/P16/`**（`StaticPage` + 三级降级 `resolveStaticContent`：远端 → 缓存 → 内置） | P1-12 |
| **P11 课表网格** | **`app/src/proto/P11/`**（`TimetableGrid` + 行键=开始时间，见任务包 README §7-12） | P1-16 |
| **P18 内嵌网页容器** | `app/src/features/tools/SchoolSystemWebView.tsx`（容器 + 注入）+ `app/src/app/system/[id].tsx`（宿主页与工具栏） | P0-08 / P1-14 |
| **P7 仪表盘** | **未单独成模块**：页面级组合。已落地的是 `S-07` 的"区域网格 + 今天吃什么"（`app/src/features/square/CanteenHome.tsx`）；其余区块（摘要卡/统计块/按角色隐藏）随各页交付 | P1-17（部分） |
| `P1` `P5` `P6` `P9` `P10` `P13` `P14` `P15` | **本包未落地**（用它们的页面不在 Phase 1 范围） | — |

> ⚠️ 两个**不落 `src/proto/`** 的情形是有意的：`P2`/`P4` 的"骨架"本质上就是**组件层**的列表/表单系统（`K05`/`K01`），把它们再包一层 `src/proto/P2` 就是**套壳**（9.14-②）。反过来，`P3`/`P11`/`P16` **没有**对应的组件层 ID（骨架不计入组件数），所以按 §1.2 的豁免落 `src/proto/`。
### 2.8 系统契约（5，不是组件但必须定义）
| ID | 名称 | 定义内容 | v2.0 更新 |
|---|---|---|---|
| **S01** | `PushPayload` | 载荷 schema：`title` `body` `deep_link` `badge` `sound` `collapse_key`；**APNs `apns` / FCM `android` 平台专属段** | 现状 `push.js` 只有 `{title, body, url, tag}`（Web 路径 + Web Notification tag）→ **原生不可复用**（页面清单 §7-4） |
| **S02** | `NotificationChannel` | Android Channel 划分（**互动/交易/系统**）+ iOS 授权与 `UNUserNotificationCenter`；**权限被拒时的降级**（不注册 token，角标仍工作） | 渠道划分**必须与 `F-01` 的 category 对齐**（`interaction`/`transaction`/`system`），否则用户无法按类别静音 |
| **S03** | `DeepLinkRouter` | 深链路由表：`xmumdorm://<web-path>` 与 `https://<域名>/<path>` → 页面 ID + 参数 schema + **栈底规则**（页面清单 §5） | 新增约束：**`T-05` 不接深链**（会话级能力，不进外部分发） |
| **S04** | `HapticsMap` | 触感映射（轻/中/重/成功/警告）与**何时禁用** | 重申：reduced-motion **不关触感**，但"频繁交互不加动效"同样约束触感强度 |
| **S05** | `InsetsPolicy` | **每屏自行处理 insets**（Android edge-to-edge 不可退出，宪法 5.3）；键盘避让、刘海/手势条、大屏/折叠屏断点 | 新增消费者：**`P18` 的 WebView 容器必须自己处理 insets 与键盘避让**（§3.5） |

---

## 3. 逐类定义（重点类型）
> 全量 82 个组件的七项声明在实现时按 §1.1 模板逐个补齐。本节只对**契约复杂、最容易做错**的类型给出完整定义。
### 3.1 选择器类型学（**"下拉列表"不是一个组件**）
| 场景特征 | 正确组件 | 呈现形态 | 反例（禁止） |
|---|---|---|---|
| **2–5 项互斥**、平级切换、需常驻可见 | `C14 SegmentedControl` | 分段控件常驻 | ❌ 用 `C07 Select` 藏起来（多一次点击） |
| **≤7 项互斥**、无需常驻 | **`C14`**（≤5）或 **`C10 Checkbox` group**（6–7，表单内） | 分段控件 / 勾选组 | ❌ 新建 `RadioGroup`（9.14-③，**已删除**） |
| **>7 项互斥**、选项固定 | `C07 Select` | **底部 Sheet 列表/滚轮**（`O07 PickerSheet`） | ❌ 自绘下拉浮层（不是平台形态） |
| **>15 项或需搜索** | **`C07 Select` + `C06 SearchField`**（就地组合） | `O07` 内嵌搜索行 | ❌ 让用户滚 500 项；❌ 复活 `C08 Combobox` |
| **多值、需要回显已选** | `C09 MultiSelect` | 内联（≤7）/ Sheet（>7）+ 已选 chips | ❌ 复选后不给回显 |
| **标签（枚举白名单 **或** 自由文本）** | **`C21 TagPicker`**（一个组件两个 `source` 形态） | 输入 + chips，带 `max`/`maxLength` | ❌ 拆成两个组件（9.14-① 同语义多层） |
| **数值增减** | `C18 Stepper` | 加减器 | ❌ 用已删除的 `Slider` 做离散 5 档评分 |
| **日期 / 时间** | `C15` / `C16` | **平台选择器** | ❌ 自绘日历 |
| **受限年月（课评学期）** | `C17 MonthPicker`（`allowedMonths`） | 年份 + **受限月份** | ❌ 通用 `C15`（会放行非法月份）；❌ 复活 `D14` |
| **非线性 5 档（食堂评级）** | `D11 RatingScale` | 5 个带语义文案的档位 | ❌ `D10 StarRating`（语义与权重都不是线性的） |
| **受权限约束的主体（组织身份）** | **`C07 Select` + 校验提示（就地）** | `O07` + 成员资格校验 | ❌ 不校验（会选出无权发帖的组织）；❌ 复活 `D13` |
| **筛选条件（多条件）** | `K20 FilterChips` + `O06 BottomSheet` | 横滑 chips + 条件 Sheet | ❌ 把筛选做成 `C07` 下拉 |
**三条落地规则**：① **选型由数据语义决定，不由视觉偏好决定**——上表任一"反例"在 review 中直接判负；② **所有 Sheet 型选择器共用一个 `O07 PickerSheet` 容器**（键盘、安全区、insets、搜索位、已选回显都在容器里做一次），**不得每个字段各写一个 Sheet**；③ **选项来源必须能区分"枚举"与"远程"**：枚举（分类/状态/配送/宿舍区/标签白名单）前端可内置；远程（组织、课程、用户）必须支持 loading / 空 / 错误三态。
**已核对的真实枚举（来自 5 份端点清单，不得凭记忆改写）**
| 字段 | 枚举 / 限额 | 消费页 |
|---|---|---|
| 食堂评级 | `夯爆了 / 顶级 / 人上人 / NPC / 拉完了`（权重 10/7/4/1/−1） | `S-10` `S-11` |
| 万能墙版式 | `bigtype`(60) / `letter`(1000) / `note`(300)，默认 `bigtype` | `C-05` |
| 待办优先级 | 整数 `0..3`（夹紧，默认 0）；`list_type = personal/course/club/other` | `T-06` |
| 二手分类 / 状态 / 配送 | 分类 6（`all/electronics/transport/dailyuse/books/others`）、状态 2（`on_sale/sold`）、配送 2（`pickup/delivery`）、宿舍区 13 | `S-22` `P-05` |
| 跑腿类型 / 状态 | `delivery/purchase/urgent`；`open/taken/done` | `S-24` `P-06` |
| 课评标签 / 学期 | 白名单 `MPU/GE/ME/required/final/no final`，≤8；`rating/difficulty` 1–5；月份仅 `02/04/09` | `T-09` `T-10` `P-09` |
| 社团分类 | 5（`music/tech/culture/sport/art`） | `S-15` `S-19` |
| 广告 CTA | 6（`none/shop/product/region/internal/https`；`https` 仅放行 `https://`） | `S-32` |
| 举报原因 | 8（`spam/fraud/abuse/nsfw/trolling/privacy/illegal_trade/other`） | `O14`（全部详情页） |
| 通知类别 / 模块 | category 3（`interaction/transaction/system`）；module 7；**类型 24** | `F-01` `M-14`（**`S02` 必须与之一致**） |
> **纪律**：上表每个枚举**必须在 App 侧从 `shared/constants/*` 读取**（宪法 9.6：`shared/{api,constants,utils,config,query}` 可跨端共用），**不得在 App 里复制一份**——复制的那一份会在后端改动时静默过期。**已出局项不在此表**：资料类型 / 考试节点 / 来源（M10 整体不对齐）。
### 3.2 表单系统（`K01 Form` + 字段描述符 DSL）
**为什么表单要单独成体系**：`P4` 是第二大桶（**14 页**），且 Web 的 `FormPageLayout` **0 页使用**——"模板层名义存在、实际未落地"。App 不允许重演：**不允许任何页面手写表单**。
**§3.2.1 解剖**
```
Form
├─ Header          标题（≤12 汉字）
├─ ErrorSummary    ← 提交失败时置顶，并把焦点移过去（禁止只在字段旁显示）
├─ FormSection[]   分节（标题 + 字段组）
│   └─ FormField   标签（≤6 汉字）+ 必填标记 + 控件 + 字段级错误（就近）
├─ Footer          粘性底栏：主行动（CTA）+ 次行动（取消/存草稿）
└─ DirtyGuard      离开确认（仅在真有未保存内容时触发）
```
**§3.2.2 字段描述符（唯一的表单配置方言）**
```ts
type OptionSource =
  | { kind: 'constants'; module: string; export: string }   // ← 必须走 shared/constants，禁止复制枚举
  | { kind: 'static';    options: Option[] }
  | { kind: 'remote';    queryKey: string[]; searchParam?: string; labelField: string; valueField: string }

type FieldDescriptor =
  | { kind: 'text'|'textarea'|'email'|'tel'|'password'|'number'; name; labelKey; placeholderKey?;
      required?; maxLength?; minLength?; rows?; counter?; keyboard?; prefixIcon?; suffix? }
  // 选择（注意：没有 radio / combobox —— 见 §3.1）
  | { kind: 'segmented'|'select'|'multiselect'|'checkbox'|'switch';
      name; labelKey; source?: OptionSource; max?; searchable?; allowClear? }
  // 标签（枚举与自由文本同一 kind，由 source 的有无区分）
  | { kind: 'tags'; name; labelKey; source?: OptionSource; max?; maxLength? }
  | { kind: 'date'|'time'|'month'; name; labelKey; min?; max?; allowedMonths?: number[]; yearRange?; format? }
  | { kind: 'stepper'|'rating'|'scale'; name; labelKey; min; max; step?; scaleLabelsKey? }
  | { kind: 'media'; name; labelKey; maxCount?; maxSizeMB?; allowGif?; minCount? }
  | { kind: 'otp';  name; labelKey; length: 4|6; resendKey }
  | { kind: 'custom'; name; render: (api) => ReactNode }
  // 公共字段（所有 kind 可用）
  & { visibleWhen?: (v) => boolean; disabledWhen?: (v) => boolean;
      validate?: (v, all) => string|undefined;      // 返回 i18n key
      asyncValidate?: (v, all) => Promise<string|undefined> }
```
**四条 DSL 纪律**：① **枚举必须来自 `shared/constants/*`**（宪法 9.6）——`kind:'constants'` 是唯一合法来源，**禁止在 App 内复制枚举**；② **校验规则是服务端的镜像，不是替代**：客户端校验只负责"减少一次失败往返"，**服务端始终是权威**；服务端返回的字段错误必须**按字段名回填**，无法映射到字段的进 `ErrorSummary`；③ **同一字段的限额由页面注入，不写在控件里**（同一 `C05 TextArea` 在万能墙是 60/300/1000、指南评论 800、课评 3000、私信 1200）；④ **`asyncValidate` 只允许用于唯一性/权限类判断**，**不得用于任何"猜服务端规则"的场景**。
**§3.2.3 状态机（`【已定】`）**
```
idle ──edit──▶ dirty ──submit──▶ validating ──ok──▶ submitting ──▶ success
                  │                   │                   │
                  │                   └──fail──▶ error(fieldErrors)   ← 焦点移到该字段
                  │                                       │
                  └──leave──▶ DirtyGuard（O03 danger）     └──fail──▶ error(formError)  ← ErrorSummary 置顶
```
| 状态 | 必做 | 禁止 |
|---|---|---|
| `dirty` | 草稿落盘（**进程被杀后输入不丢**，宪法 4.4.3） | 只在内存里存草稿 |
| `validating` | 按钮 `loading`，**表单其余部分保持可用** | 整屏 loading 遮罩 |
| `submitting` | 主按钮 `loading` + **防重复提交** | 允许二次提交 |
| `error` | 字段错误就近 + 摘要置顶 + 焦点移动（**三要素见 §3.7**） | 只弹一个 Toast 说"保存失败" |
| `success` | **不弹成功对话框**（宪法 10.4）→ 直接跳转/返回 + 列表失效重取 | 用 `O03 AlertDialog` 报成功 |
**§3.2.4 提交语义（三种，页面必须显式声明属于哪一种）**
| 语义 | 成功后 | 例 |
|---|---|---|
| **create** | `navigate.replace(详情页)`，并失效相关列表 query | `P-02` `P-05` `P-06` `P-09` `S-11` |
| **update** | `goBack()`，并失效详情 + 列表 query | `M-02` `T-08` |
| **action** | 原地停留，只更新局部状态 | `T-06` 勾选、`S-23` 标记已售、点赞 |
**§3.2.5 表单页反例清单（review 直接判负）**：① 手写表单而不走 `K01 Form`（违反 9.2）；② 用 `O03 AlertDialog` 报成功；③ 字段错误只显示在顶部摘要里（用户不知道改哪一个）；④ 提交中把整个表单变灰；⑤ 离开有未保存内容的表单不确认；⑥ 有草稿却不落盘；⑦ 把服务端限额写成控件内常量；⑧ 图片超限只给"上传失败"而不说清上限是多少。
### 3.3 文本输入类（含"文本底框"）
**§3.3.1 三个不同职责，不得混用**
| 组件 | 职责 | 何时用 |
|---|---|---|
| **`C04 Input`** | 单行文本字段（表单内） | 标题、昵称、联系方式、搜索以外的字段 |
| **`C05 TextArea`** | 多行文本字段（表单内，2–8 行）；**own 字数计数器** | 帖子正文、点评、日记、描述、万能墙 |
| **`O08 InputSheet`** | **文本底框**：底部输入条/底部输入 Sheet（**不在表单内**） | 评论、回复、私信 |
> **"文本底框"的两种读法都已覆盖**：① 指**底部输入框**（评论/回复/私信）→ `O08 InputSheet`；② 指**带下边框的文本输入框** → 那是 `C04 Input` 的 `underline` 外观变体，**不是独立组件**。⛔ **不得为计数器另建 `CharCounter`**：它是 `C05 TextArea` 的 `counter` 属性（9.14-④ 样式壳的直接反例）。
**§3.3.2 `C04` / `C05` 契约**
| 项 | 规则 |
|---|---|
| 解剖 | 标签（外置，不靠 placeholder 当标签）+ 容器（`Surface sunken` 底 + `border.subtle`）+ 前缀/后缀 + 清除按钮 + 计数器 + 错误文本 |
| 键盘映射 | `email`→`email-address`；`number`→`numeric`；`tel`→`phone-pad`；`otp`→`number-pad`；`textarea`→默认多行 |
| 计数器 | `counter` 开启时显示 `当前/上限`；**接近上限（≥90%）转为警告色 + 警告图标**（**警告不得仅靠色块**，宪法 2.1.1）；**超限禁止输入而不是事后报错** |
| 错误 | **就近显示在字段下方**，同时上报给 `K04 ErrorSummary`；文案按 §3.7 |
| 中英弹性 | 定宽按**英文**；**不得按中文长度定宽**（中英长度比中位数 2.50×，宪法 6.2） |
| 字号缩放 | `allowFontScaling` 开启，关键布局设 `maxFontSizeMultiplier` 上限，**不得关掉缩放**（宪法 7.2） |
| 禁用/只读 | 禁用是"不可交互且语义明确"；只读是"可选中复制但不可改"——**两者视觉必须可区分** |
**§3.3.3 `O08 InputSheet`（文本底框）完整定义**
```
┌─────────────────────────────────────────────┐
│ ReplyBar（可选）：正在回复 @昵称        [×]  │  ← 取消回复态（匿名域不得回显身份）
├─────────────────────────────────────────────┤
│ [头像]  ┌───────────────────────────┐  [发送]│
│         │ 输入区（自动增高 1–6 行） │        │
│         └───────────────────────────┘        │
│         0/500                    字数/上限    │
├──────────── 安全区（S05 InsetsPolicy）───────┤
```
| 形态 | 场景 | 行为 |
|---|---|---|
| `inline`（常驻输入条） | `C-02` `S-27` 评论区 | 常驻页脚；聚焦时被键盘顶起；不遮内容（列表加底部留白） |
| `sheet`（弹出式底部输入 Sheet） | 从列表就地回复（`S-04` `S-06`） | 从底部升起；关闭时若**已有内容**则保留草稿，若为空则丢弃 |
| 项 | 规则 |
|---|---|
| 键盘避让 | **必须**用平台键盘避让（原生 Sheet / `KeyboardAvoidingView`），不得用固定 `paddingBottom` 硬顶 |
| 发送语义 | 成功 → **清空输入 + 退出回复态 + 就地插入新评论/新气泡**；失败 → **保留内容** + 就地错误 + 可重试（**绝不丢用户输入**） |
| 字数上限 | 由页面注入：万能墙评论 **500**、指南文章评论 **800**、二手私信 **1200**；帖子评论上限取服务端契约 |
| 多发保护 | 发送中禁用发送键，**不用 Toast 说"发送中"** |
| 空内容 | 发送键 `disabled`（不要允许发送空评论再报错） |
| 草稿 | `sheet` 形态关闭且有内容时**落盘**（进程被杀后不丢，宪法 4.4.3） |
| 无障碍 | 输入区有可读 label；**字数上限变化要播报**；发送键禁用时暴露 `disabled` 状态 |
**三条硬性反向规则**：① **跑腿详情禁止出现任何聊天输入框**（`errands.js` 文件头明确 `No private chat core`，沟通靠 `S-25` 的 `contactInfo`）→ 那里应是复制/拨号动作，不是 `O08`；② **匿名域的输入框不得带"@昵称"回复回显**（万能墙、课评的评论**全程匿名**，`D04 ReplyBar` 不得暴露被回复者身份）；③ **不得用 `O08` 做表单字段**（那是 `C05` 的职责）——混用会让草稿、校验、离开确认三套语义互相打架。
**§3.3.4 `C20 MediaPicker` 契约（图片是最高频的数据入口）**
| 项 | 规则 |
|---|---|
| 限额由页面注入 | `P-02` 帖子/热搜/校园 **≤3**；`P-05` 二手 **≤4**；评论 **≤3**；`M-02` 头像 **1**；`S-19` 社团图 **≤4**；`S-11` 点评图 **≤3** |
| 格式 | 帖子类：jpg/png/webp/**gif**；**二手：仅 jpg/png/webp，无 gif**（后端如此） |
| 单张上限 | 8 MB（帖子类）／头像 ≤8MB（gif 允许） |
| 上传前 | **客户端压缩**（长边与质量按令牌配置）；**超过上限在选择后立刻报错**，不能等服务端；失败文案按 §3.7 |
| 单项状态 | `pending` → `uploading`（带进度）→ `done` → `failed`（**可单独重试**，不影响其它项） |
| 排序与封面 | 支持拖拽排序；**第 1 张即封面**（二手与帖子均如此） |
| 扩展名会变 | 指南图片由服务端 **sharp 转 WebP**（≤2048 宽，q82）→ **回显 URL 扩展名与用户所选不同，UI 不得据此报错** |
| a11y | 每张图有删除按钮的可读 label；图片有替代文本；**仅靠颜色区分"已上传/失败"不合格** |
### 3.4 覆盖层与通知阶梯（**"弹窗通知"与"全屏通知"的准确定位**）
**§3.4.1 阶梯（从最轻到最重，越级即违规）**
| 级 | 组件 | 侵入度 | 用途 | 时长 | 阻断 | 允许的触发 |
|---|---|---|---|---|---|---|
| **N0** | `A08 Badge` on `C02 IconButton`（信箱） | 无 | 未读存在 | 常驻 | 否 | 任何新通知（**角标是"不漏消息"的第一责任**，宪法 4.7.4） |
| **N1** | `O01 Toast` | 极低 | **操作回执**（成功/失败/可撤销） | 2–4s，可滑走 | 否 | 提交成功、复制成功、失败重试、轻量撤销 |
| **N2** | `O02 InlineNotice` | 低 | 页内**常驻状态**说明 | 常驻至条件消失 | 否 | 离线、缓存数据、**校方系统会话已过期**、覆盖提醒、权限不足 |
| **N3** | `O03 AlertDialog` | 中 | **需要决策**（不可逆 / 高风险）；`danger` 变体含二次输入 | 常驻 | **是** | 删除确认、清空信箱、课表整表覆盖、丢弃草稿、账号注销二次输入 |
| **N4** | `O05 ActionSheet` | 中 | **多个平级动作选一** | 常驻 | 是 | 卡片"更多"、分享、举报原因、成员管理 |
| **N5** | `O06 BottomSheet` | 中 | **就地展开内容**（不离开上下文） | 常驻 | 半模态 | 评论、筛选、万能墙版式选择 |
| **N6** | `O11 FullScreenModal` | 高 | **单一任务表单 / 沉浸查看** | 常驻 | 是 | 发布、编辑、导入、图片全屏 |
| **N7 / N7′** | `O12 FullScreenNotice` + `O13 PermissionPrompt` | 最高 | **全屏通知**：接管整屏，**只解释 + 只给一个动作**；`O13` 是**先解释再申请系统权限**的形态 | 常驻 | 是 | **ToS 门禁**、通知权限（`A-06`／`M-14`）、**账号受限/封禁**、注销后果、强更 |
| **N8** | `S01 PushPayload` + `S02 NotificationChannel` | OS 级 | **离开 App 后仍需知道** | OS 决定 | OS | 私信、接单、报名截止、课前提醒、公告 |
> **N7 与 N7′ 的分工**：`O13` 是**解释 + 触发系统弹窗**（不接管整屏结论），`O12` 是**结论本身**（封禁、门禁、强更）。`A-06` 同时使用两者：先 `O13` 解释 → 再 `O12` 承接"被拒绝后不可用哪些能力"。
> **本轮新增与修订的五条落点**：① **发帖前 ToS 门禁 = `O12`**（不是注册弹窗，是**发布链路上的拦截点**，商店红线）；② **通知权限 = `O13`**（＋被拒后的 `O12` 解释）；③ **账号受限 / 封禁 = `O12`**（`checkSanction` 是 15+ 端点的写前置 → 必须有统一解释面）；④ ⛔ **校方系统会话过期 = `O02 InlineNotice`，不是全屏接管**（会话失效不该把用户从 `T-05` 里踢出去，见 §3.5）；⑤ ⛔ **App 内不做阻塞式公告弹窗** —— 公告**降级为 `F-01` 信箱置顶 + `A08` 角标**。
**§3.4.2 "弹窗通知"的准确定义（N1–N3 三个不同东西）**
| 用户口语 | 实例 | 语义 | 正确组件 | 禁止 |
|---|---|---|---|---|
| "提示一下" | "已复制" "发布成功" | **回执**（无需决策） | `O01 Toast` | ❌ 用 `O03`（要用户多点一次） |
| "页面上提示" | "当前离线，展示缓存内容" | **状态**（常驻，无需动作） | `O02 InlineNotice` | ❌ 用 Toast（会消失，用户没看到） |
| "弹窗问一下" | "确认删除这篇帖子？" | **决策**（不可逆） | `O03 AlertDialog`（`danger`） | ❌ 用 Toast（可滑走 = 没确认过） |
**三条硬规则**：① **用户预期会成功的操作不弹成功提示** → 发布/保存/点赞**不弹对话框**，最多 `Toast`；② **预期内的删除不警告**（如从列表移除自己刚加的一张图），**意外且不可逆的才警告**（删帖、清空信箱、整表覆盖课表）；③ **同时不得叠两个模态、任何时刻不得显示两个 alert**（宪法 4.4.4）。
**§3.4.3 "全屏通知"的准确定义（`O12 FullScreenNotice`）**
Android 有一个**系统级**的 "full-screen intent"（可在锁屏上全屏显示），但它是**受限能力**。本项目的通知类型（私信 / 接单 / 公告 / 提醒）**不属于该能力的允许场景**，因此：
> **"全屏通知"在本项目里的正确落点是"应用内全屏接管"（`O12`），而不是系统级 full-screen intent。** ⚠️ `【待核实】`：AOSP《全屏 intent 限制》页**须在浏览器中人工读取并记录允许场景清单与访问日期**（宪法 15.2：不得凭记忆写官方数值）。**在上架前不得据"锁屏全屏通知"做任何设计假设。**
| 项 | 规则 |
|---|---|
| 解剖 | 品牌头（可选）+ 标题 + **解释正文**（说清后果）+ **唯一主行动** +（可选）次要文本动作（"稍后" / "退出登录"） |
| 允许触发（**穷举，不得新增**） | ① 首次发布前的 **ToS/用户政策门禁**（`A-05`，**商店红线**）② **通知权限解释**（`A-06`）③ **账号被封禁/禁言**说明（`A-07`）④ **账号注销后果确认**（`M-16`）⑤ **强更**（版本不可用） |
| **禁止触发** | ⛔ 公告（降级为信箱置顶 + 角标）⛔ 营销/推广 ⛔ 成就/升级庆祝（用 `Toast` + 就地 `ExpBar` 动效）⛔ 表单（那是 `O11`）⛔ **校方系统会话过期**（那是 `O02`） |
| 单一动作 | **一个主行动**。次要动作只能是"退出/稍后"这类**放弃路径**，不得给两个平级正面按钮 |
| 可逃逸性 | **只有 ToS 门禁与强更允许"不可返回"**；其余全屏通知**必须能用系统返回退出**，且退出后**下次以更轻的形式再提**（角标/`O02`），**不得循环弹** |
| 频控 | 同一全屏通知**每天最多出现 1 次**（除 ToS 门禁与强更），且**不得在用户正在输入时弹出**（会丢草稿） |
| 无障碍 | 标题为可读焦点；**主行动是默认焦点**；播报说明正文；**不依赖动画表达"重要"** |
**§3.4.4 阶梯落点对照表（事件 → 级别）**
| 事件 | 级别 | 组件 | 页 | 备注 |
|---|---|---|---|---|
| 发布 / 保存 / 编辑成功；复制联系方式 / 链接成功 | N1 | `Toast` | `P-*` `M-02` `T-06` `S-25` `S-27` | **不弹对话框**；随后按 §3.2.4 跳转 |
| 操作失败（可重试）；无网络 / 弱网；数据来自缓存 | N1+N2 / N2 | `Toast` + 就地错误；`T04 OfflineBanner` | 全部 | 文案按 §3.7；离线优先**先给本地再刷新**；缓存必须**如实标注** |
| **校方系统会话已过期** | **N2** | **`O02 InlineNotice`** | `T-04` `T-05` | ⛔ **不升级为全屏接管**（§3.5） |
| 日记将覆盖已有内容 | N2 | `O02` | `T-08` | 一天一篇、覆盖式 upsert |
| 草稿未提交 | N2 | `O02` | `P-*` `T-08` | — |
| 权限不足（组织发帖 / 非社团管理员） | N1+N2 | `Toast` + 就地说明 | `P-04` `S-17` `S-18` | 权限由后端布尔字段驱动，UI 不得自行推断 |
| 删除帖子 / 点评 / 待办 | N3 | `O03(danger)` | `C-02` `M-04` `M-05` `T-06` | 不可逆 → 确认 |
| 清空信箱 | N3 | `O03(danger)` | `F-01` | **必须说明"公告无法清除"** |
| 课表导入 commit | N3 | `O03(danger)` | `T-03` | **整表覆盖**，必须写清会替换现有课表 |
| 离开有未保存内容的表单 | N3 | `O03(danger)` | `P-*` `T-08` | 先解释再给解决方式（宪法 4.4.4） |
| 卡片"更多"操作；举报（选原因）；成员管理 | N4→N5 | `O05` + `O14` | `S-23` `S-25` `M-03` + 全部详情页 | 举报 8 种原因；**不可埋进二级菜单** |
| 评论 / 回复 / 发私信 | N5 | `O08` | `C-02` `S-04` `S-06` `S-27` `M-12` | **文本底框**；失败不丢内容 |
| 万能墙版式选择 | N5 | `O06` | `C-05` | 三版式 + 字数上限随版式切换 |
| 筛选（多条件） | N5 | `O06` | `S-22` `C-01` | 筛选条件必须持久化（`K05`） |
| 发布 / 编辑 / 导入 | N6 | `O11` | `P-*` `M-02` `T-03` | **单一任务**；带草稿与离开确认 |
| **首次发布前未接受 ToS** | **N7** | **`O12`** | `A-05` | **商店红线**；**发布链路拦截点，不是注册弹窗** |
| 通知权限解释与申请 | N7′→N7 | `O13` → `O12` | `A-06` `M-14` | 先解释再申请；被拒后有降级路径 |
| **账号被封禁 / 禁言** | **N7** | **`O12`** | `A-07` | 统一解释面（`checkSanction` 拦任意写操作） |
| 账号注销后果确认 | N7 | `O03(danger 二次输入)` + `O12` | `M-16` | 级联删除后果必须写清 |
| 版本强更 | N7 | `O12` | `F-01`（入口） | 唯一允许不可返回的场景之一 |
| 新公告；新私信（前台） | **N0+N2** / N0 | `A08` + `F-01` 信箱置顶；`A08` | `F-01` `M-11` | ⛔ **不做阻塞式弹窗**；前台私信**不弹窗**（可选极轻 `Toast`） |
| 新私信（后台）；被接单 / 报名截止 / 课前 30 分钟 | **N8** | 系统推送 | — | 深链直达 `M-12`；推送通道前置见页面清单 §7-4 |
| 点赞；经验/等级提升 | **无** / N1+就地 | 就地动效；`Toast` + `K16` 动画 | 全部内容页；`M-01` `M-17` | **高频交互默认不动**（宪法 8.3）；⛔ 不用 `O12` 做庆祝 |
**§3.4.5 推送（N8）的边界规则**：① **推送只推"需要立刻知道"的**：私信、接单、报名截止、课前提醒、公告；② **不得用推送做"应用内已能即时看到的事"**（如 App 前台时的新点赞）；③ **载荷必须含 `deep_link`**（现状只有 Web `url`），且**深链进 App 时栈底必须回退到广场**（页面清单 §5.2，宪法 4.7.6）；④ **权限被拒时不得功能降级为不可用**：角标与信箱仍然工作，只少了主动到达；⑤ **Android 13+ 必须有 Notification Channel**，且**渠道划分要与信箱的三个 category 对齐**（否则用户无法按类别静音）。
### 3.5 校方系统会话组件（**v2.0 新增**）
**定位**：这是**App 独有、Web 完全没有**的能力，且被所有者指定为**本 App 最主要功能**（宪法 4.1.2）。因此把边界与机制写清。
**§3.5.1 归属：`T-05` 属 `P18`，不属任何组件层**
| 对象 | 归属 | 说明 |
|---|---|---|
| **`T-04` 校方系统与会话** | `P2 列表`（原生页） | 由 **`D27 SchoolSystemCard`** 呈现每个系统的会话状态 |
| **`T-05` 校方系统内嵌浏览器** | **`P18 内嵌网页容器`（建议新增，待评审）** | 它的"组件"是**原型的组成部件**，不进 L2–L7 注册表：`WebViewContainer`（`react-native-webview` 封装）、`SchoolSystemToolbar`（原生导航栏 + 页面级动作） |
| **`T-01` 工具首页** | `P7 仪表盘` | 用 `D27` 展示会话摘要（与原生课表/待办/放假日**同屏同层**，宪法 4.1.2-5） |
> ⛔ **不得把 `T-05` 拆成一个"全屏 WebView 组件"塞进覆盖层**：它是**一个完整页面**（有导航栏、页面级动作、会话状态），按宪法 **9.1** 应"先评审是否新增原型"——本文件据此**提议新增 `P18`**，而非新增页面或组件。
**§3.5.2 `D27 SchoolSystemCard` 定义**
| 项 | 规则 |
|---|---|
| 解剖 | `K08 Card` > `A06 Icon`（第 1 层：AC `app-window` / Moodle `graduation-cap` / 签到 `qr-code`）+ 系统名 + **会话状态徽标** + 动作（打开 / 清除会话） |
| **会话状态（三态，穷举）** | `未登录` ／ `已登录` ／ **`已过期`** |
| 状态呈现 | **必须同时出现图标与文案**（不得仅靠色块，宪法 2.1.1）；`已过期` 用警告档 |
| 动作 | 主行动 = **打开**（进 `T-05`）；次行动 = **清除会话**（就地可撤销，用 `O03(danger)` 确认） |
| 引用 | **2**：`T-01`（工具首页摘要）、`T-04`（校方系统列表） |
| 禁止 | ⛔ 不做任何"自动签到/自动刷新"入口；⛔ 不展示任何凭据字段（见 §3.5.4） |
**§3.5.3 `P18` 骨架契约（原生导航栏 + 平台 WebView + 页面级动作）**
```
┌─────────────────────────────────────────────┐
│ ← 返回（原生）   校方系统名        [更多]    │  ← 第 2 层图标（平台提供）
├─────────────────────────────────────────────┤
│        平台 WebView（cookie 由系统持有）      │  ← 我们不经手凭据
├─────────────────────────────────────────────┤
│ [读取本页课表]            （页面级动作条）     │  ← 第 1 层按钮 C01
└─────────────────────────────────────────────┘
```
| 项 | 契约 |
|---|---|
| 会话状态机 | `未登录` →（用户在 WebView 内自行登录）→ `已登录` →（cookie 失效/被清）→ **`已过期`** |
| `已过期` 的呈现 | **`O02 InlineNotice` 贴在动作条上方**，文案 = 结论 + 一个动作（"重新登录"）；⛔ **不得整屏接管**（`O12` 禁止触发，§3.4.3） |
| **「读取本页课表」的前置条件** | ① 会话为 `已登录`（`未登录`/`已过期` 时按钮 `disabled` 且就地说明原因）；② 当前页已被识别为课表页（否则给出"先打开课表页"的就地提示）；③ 注入脚本已取到 `<table>` |
| 成功路径 | 注入 JS 读 `<table>` → 逐行 `join('\t')` → 文本 → 进 `T-03 导入预览` → `AlertDialog(danger，整表覆盖)` → `POST /api/schedule/import` → `T-02` |
| **失败文案**（按 §3.7） | 可感知：指明对象（"课表页"／"本页表格"）；可理解：说明真实原因（页面结构不符 / 未登录 / 读取超时）；可改正：给一个动词开头的动作（"先打开课表页" / "重新登录"）。**⛔ 禁止"读取失败""请稍后重试"** |
| insets 与键盘 | **本骨架自行处理**（`S05 InsetsPolicy`）：WebView 必须避开手势条与刘海；不依赖外部容器 |
| 降级路径 | 抓取不可用时**退回 `T-03` 内的"粘贴文本"手输**（保留为兜底，不删除） |
| 深链 | **`T-05` 不接深链**（会话级能力，不进外部分发），登记进 `S03 DeepLinkRouter` |
**§3.5.4 ⛔ 四条红线（安全与合规）**
| # | 红线 | 依据 |
|---|---|---|
| 1 | **凭据不出设备、不上传**：本项目后端**不得**接收、存储或转发校方系统凭据 | 宪法 4.1.2-3 |
| 2 | ⛔ **不经手 cookie**：会话由**平台 WebView 的 cookie 存储**持有（iOS `WKWebsiteDataStore.default()` / Android `CookieManager`）；**App 代码不读取、不落盘、不上传**。"清除会话"**只能调用平台的清除 API** | 页面清单 §2.4(2) |
| 3 | ⛔ **不得自动化"签到"或任何代替用户完成的校方动作**：不做自动打卡、模拟点击、批量提交 | 宪法 4.1.2-4 |
| 4 | ⛔ **不得用 RN 侧 `fetch` 带 cookie 复现课表请求**（需读出 cookie → 违反第 2 条） | 页面清单 §3-T.1(3) |
> ⚠️ **一处措辞待裁**：宪法 4.1.2-2 写"token / cookie 走 `expo-secure-store`"。**我们自己的登录态（JWT）走 `expo-secure-store`**；而**校方系统凭据根本不进我们的代码**，由平台 cookie 存储持有——**这比"取出来存 secure-store"更严格**。本文件按此读法执行，**待所有者确认**（§8.3-8）。
**§3.5.5 依赖准入（`react-native-webview` 不在宪法 9.9 第①层清单内）**
| 项 | 结论 |
|---|---|
| 清单状态 | ⚠️ **它是宪法 9.9 第①层清单之外的新增原生依赖** → 引入前**必须走宪法 3.4 依赖准入五项**：**许可证 / 是否含原生代码 / OTA 影响判定 / 最后发布时间**〔宪法 9.13：读**版本自身**时间戳，⛔ 不得用 `time.modified`〕**/ 是否强加视觉身份** |
| 台账 | 必须登记进 **OTA 台账**（宪法 11.4）：含原生的变更**必须重新构建并走商店审核**，不能靠 OTA 上 |
| ⚠️ 商店合规 | **App Store 4.2（Minimum Functionality）会拒"只是网页封装的 App"** → ① `T-01` **必须把校方系统与原生课表/待办/放假日同屏同层呈现**；② 上架前做一次专项自评（宪法 4.1.2-5） |
| ⚠️ 抓取机制 | **首选**注入 JS 读 DOM（纯 JS，无自写原生模块）；**兜底**拦截导航响应体（iOS 需自写原生模块 → 宪法 11.7：须放 `modules/`，不得改 `ios/`，且须 ADR）；**⛔ 禁止**带 cookie 直连复现请求 |
| `【待核实】` | 目标校方系统**是否有反 WebView / UA 白名单**（`X-Frame-Options` 不约束原生 WebView 顶层导航）；**Moodle / 签到 的登录是否走 Google**（若是 → 该格降级为系统浏览器）；**iOS `WKWebView` 第三方 cookie 持久化**与 **Android `CookieManager` 跨会话保持**；课表页渲染时机与列语义。**AC＝学号登录已确认，主链路不卡在 Google 上** |
### 3.6 文案纪律绑定（宪法 10.5 —— **每个承载文字的元素都有预算**）
| 类别 | 含义 | 元素 | 字数预算 | 英文预算 |
|---|---|---|---|---|
| **标识** | 这是哪里 / 这是什么 | 页面标题、分区标题、Tab 标签、字段标签、系统名 | **标题 ≤12 汉字**；标签 ≤6 汉字 | 标题 ≤6 词；标签 ≤2 词 |
| **动作** | 按了会发生什么 | 按钮、FAB、行尾动作、菜单项、链接 | **≤6 汉字**，动词开头 | **≤2 词** |
| **状态** | 现在怎么了 | 徽标、角标、计时、进度、会话状态、回执 | **≤6 汉字** | ≤2 词 |
| **正文说明** | 仅错误与合规场景允许存在 | `O02` `O12` 正文、`T02` 详情、条款正文 | **≤30 汉字**，且**先短后详** | ≤15 词 |
**落地绑定表（按组件）**
| 组件 / 位置 | 文字类别 | 预算 | ⛔ 禁止 |
|---|---|---|---|
| `C01 Button` | 动作 | ≤6 汉字 / ≤2 词 | 说明性副标题、括号补充（"发布（会同步到广场）"） |
| `C02 IconButton` | 动作（`label`） | ≤6 汉字 | 无标签（宪法 16.2.4） |
| `C03 Fab` | 动作 | ≤6 汉字 | 长句 |
| `A09 Chip` / `C21 TagPicker` 的 chip | 标识 | ≤6 汉字 | 标签内写句子 |
| `A08 Badge` | 状态 | **数字 / ≤6 汉字** | "有 3 条新消息哦" |
| `K07 SectionHeader` | 标识 | ≤12 汉字 | 分区说明段 |
| `K06 ListItem` 主文案 / 副文案 | 标识 / 状态 | ≤12 汉字 / ≤30 汉字 | 两行解释；「点击查看详情」这类旁白 |
| `K03 FormField` 标签 | 标识 | ≤6 汉字；**不得把说明塞进标签** | 「标题（不超过 120 个字符，必填）」 |
| `K03 FormField` 帮助文本 | **默认不出现**；仅在合规/格式硬要求时 | ≤30 汉字 | 「这个字段是用来…」 |
| `K04 ErrorSummary` / 字段错误 | **错误（唯一例外）** | 先短后详：一句话 ≤30 汉字结论 + 可展开细节 | 笼统措辞（§3.7） |
| `T01 EmptyState` / `T02 ErrorState` | 标识 + 动作 / 错误 | 标题 ≤12 汉字 + **一个动作 ≤6 汉字**；错误按 §3.7 | 「暂无数据」（**必须有动作**，宪法 10.2）；笼统措辞 |
| `T03 LoadingState` / `T04 OfflineBanner` | — / 状态 | **不配任何文字**；`T04` ≤12 汉字 | `加载中…` · `请稍候`；「网络似乎不太好呢」 |
| `O01 Toast` / `O02 InlineNotice` | 状态 | `O01` ≤6 汉字；`O02` ≤30 汉字（先短后详） | 需要阅读的说明；说明性旁白 |
| `O03 AlertDialog` | 标题 + 动作（正文仅解释后果时出现） | 标题 ≤12 汉字；正文 ≤30 汉字；按钮 ≤6 汉字 | 双正面按钮并列 |
| `O12 FullScreenNotice` | 标题 + 正文 + 动作 | 标题 ≤12 汉字；正文 ≤30 汉字（先短后详）；动作 ≤6 汉字 | 「注意：…」式旁白 |
| `P16` 静态说明（`M-19`–`M-23`） | **合规正文（例外）** | 不受 30 字限制，但**必须结构化**（小标题 + 段落），不得写成散文 | 同时**不得**在其它页面滥用此例外 |
**三类之外的文字一律删**（宪法 10.5-4）。⛔ **禁止清单**：说明性旁白（"这个功能是用来…"／"你可以在这里…"）· **「注意：…」/「温馨提示」** · `加载中…` · `请稍候` · `暂无数据` · 用文案弥补设计缺陷（**改设计，不加文案**）· 卖萌、夸赞、感叹号堆叠。
> **错误文案是唯一的长度例外，但仍须「先短后详」**：一句话结论 + 可展开细节。**冲突时以 10.4 为先**：**"简洁"指字数，"具体"指信息量**，两者不冲突；一旦冲突（例如"具体"需要超过 30 字），**以 10.4 的三要素为准**，用"可展开细节"承载超出部分。
### 3.7 错误文案三要素（宪法 10.4 —— **`T02` 与 `K04` 的唯一实现处**）
| 要素 | 要求 | 反例 → 正例 |
|---|---|---|
| **可感知** | 指明**具体对象**（哪个字段 / 哪条内容 / 哪个操作） | 「操作失败」→「食堂评价提交失败」 |
| **可理解** | 说明**真实原因**，可归因，不甩锅给"系统" | 「网络错误」→「图片 3.2 MB，超过 2 MB 上限」 |
| **可改正** | 给**一个可执行动作**，动词开头，用户立刻能做 | 「请稍后重试」→「换一张小于 2 MB 的图片」 |
**⛔ 笼统措辞清单（出现即视为未完成）**：`出错了` · `操作失败` · `网络错误` · `请稍后重试` · `系统繁忙` · `未知错误`（**不得用"未知错误"掩盖已知原因**）。
**网络类必须区分三种**（用户能做的事不同）
| 子情形 | 可感知 | 可理解 | 可改正 | 绑定 |
|---|---|---|---|---|
| **无网络** | 指明被阻塞的动作 | 设备当前无网络连接 | 「检查网络」 | `T02(network.offline)` |
| **服务不可达** | 同上 | 服务端未响应（非用户网络问题） | 「稍后重试」 | `T02(network.unreachable)` |
| **超时** | 同上 | 请求超时 | 「重试」（并保留用户输入） | `T02(network.timeout)` |
**其它绑定规则**
| 规则 | 出处 |
|---|---|
| **技术细节不得外泄**：不显示 HTTP 状态码、堆栈、SQL、内部错误码原文 | 宪法 10.4 |
| **一个错误只给一个主行动**；有次行动时降级为文字链接 | 宪法 10.4 |
| 校验类错误**就近显示在字段旁**，摘要置顶并**把焦点移过去** | 宪法 10.4 → `K04` |
| ⚠️ **业务失败不是网络失败**：`S-14` 的空/超长 `q` 返回 **HTTP 200 + `status:-1`** → 必须渲染为 `T02(business)` 或 `T01(noResult)`，**⛔ 不得渲染为网络错误态** | 页面清单 §3-S |
| `T02` 与 `K04` **共用同一套文案模板**；页面**不得自写错误文案** | 本文件 §3.2.5-② |

---

## 4. 统一状态命名总表（**跨组件一致，不得各组件自创**）
| 状态 | 语义 | 视觉表达（令牌） | 必须存在 | 典型组件 |
|---|---|---|---|---|
| `default` | 静息 | 语义令牌默认值 | ✅ | 全部 |
| `pressed` | 按下中 | 表面色下压一档（**不用阴影**） | ✅ | 全部可点 |
| `focused` | 聚焦（键盘/无障碍焦点） | `border.strong` + 聚焦环 | ✅ | 全部可交互（**TalkBack/VoiceOver 必须可见**） |
| `selected` | 已选中（多选中） | `bg.brandSoft` + `text.onBrandSoft` + 勾 | ✅ | `A09` `K06` `C10` `C09` |
| `active` | 当前项（互斥中） | 强调色 + 字重 | ✅ | `C14` `K22` |
| `disabled` | 不可交互 | `text.disabled` + 降透明 | ✅ | 全部 |
| `readonly` | 可读可复制不可改 | 与 `disabled` **必须可区分** | 条件 | `C04` `C05` |
| `loading` | 加载中 | `A10 Skeleton` / `A11 Progress`（**持续性动**） | ✅ | 全部数据位 |
| `empty` | 无数据 | `T01 EmptyState`（分三类） | ✅ | 列表/详情 |
| `error` | 错误 | `state.danger` + **图标 + 文案**（不得只靠颜色） | ✅ | 全部 |
| `warning` | 警告 | `state.warning` + **图标 + 文案**（**警告必须双通道**） | ✅ | 计数器接近上限、会话已过期 |
| `stale` | 数据来自缓存 | `T04 OfflineBanner(stale)` | ✅ | 所有列表 |
| `overLimit` | 超限 | 输入**被阻止**（不是事后报错） | ✅ | 带计数器的输入 |
| `unread` | 未读 | `A08 Badge` | ✅ | `F-01` `M-11` |
| `dirty` | 有未保存改动 | 底栏主按钮可点 + 离开确认 | ✅ | `K01 Form` |
| `submitting` | 提交中 | 主按钮 `loading` + 防重复 | ✅ | `K01 Form` |
| `success` | 成功 | `O01 Toast`（**不弹对话框**） | ✅ | 动作类 |
| `sending` / `failed` | 发送中 / 失败（**保留内容**） | 就地状态 + 重试 | ✅ | `O08` `D06` |
| `read` | 已读（**二手私信专用**，v1.0 的 `D07` 已并入） | `D05 ChatBubble` 的角标位 | 条件 | `D05` |
**三条规则**：① **`error` / `warning` / `success` 不得只靠颜色表达**（色盲与 WCAG 1.4.1）；`disabled` 与 `readonly` **必须可区分**；② **`loading` 的指示器必须持续在动**，且**不得配"loading…"这类无信息量文字**（宪法 10.3/10.5）；③ **`warning` 必须同时出现图标与文案**（宪法 2.1.1：55° 琥珀与美团黄同处暖色区，扫视下需第二重区分）。

---

## 5. 令牌绑定与禁止项
### 5.1 组件 → 令牌的绑定关系（**改用 v2.0 新品牌令牌**）
**令牌全表与逐项实测见 [App 设计令牌规范](./App设计令牌规范.md) §三。** 本节只写"哪个组件允许消费哪一档、以及为什么不是别档"。
| 组件 / 用途 | 允许消费的令牌 | 令牌规范实测 | ⛔ 明确禁止 |
|---|---|---|---|
| `C01 Button(primary)` CTA 填充 | **`brand-600` `#2452a6`** + 白字 | 白字 on 它 **7.41:1** ✅ | ❌ 用 `brand-300/400` 承载白字（**2.37 / 3.16 ❌**） |
| CTA 的次选填充 | `brand-500` `#3d6dc3` + 白字 | **5.03:1** ✅ | ❌ 用 `brand-200` 以下承载白字 |
| CTA 的 Neo-Brutalism 配方 | **`accent-300` `#ffc300` + 黑字 + 2px 黑描边** | 黑字 on 它 **13.06:1** ✅ | ⛔ **美团黄永不作亮色主题的文字**（作文字 on 白 **1.61 ❌**） |
| **亮色主题主文字 / 主标题 / 顶栏** | **`brand-700` `#173874`**（**官方锚点**） | 它作文字 on 白 **11.33:1** ✅ | ⛔ **`brand-700` on 暗底仅 1.63:1 → 暗色不得用它** |
| **暗色主题的强调文字 / 图标** | **`brand-300` `#7fa9f3`**（on 暗底 7.78 ✅）；次级 **`brand-400` `#5e90ea`**（5.83 ✅） | — | ⛔ **亮色主题的深蓝阶（700/600/500）一律不得出现在暗色文字位**（1.63 / 2.48 / 3.66） |
| **与品牌色同现的辅助黄（亮色）** | **`accent-700` `#6a5319`**（亮色下**唯一可作文字的黄色档**，7.33 ✅） | — | ❌ `accent-300/500` 作亮色文字（1.61 / 3.14） |
| **暗色主题的黄色强调** | `accent-300` `#ffc300`（on 暗底 **11.45** ⚠️ 好用） | — | 仅限暗色；亮色下只能作**填充 + 黑字** |
| `A08 Badge` / `K07 SectionHeader` | Neo-Brutalism 允许：`border.strong` 2px + 硬偏移阴影 + 高对比色块（`accent-300` 或 `brand-600`） | — | ❌ 用在卡底/正文/列表行/导航壳/弹层容器/表单控件 |
| `O01 Toast` / `O02 InlineNotice` | `bg.surfaceRaised` + `text.primary`；**状态色仅作图标/描边** | — | ❌ 用状态色承载长正文 |
| 成功 / 警告 / 危险（暗色） | **`#39c58d` / `#bb6a29` / `#f36d6d`**（暗底 **8.37 / 4.56 / 6.33** ✅） | — | ❌ 暗色沿用亮色档（对比不足） |
| 成功 / 警告 / 危险（**亮色文字档**） | **`#277e5a` / `#a75d24` / `#be484b`** | 对**六个亮色底全部 ≥4.5:1**（canvas 4.68/4.67/4.69；surface 4.98/4.96/4.98；sunken 4.57/4.55/4.57；三个 soft 底 4.54–4.65） | ❌ 用 v1.0 初版值 `#29845e/#af6226/#c35253`（**canvas 上仅 4.34/4.30/4.25 ❌**，已作废）；❌ 把状态文字限制在 surface 上（该处置已推翻） |
| `D18 MarkdownReader` | 字阶 + `text.*` | — | ❌ 硬编码字号（长文是"字号字面量"最易复发处） |
| 全部组件 | `bg.{canvas,surface,raised,sunken,brandSoft}`、`text.{primary,secondary,muted,onBrand,disabled}`、`border.{subtle,strong}` | 文本阶梯**必须同时对 canvas 与 surface 都达 4.5:1**（宪法 2.3） | ⛔ 暗色纯黑大底；⛔ 语义令牌跨用途挪用（分隔线色当文字色） |
**三条令牌纪律（宪法 2.3 / 2.4）**
| # | 纪律 | 说明 |
|---|---|---|
| 1 | **每个颜色令牌必须携带 `value` / `usage` / `textSafe` / `contrastOn` / `contrastRatio` / `theme`** | 组件只消费带元数据的令牌；缺元数据的令牌不得进组件 |
| 2 | ⛔ **`textSafe` 不得按档位推断** | 只能由该令牌对**声明背景**（`contrastOn`）的实测比值决定。同一个 `brand-400` 在暗色下 `textSafe=true`（5.83）、亮色下 `false`（3.16）——**这是正常的** |
| 3 | **主色与状态色各自独占色相，间距 ≥25°** | 警告色相已移至 **55°**（原 73.3°）→ 对美团黄 31.1°、对危险 32.7°、对厦大蓝 153.8° ✅ **不需要任何例外** |
### 5.2 禁止项（**lint 或 review 阻断**）
| # | 禁止 | 依据 / 检测方式 |
|---|---|---|
| 1 | 组件内出现 `#hex` | `design-debt-report.js`：必须为 **0**（旧 v1 实测 1437 处） |
| 2 | 组件内出现 `fontSize` 字面量 | 同上：必须为 **0**（旧 v1 实测 645 处） |
| 3 | 组件内出现间距/圆角字面量 | 风格体系 §一：令牌化 |
| 4 | 内联双语三元 `isZh ? … : …` | 同上：必须为 **0**；全部走 `t('key')` |
| 5 | **Neo-Brutalism 出现在第 4 类元素上** | 宪法第 1 条：白名单只有 **CTA / Badge / 分区标题** 三类 |
| 6 | 用模糊/玻璃表达层级 | 风格体系 §2.6-7：层级由**表面色**表达 |
| 7 | 自绘导航壳（Tab 栏 / Header / Sheet / 返回手势） | 宪法 4.3：**禁止模式** |
| 8 | 在 Android 上书写 `fontFamily` | 宪法 2.5：Android 会**静默回退且不打印日志**（RN #58750） |
| 9 | 为一个页面新增组件 | 宪法 9.1：先声明原型，再评审是否新增 |
| 10 | 引用 `shared/components/` | 宪法 9.6：该目录含 `.jsx` + `.css`，**Web 专属**，不得导入 RN |
| 11 | 复制 `shared/constants/*` 的枚举到 App | §3.1 纪律：复制的那份会静默过期 |
| 12 | 组件自带"默认主题" | 组件层调研 §1.2：任何"自带主题、需要覆盖"的库都会把设计债搬进我们的仓库 |
| **13** | ⛔ **任何渐变背景**（`LinearGradient` / `MeshGradient` / CSS 渐变 / 用图片模拟）· ⛔ **Emoji / Unicode 符号当图标**（`✅` `⚠️` `🔥` `★` `✓` `▸`） | **宪法 1.3.5 / 1.3.6**；风格体系 §十六-1；§16.2.1（Web 侧实测 346 个 JSX 文件 emoji **0 次**） |
| **14** | ⛔ **组件嵌套套壳**（透传壳 / 同语义多层 / 为复用而抽象 / 样式壳） | **宪法 9.14**；判据：*删掉它、把内容上提一层，是否丢失行为？* |
| **15** | ⛔ **说明性文案**（旁白、「注意：…」、`加载中…`、`请稍候`、`暂无数据`）· ⛔ **barrel 导入 Lucide**（`import { Mail } from 'lucide-react-native'`） | **宪法 10.5 / 16.5-1**；§3.6；只允许 `lucide-react-native/icons/<kebab-name>` |
| **16** | ⛔ **调用点传 `strokeWidth`**（含 `absoluteStrokeWidth` / `nonScalingStroke`） | **宪法 16.5-2**；全局只在 `LucideProvider`／原子内部设一次，取 **2** |
| **17** | ⛔ **原生 Tab 栏内使用 Lucide 图标** | **宪法 16.1／16.6-3**；Tab 图标是**平台资产**（Material Symbols / SF Symbols） |

---

## 6. 双端映射（`@expo/ui` 优先，宪法 11.8）
**总原则**：`@expo/ui` 是**原语库不是设计套件**（官方原文："not an opinionated design kit… it's a primitives library"），因此**平台控件走它，视觉决定由我们给**。凡 `@expo/ui` 已提供的原生组件，**不允许自写原生实现**。
⚠️ **两条已知硬约束**：① `@expo/ui` **内部没有 Yoga**——进入原生上下文后布局必须用 `HStack`/`VStack`（iOS）或 `Row`/`Column`（Android），**且必须包在 `Host` 内**；⚠️ 但**限制只在原生 context 内**——`universal` 入口本身走 RN 的 `View` + Flexbox，⛔ 不得据此说"`@expo/ui` 不能当跨端布局基座"。② **不启用 M3 Dynamic Colors**（宪法 9.12：⛔ 禁止把"运行期才确定的颜色"作为令牌层取值）：动态取色让表面/强调色由用户壁纸决定 → `contrastRatio` **无法在构建期算定**。三条不冲突的用法：给 `Host` 传 **`seedColor` = 本项目品牌主色**；用 `colorScheme` **显式 lock** 到 `light`/`dark`；把 `@expo/ui` 原生控件当"**平台控件**"。
| 我们的组件 | Android | iOS | 跨端（`universal`） | **图标层** | 实现结论 |
|---|---|---|---|---|---|
| `NV TabBar` | `NavigationBar`（M3 bottom navigation） | `TabView` | — | **第 2 层**（平台资产） | **容器**（SDK 57 原生 Tab 三选一，设计计划 §7.3）；⛔ 不得塞 Lucide |
| `NV AppHeader` | 导航容器 header | 导航容器 header | — | **第 2 层**（返回/设置项由容器绘制） | **容器**（宪法 4.3） |
| **信箱顶栏动作** | 自绘动作（`C02 IconButton`） | 自绘动作 | — | **第 1 层 → Lucide `mail`** | **自研**（**它不是系统分配的 nav bar item**，宪法 16.1 明确列入第 1 层） |
| `O06` / `O07` | `ModalBottomSheet` / `Picker`·`Menu` | 原生 sheet / `Picker`·`Menu` | `BottomSheet`、`Picker`（drop-in） | 第 2 层 | **原语**（可替换 `@gorhom/bottom-sheet`，降低第三方原生依赖） |
| `O03 AlertDialog` | `AlertDialog` | 系统 alert | — | 第 2 层（**我们不可提供图标**） | **分端原生**（宪法 5.2） |
| `O01 Toast` | `Snackbar` | 自研轻提示（iOS 无官方 Snackbar） | — | 第 1 层（自绘部分） | **同一 API，分端形态** |
| `C15` / `C16` / `C17` | drop-in `DateTimePicker` | `DatePicker` | drop-in `DateTimePicker` | 第 2 层 | **原语**（`C17` 的年份/月份限制由我们的配置层给） |
| `C14 SegmentedControl` | `SegmentedButton` | drop-in `SegmentedControl` | drop-in `SegmentedControl` | 第 2 层 | **原语** |
| `C10` / `C12` | 原生 | 原生 | `Checkbox` / `Switch` | 第 2 层 | **原语** |
| `C06 SearchField` | `SearchBar` / `DockedSearchBar` | 搜索栏 | — | 第 2 层（容器自带放大镜） | **原语** |
| `K06 ListItem` | `ListItem` | `List` + `Section` | `ListItem` | 前导/尾部图标 = **第 1 层 Lucide** | **原语 + 自研内容层** |
| `K01`–`K03`（Form 系列） | — | `Form` + `Section` | `FieldGroup` | 第 1 层 | **原语骨架 + 自研字段** |
| `T06 PullToRefresh` / `A11 Progress` | `PullToRefreshBox` / Progress indicators | `List` 的 refreshable / `ProgressView`·`Gauge` | — | 第 2 层 | **原语** |
| `A08 Badge` | `Badge` / `BadgedBox` | 自绘（白名单样式） | — | 第 1 层（数值自绘） | **混合**（角标语义自研，形态分端） |
| **`A06 Icon`（第 1 层）** | **自绘 SVG**（`react-native-svg` 15.15.4） | **自绘 SVG** | **自绘 SVG** | **第 1 层：`lucide-react-native` 逐图标子路径** | **自研原子**（§2.1.1） |
| **第 2 层图标位**（Tab / 导航栏 / 菜单 / ActionSheet / 日期选择器 / 分享面板 / 系统对话框） | **Material Symbols**（`expo-symbols` 的 `name={{android}}`，或 `@expo/ui` 的 `Icon`） | **SF Symbols**（`expo-symbols`；`@expo/ui` 的 `Icon`） | **`expo-symbols` 的 `name={{web}}`**（⚠️ `@expo/ui` 的 `Icon` **在 Web 什么都不渲染**） | **第 2 层：平台原生** | **原语 + 包装层补 a11y**（§7.2） |
| 列表虚拟化 | — | — | `FlashList` 或 `LegendList` | — | **买**（**零原生代码 → 可 OTA**） |
| `P6 Pager`（`C-01` 万能墙子视图） | — | — | `FlatList` + `pagingEnabled` + `snapToInterval` | 第 1 层 | **自研**（纯 JS，**零原生 → 可 OTA**） |
| **`P18` 内嵌网页容器（`T-05`）** | `react-native-webview`（Android WebView + `CookieManager`） | `react-native-webview`（`WKWebView` + `WKWebsiteDataStore`） | ⚠️ Web 上不支持 / 本轮不做 Web | 导航栏 = **第 2 层**；动作条按钮 = **第 1 层 `C01`** | **买**，⚠️ **不在宪法 9.9 第①层清单内 → 必须走 3.4 依赖准入五项**（§3.5.5） |
| `D18 MarkdownReader` / `D11 RatingScale` / `D16 CalendarHeatmap` / `D27 SchoolSystemCard` / `T01`–`T05` / `O02` / `A10` | — | — | 自研 | 第 1 层 | **自研**（无官方实现，或必须遵守本项目四态/文案规范；Markdown 渲染库需走依赖准入） |
### 6.1 一级导航的 Tab 图标（**第 2 层 · 已核实的平台名**）
| Tab | iOS（SF Symbols） | Android / Web（Material Symbols） |
|---|---|---|
| **广场** | `square.grid.2x2`【提案】 | **`grid_view`** ✅ 已核实 |
| **工具** | `wrench.and.screwdriver`【提案】 | **`construction`** ✅ 已核实（备选 `build`、`home_repair_service`） |
| **校园里** | `building.columns`【提案】 | **`school`** ✅ 已核实 |
| **我的** | `person.crop.circle`【提案】 | **`account_circle`** ✅ 已核实（备选 `person`） |
> **四个 Material Symbols 名**均在 `@expo/material-symbols@0.1.1` 的 3849 个 XML 资产中**精确命中**（一手实测）。⚠️ **四个 SF Symbol 名属【提案】**：SF Symbols 名单**不在任何 npm 包里**，无法离线核实 → **必须用 Apple SF Symbols app 逐个核对**。**已排除的反例**：`tools` ❌、`person_filled` ❌ 均不存在。
> ⚠️ **真实风险**：`expo-symbols` 只提供 **`Symbol.unstable_getMaterialSymbolSourceAsync()`** 这一条"取 ImageSource"的路径给 tab bar 用，且名字带 `unstable_`；**该链路是否已通属【待核实】**（宪法 §15.1-11 首周定案项）。
### 6.2 绝对不许自研（**买**）
`react-native-screens`、原生 Tab 实现、`expo-router`、`react-native-gesture-handler`、`react-native-reanimated` + `worklets`、`expo-image`、`expo-haptics`、`expo-symbols`、`react-native-safe-area-context`、`react-native-svg`、列表虚拟化（`FlashList` / `LegendList`）、**`react-native-webview`（走准入，见 §3.5.5）**。
**两条依赖纪律**：① **一律 `npx expo install`**——活证据：`react-native-gesture-handler` 的 npm `latest` = 3.3.0，而 SDK 57 模板锁 `~2.32.0`，且其 peerDependencies **无上界保护**（手装 3.x 到 SDK 57 **不会在安装期报错**）；② **按包登记"许可证 / 是否含原生代码 / OTA 影响 / 最后一次发布时间的实测值"**（宪法 3.4 / **9.13** / 11.4）。⚠️ 取值纪律：**必须读版本自身时间戳，不得用 npm 的 `time.modified`**；许可证也不可只信 npm 元数据（实测 `tamagui` 的 npm `license` 字段为空，仓库才是 MIT）。**Lucide 是 ISC + MIT 双许可**（约 140 个 Feather 派生图标为 MIT），`npm view` 只报 ISC 是**不完整的**。

---

## 7. 无障碍与 reduced-motion 契约（**每组件必填项**）
### 7.1 硬数字（`【已定】`，宪法 7.1）
| 项 | 值 | 说明 |
|---|---|---|
| 触控目标 | **iOS ≥44×44pt / Android ≥48×48dp** | **取各自平台的值，不取交集**；视觉可更小，**命中区必须补足** |
| 字号 | **默认 17pt / 最小 11pt** | `allowFontScaling` 保持开启；关键布局设 `maxFontSizeMultiplier` 上限，**不得关掉缩放** |
| 对比度 | **≥4.5:1**（正文 ≤17pt）/ **≥3:1**（≥18pt 或加粗） | 每个 `textSafe` 令牌**必须携带实测算出的对比度** |
### 7.2 §16 专项 a11y 规则（**v2.0 新增，两层图标各自适用**）
| # | 规则 | 依据 |
|---|---|---|
| 1 | **第 1 层 `A06 Icon` 的 a11y 二选一由 `label?: string` 强制**：传 → `accessible` + `accessibilityRole` + `accessibilityLabel`；不传 → **隐藏出无障碍树**（`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`）。⛔ **不得用 `aria-hidden` 隐藏第 1 层图标**——Lucide `hasA11yProp` 把 `aria-*` 一律判为"有语义"，**反而会把它暴露给读屏** | 图标方案调研 §5.4.2（含一手实测） |
| 2 | **第 2 层图标必须由包装层补标签**：`@expo/ui` 的 `Icon` 的 `accessibilityLabel` **仅 Android 生效**（iOS 未接线）；`expo-symbols` 的 `SymbolView` **没有该 prop** → 标签放在**可聚焦父级**（Tab 触发器 / 原生 item） | 图标方案调研 §4.3 |
| 3 | **纯图标按钮必须有可读标签或可见文字标签**；⛔ **不允许"只有一个图标且无标签"的可交互元素** | 宪法 7.2／16.2.4 |
| 4 | **触控目标与图标尺寸解耦**：图标视觉尺寸取 §2.1.1 的 5 档；可点击区域由外层容器撑到平台值，⛔ **不得靠放大图标来满足触控**；**字阶随系统放大时图标不跟随放大**（避免布局崩坏），但**必须不遮挡、不裁切** → 须在**最大字号**下真机核对 | 图标方案调研 §5.4.4／§5.4.5 |
| 5 | **同一含义全局只有一个图标**；`屏蔽用户` = `user-x`（本轮唯一使用），`shield-ban`（内容/类型屏蔽）**若将来要做必须补一个图标，不得复用** | 宪法 16.3／16.8 |
| 6 | **警告必须同时出现图标与文案**，不得仅靠色块 | 宪法 2.1.1 |
### 7.3 每类组件的 a11y 契约
| 组件类 | role | 必须暴露的 state | label 要求 | 命中区 |
|---|---|---|---|---|
| `C01` / `C02` | button | `disabled` `busy` | 文字按钮用自身文案（≤6 汉字）；**纯图标按钮必须给可读 label** | ≥平台值 |
| `A09 Chip`（removable） | button | — | **删除动作要有独立 label**（"移除标签 X"），不能只叫"删除" | 删除叉 ≥平台值 |
| `C07` / `C09` / `C17` | combobox / listbox | `expanded` `selected` | **"当前选中：X"必须可播报** | 整行可点 |
| `C10` / `C21 TagPicker` | checkbox / textbox | `checked` `checkedState` | 组内每项 label 独立；已选 chip 可单独删除并播报 | 整行可点 |
| `C12` / `C15` / `C16` | switch / button（打开选择器） | `checked` | 开关文案即 label；选择器**已选值必须可播报** | ≥平台值 |
| `C18` / `C19` | adjustable / text（group） | `value` `min` `max` | 值变化必须播报；位数与"已输入 n 位"可播报 | 按钮各自达标；Otp 每格可小、整组达标 |
| `C20 MediaPicker` | button + image | `disabled` `busy` | **每张图的删除按钮要有独立 label**；图片有替代文本 | 删除按钮 ≥平台值 |
| `C04` / `C05` / `O08` | textbox | `disabled` `invalid` `required` | **字数上限变化要播报**；错误文本是 label 的一部分（§3.7） | 输入区与发送键均达标 |
| `T01` / `T02` | — | — | 空/错态的**主行动要可聚焦**；错误说明要被读 | — |
| `O03` 对话框 / `O05`·`O06`·`O07` Sheet / `O12`·`O13` | alert / sheet | `expanded` | 对话框：标题 + 正文 + 按钮文案全部可读、**主行动为默认焦点**；Sheet 打开时焦点移入、关闭时**焦点归还触发元素**；全屏通知**不依赖动画表达"重要"** | — |
| `K17 EntityCard` | button/link | — | 整卡可点时**卡片语义必须是一条**，不能把内部 8 个元素都读出来 | ≥平台值 |
| `K13` / `K14` | link / text | — | `K14` **不得播报任何作者信息**（它只表达"匿名"） | 链接 ≥平台值 |
| `D16 CalendarHeatmap` | — | `selected` | 每个日期可聚焦；**"有内容"不能只靠颜色** | ≥平台值 |
| `D18 MarkdownReader` | — | — | 标题层级可导航；链接可聚焦；TOC 跳转后焦点移到标题 | — |
| `D27 SchoolSystemCard` | button | — | **会话状态必须可播报**（未登录/已登录/已过期）；状态**不得只靠色块** | ≥平台值 |
| `A06 Icon`（第 1 层） | image / 无 | — | **`label` 有无决定它是否进无障碍树**（§7.2-1） | 由外层容器撑足 |
### 7.4 reduced-motion 降级（**每条动效都必须声明**）
| 动效 | 表达什么（方向/反馈/寻路） | 降级 |
|---|---|---|
| 页面进退 | 寻路 | 平台默认转场（交原生容器）；Reduce Motion 下系统自动改为淡入 |
| 点赞等即时反馈（短促缩放） | 反馈 | **降级为无位移的颜色/透明度变化** |
| 列表项插入/删除（布局动画） | 方向 | 降级为直接插入/删除（无位移） |
| 加载 → 内容（淡入） | 反馈 | 保持淡入（透明度类不得回弹） |
| 下拉刷新 | 反馈 | 系统手势层（交原生） |
| `C-01` 万能墙翻页吸附 | 方向 | 降级为**整页切换**（去掉吸附回弹），保留位置指示 |
| **默认不动** | — | **高频交互不加动效**（Apple HIG 官方："generally avoid adding motion to UI interactions that occur frequently"） |
**三条强制规则**（宪法 8.3/8.4/8.5）：① 每个动效都要能回答"它在表达**方向 / 反馈 / 寻路**中的哪一种"，**答不上就删**；② **位移类可有回弹，颜色/透明度类不得回弹**；时长随覆盖面积缩放，**不用一个固定毫秒套所有转场**；③ **手势驱动动画必须在 UI 线程执行**（Reanimated + Gesture Handler）；动效库**只在本清单落地后才允许引入**。

---

## 8. 交付顺序、验证与待决
### 8.1 交付批次（**每批的出口门都绑定宪法 9.5**）
| 批 | 内容 | 组件数 | 出口门 |
|---|---|---|---|
| **第 0 批**（脚手架期） | L1 令牌与主题；`A01–A12`（**12**）；`C01 C04 C05 C12`（**4**）；`K01–K08`（**8**）；`T01–T04`（**4**）；`O01–O03` + `O11`（**4**）；导航壳（原生容器） | **32** | **首个纵向切片在真机跑通，且真正消费令牌与组件库**（`design-debt-report.js`：自有 UI 组件引用 ≥1） |
| **第 1 批**（内容模块） | 其余**全部核心组件**：`C` 剩余 14 + `K` 剩余 12（含 `K17` 与 13 个域变体）+ `T05 T06` + `O` 剩余 7（含 `O05`–`O08` `O12` `O13` `O14`）；原型骨架 `P1 P2 P3 P4 P7`（**5 个**） | **35** | 广场 + 校园里 + 详情 + 发布 + 仪表盘 五个原型可用 |
| **第 2 批**（域专用，随模块交付） | `D01`–`D06` `D09`–`D11` `D16` `D18` `D21` `D24` `D25` `D27`（**15**）；原型骨架 `P5` `P6` `P9`–`P16` `P18`（**10 个**） | **15** | 每个模块过宪法第 13 条逐屏验收 |
> **合计核对**：32 + 35 + 15 = **82 个组件**；原型 5 + 10 = **15 个骨架**。**第 0 批刻意压到 32 个**：宪法 9.5 的门是"**第一个纵向切片必须真正消费组件库**"。一次性铺开 82 个，第一个切片只能验证其中几个——**旧 App 的"组件库写了 7 个、引用 0 次"正是这样发生的**。
### 8.2 验证方式（**全部可执行**）
| 门 | 方式 | 门槛 |
|---|---|---|
| 设计债 | `node scripts/design-debt-report.js --path <app>/src --fail-on-zero` | `#hex` = 0、`fontSize` 字面量 = 0、**自有 UI 组件引用 ≥1**、内联双语三元 = 0、`t('key')` ≥1 |
| 对比度 / 品牌主色准入 | `node scripts/contrast-check.js --fail`；`node scripts/brand-ramp.js --hue <选定值> --fail` | 每个 `textSafe` 令牌达标；6 条对比度门 + 3 条色相间距门。⚠️ **不得把 `--compare --fail` 当门**（脚本直接拒绝该组合，退出码 2） |
| **组件被消费（含 `引用` 门）** | 逐组件统计引用点 | **每个交付批次的组件引用率 100%**；**`A*/C*/K*/O*/T*` 的 `引用` 不得为 1**（§1.2） |
| **9.14 套壳门** | review + 三项配套检查（唯一 `return` 是否为另一组件调用／同语义视觉嵌套是否 ≤2 层／引用处是否 ≥2） | 任一不通过即阻断（§0.6） |
| **§16 图标门** | lint：禁 barrel 导入、禁调用点 `strokeWidth`、禁裸数字尺寸、禁 `aria-hidden`、禁 Tab 栏内 Lucide | 命中即阻断（§5.2-15/16/17） |
| **10.5 文案门** | lint / review：`加载中…`／`请稍候`／`暂无数据`／`注意：` 字面量扫描 + 按钮 ≤6 汉字 | 命中即阻断（§3.6） |
| **10.4 错误文案门** | review：每条错误必须能填满三要素表（含三种网络子情形） | 笼统措辞清单命中即视为未完成（§3.7） |
| **双向核对** | [页面清单 v2.0](../product/App页面清单与结构盘点.md) 的"关键组件"列 ↔ 本文件注册表 | 两边**逐名**能对上；页面上要的组件必须在本文件登记，本文件的组件必须有页面消费 |
| Neo-Brutalism 越界 | lint / review | 只允许出现在 `C01(primary)` / `A08` / `K07`，第 4 类即阻断 |
| 逐屏 | 宪法第 13 条 | 74 条判据 + 18 条"像网页"反向症状；**13.1 已加入 9.14 / 10.5 / 16 三项** |
### 8.3 待决事项
| # | 事项 | 建议 | 阻塞 |
|---|---|---|---|
| 1 | **`P18 内嵌网页容器` 是否批准为第 18 个原型** | **批准**（`T-05` 不命中任何现有原型，宪法 9.1 要求先评审原型） | **阻塞 `T-05` 的实现**（不阻塞 `T-03`/`T-04`） |
| 2 | **校方系统清单与各系统登录/会话机制**（AC / Moodle / 签到的 URL 与登录方式） | 所有者提供 + 首周真机 spike（宪法 §15.1-12） | **阻塞工具 Tab 设计** |
| 3 | **`react-native-webview` 的依赖准入五项** + OTA 台账登记（§3.5.5） | 引入前补齐，缺一不可 | 阻塞 `P18` |
| 4 | ~~`D25 CountdownButton` 的 `引用 = 1`~~ | ✅ **已核实为 2**：`A-03` 注册（`POST /api/auth/send-verification-code`）与 `A-04` 找回密码（`POST /api/auth/send-reset-code`）**各需一次 60s 倒计时重发** → 满足 §8.2 的引用门 | 已关闭 |
| 5 | **`D05` / `D06` 的 `引用 = 1`** | **`D06` 已获准**（宪法 9.3）；`D05` 同属 P5 的唯一实现，**按原型骨架口径豁免**——须在宪法 9.3 的解释里显式写入 | 不阻塞 |
| 6 | **Markdown 渲染库选型**（`D18`） | 走依赖准入 + 逐条验排版项 | 阻塞 `S-27` `S-31` `M-19`–`M-23` |
| 7 | **`O01 Toast` 是否双端统一形态** | **分端**（Android `Snackbar` / iOS 自绘轻提示）——宪法 5.2 要求弹层形态各按各端 | 不阻塞 |
| 8 | **宪法 4.1.2-2 的措辞读法**（凭据由平台 cookie 存储持有 = 不经手，是否满足"必须进系统级凭据存储"） | 采纳 §3.5.4 的读法（**更严格**） | 影响 `T-05` 的合规表述 |
| 9 | ~~页面清单里两个组件名未在本文件登记~~ | ✅ **2026-10-02 已关闭**：页面清单侧改为 `MailboxAction` → `C02` + `A06 Icon(mail)` + `A08 Badge`；`OrgBadge` → `A08 Badge(status)`；`UnreadBadge` → `A08 Badge(count)`。**同时新增[页面清单 §3.0](../product/App页面清单与结构盘点.md)「非自研部件清单」**，把 15 个"导航壳提供 / 平台提供 / 页面级概念"的名字固定下来 —— 双向核对门改为：*反引号内必须是注册表名；平台与概念项一律进 §3.0*。**同类清理共修 18 处**（另含 `ChipInput→C21`、`DueBadge→A02`、`InputBar→O08`、`OrganizationPicker→C07`、`Pager→P6`、`ReadReceipt→D05`、`Spinner→T03`、`TemplatePicker→C14`、`TermPicker→C17`、`TimetableGrid→P11`、`TocDrawer→D18`、`FoodCard/ReviewCard/ClubCard/ErrandCard→K17 域变体`） | 已关闭 |
| 10 | **三处图标备选二选一**：跑腿 `bike`/`package`、新生指南 `compass`/`book-open`、放假日 `calendar-heart`/`party-popper` | 按产品实际形态二选一 | 不阻塞 |
| 11 | **`shield-ban` 是否也需要**（内容/类型屏蔽） | 本轮只做"屏蔽用户"→ 用 `user-x`；**若两者都要必须补一个图标**（宪法 16.8） | 不阻塞 |
| 12 | **`A02 Text` 的字阶点数 / 图标 5 档与 `strokeWidth`** | 风格体系 §3.2 与图标方案 §5.1 均为 `【提案】`，**必须真机复核后定稿** | 阻塞令牌定稿（不阻塞脚手架） |
| 13 | **是否建 dev-only 组件画廊屏**（逐组件验四态与暗/亮双主题） | **建**，但 release 构建不可达 | 不阻塞 |
| 14 | **是否引入样式引擎** | **不引入**；本项目的问题是"没有唯一令牌来源"，不是"样式写得麻烦" | 不阻塞 |
| 15 | **Android 系统级 full-screen intent 的允许场景清单** | **须在浏览器人工读取 AOSP《全屏 intent 限制》并记录访问日期**（宪法 15.2） | 不阻塞（但影响"最重通知"的边界） |
### 8.4 本文件的边界
1. **本文件不定义配色与字阶数值**（在[令牌规范](./App设计令牌规范.md)与[风格体系](./App前端风格体系.md)）；
2. **本文件不定义页面与 IA**（在[页面清单 v2.0](../product/App页面清单与结构盘点.md)）——**页号空间以它为准**；
3. **本文件不承诺排期**；
4. **全量 82 个组件的七项声明**在实现时按 §1.1 模板逐个补齐——**本文件对契约复杂的类型给出完整定义，其余给出注册表级定义**；
5. **`【提案】` / `【待核实】` 一律不等于已验证规格**；**新增组件必须先补上 `引用`（≥2，或落入 §1.2 的豁免）与所属原型**。
