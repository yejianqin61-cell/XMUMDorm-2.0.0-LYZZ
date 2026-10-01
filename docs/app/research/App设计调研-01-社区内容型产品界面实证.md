# App 设计调研 01 —— 社区 / 内容型产品界面实证

> 调研对象：成熟社区与内容型 App 在**信息流、导航、发布入口、评论区、暗色模式、动效、空态/加载/错误/无网**七条主线上公开可查的做法。
> 目的：为 XMUMDorm（React Native 新 App）的「设计哲学与前端风格」提案提供**可指回的实证依据**，不是提案本身。
> 调研日期：2026-09-29
> 上下文（本项目反面输入）：旧 RN 端实测为「功能已齐、展示层从未建立」——69/69 屏不使用自有 UI 组件、1144 处硬编码色值、645 处 `fontSize` 字面量、装了 Reanimated 与 gesture-handler 但全项目 0 处引用、Android 上玻璃拟态从未生效。旧路线口号是「移动端 1:1 复刻 Web 端 UI」。

---

## 0. 阅读约定（先读这一节，否则会误用下文）

### 0.1 三类证据标记

| 标记 | 含义 | 采信规则 |
| --- | --- | --- |
| `【官方公开资料】` | 平台官方 HIG / 官方设计系统文档 / 官方开发者文档 / 官方帮助中心 / 官方博客 | 可直接作为约束或参考依据 |
| `【实测/观察】` | 本次调研中实际抓取到的页面原文、页面结构、可复现的公开行为 | 可作为事实，但不代表官方承诺 |
| `【本文推断】` | 我从官方数据推导出的结论，官方**没有**这样写过 | **不得**当作官方规格引用，必须复核 |

### 0.2 关于「官方 token 数值」的红线

本文**只引用官方文档自己印出来的数值**（例如 Material 官方写 `#121212`、Apple 官方写 44×44pt、W3C 官方写 4.5:1）。
凡是我没有在官方页面上读到的数值，一律标注 `【本文推断】` 或直接不写。**本文不产出任何"Dorm 应使用的色值/字号/间距表"** —— 那是提案阶段的事，且必须在提案里二次取证。

### 0.3 取证方法与已知偏差（重要）

- 主力取证通道是 **Jina Reader 代理**（`r.jina.ai`）。对 `developer.apple.com`、`developer.android.com`、`m3.material.io`、`support.discord.com`、`support.google.com`、`carbondesignsystem.com`、`spectrum.adobe.com`、`atlassian.design`、`design-system.service.gov.uk`、`web.dev`、`w3.org`、`bbc.co.uk` **均返回了可读正文**，因此这些引用可靠。
- **Apple HIG 的「Lists and tables」「Dark Mode」「Motion」「Tab bars」四页正文，我先通过一个第三方 HIG 结构化镜像（`raintree-technology/hig-doctor`）定位要点，再逐条回原站核对**。核对通过并采用原站文字的有：Dark Mode 的「Avoid offering an app-specific appearance setting」「Soften the color of white backgrounds」「base / elevated 两套背景色」、Motion 的「Add motion purposefully…」「Make motion optional」「generally avoid adding motion to UI interactions that occur frequently」、Tab bars 的「Use a tab bar to support navigation, not to provide actions」「Avoid overflow tabs」。凡本文引号内文字，均为原站页面文本。
- **不可用通道**：小红书 / Reddit / Instagram / Facebook / X 的**登录态站内数据**全部无法访问（OpenCLI 未连接）。本文**没有**任何来自这些平台站内 feed 的抓取数据。凡涉及它们的结论，来源一律是官方帮助中心 / 官方博客 / 官方开发者文档，或明确标注为推断。
- `m3.material.io` 的 `loading-data/*` 页面经代理返回**空正文**（页面为客户端渲染，抓不到），因此本文**不引用**该页。同理 `polaris.shopify.com` 全站、以及 `shopify.engineering` 返回空，未引用。（注：`m2.material.io` 的 `design/color/dark-theme.html` 与 `design/communication/empty-states.html` **两页经代理拿到了完整正文**，本文 §5 与 §7.1 大量引用；`m2.material.io` 并非整站不可用，只是部分页面抓不到。）

### 0.4 本节「对 Dorm 的含义」

调研结论必须能区分「官方写死的约束」与「某产品的产品选择」。Dorm 后续提案如果引用本文，必须复制本文的三类标记，**禁止把 `【本文推断】` 提升为「行业标准」**。

---

## 1. 信息流与卡片：卡片内部结构、图文比例、信息密度、时间线节奏

### 1.1 官方对「卡片是什么」的定义

- `【官方公开资料】` Material Design 3 对卡片的定义只有一句：「**Cards display content and actions about a single subject**」（卡片展示**关于单一主题**的内容与操作）。官方只认三种变体：**elevated**（有投影，与背景分离度大于 filled、小于 outlined）、**filled**（微妙分离，强调度低于 elevated 与 outlined）、**outlined**（有可见边界，可提供最强强调）。官方同时说明卡片**可以包含其他组件**、并且「**Cards have flexible layouts and dimensions based on their contents**」——即 M3 官方**不**规定卡片高度或内部层数。→ [Cards – Material Design 3](https://m3.material.io/components/cards/overview)
- `【官方公开资料】` M3 相对 M2 的变化里明确写了：**「Elevation: Lower elevation and no shadow by default」**（默认更低的海拔、且默认无投影）。这意味着"靠投影+圆角堆出卡片"在 M3 官方口径里已经不是默认做法。→ 同上页「Differences from M2」。
- `【官方公开资料】` BBC GEL 的 Card 规范是目前找到的**唯一给出卡片内部件清单与顺序**的官方规范：「A card is made up of a **preview area** and a **toolbar**」，并规定 **Cards can have up to twelve parts, which must be shown in this order**（最多 12 个部件，**必须按此顺序**展示），第 1 项是 Media。→ [BBC GEL – Cards](https://www.bbc.co.uk/gel/guidelines/cards)
- `【官方公开资料】` BBC GEL 还给出了**卡片宽度**的可操作规则：「**Minimum desktop and mobile: 266 pixels**」（基于 Standard Media Player 最小宽度）、「**Maximum desktop: 50%**」、「**Maximum mobile: 100%**」，以及「when scaling images, remember to **always use a 16:9 ratio**」。→ 同上。
- `【官方公开资料】` BBC GEL Promos 给出了**信息层级排序**的官方口径：元素必须按"对人最重要的顺序"排列，官方示例层级为「标题 → 元数据（帮助理解何时、还涉及什么）→ …」，并规定元数据条（metadata strip）元素之间用 **1px keyline** 分隔、高度绑定文字行高、**必须按固定顺序**展示；属性若是链接，必须与非链接文本**不同颜色**、非链接属性用灰色。→ [BBC GEL – Promos](https://www.bbc.co.uk/gel/features/promos)
- `【官方公开资料】` BBC GEL 的字阶只有 **四个类型层级（four type hierarchies）** 支撑 Card 与 Promo，正文行宽官方建议「**try not to have more than 60 characters per line**」。→ [BBC GEL – Typography](https://www.bbc.co.uk/gel/features/typography)
- `【官方公开资料】` Apple 对列表型内容的官方要求偏保守而非偏密集：「**Keep item text succinct so row content is comfortable to read**」、「**Consider ways to preserve readability of text that might otherwise get clipped or truncated**」、「**Choose a row style that fits the information you need to display**」。官方给的是**行样式要匹配信息**，没有给"单屏应显示多少行"。→ [Lists and tables | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)

### 1.2 密度是一个**官方承认的产品维度**，不是一个固定值

- `【官方公开资料】` Discord 官方帮助中心把**密度做成了用户设置**，且拆成两个互不影响的维度：
  - **UI Density**：「Choose between **Compact, Default, or Spacious** to adjust the spacing around content (and navigation spacing in the desktop app). **UI density doesn't affect message density.**」
  - **Message Display**：「scroll to **Message Spacing > Chat Message Display**. You can choose between either **Default or Compact** to adjust the spacing specifically between message elements.」
  - 早期官方帮助页对 Compact 的描述更直白：「The biggest difference you'll see is that **user avatars no longer show up**… No more avatars and many more messages!」
  → [How to Change Discord Color Themes and Customize Appearance Settings](https://support.discord.com/hc/en-us/articles/207260127-How-to-Change-Discord-Color-Themes-and-Customize-Appearance-Settings)、[How do I switch to compact text mode?](https://support.discord.com/hc/en-us/articles/217047657-How-do-I-switch-to-compact-text-mode)
  **可迁移点**：压低密度的手段官方选择的是**去掉头像**，而不是缩小字号。
- `【官方公开资料】` Reddit 官方帮助中心确认信息流有**多种排序**且排序是一等公民：帖子排序 **Relevance / Hot / Top / New / Comment Count**（Top 还额外支持时间过滤：all time / past year / month / week / 24 hours / hour），评论排序为 **Relevance / Top / New**。→ [What filters and sorts are available? – Reddit Help](https://support.reddithelp.com/hc/en-us/articles/19695706914196-What-filters-and-sorts-are-available)
- `【实测/观察】` Reddit **客户端**的评论排序实际包含 **Best / Top / New / Controversial / Old** 五项，且「Opening a post or clicking back to 'main discussion' seems to reset the sort to 'best'」——这两条来自 r/help 的**用户社区帖**，不是官方文档；官方帮助中心只列了三项。**注意这是官方文档与产品实际行为不一致的实例**。→ [Options for 'Sorting Comments' : r/help](https://www.reddit.com/r/help/comments/1cg64sv/options_for_sorting_comments/)（二手）
- `【实测/观察】` Reddit **信息流视图**存在 Card / Classic / Compact 三档（官方 2017 年改版博客正文即以 `r/aww (card view)` / `(classic view)` / `r/analog (compact view)` 三图并列展示）。→ [An Update on Reddit's Redesign](https://www.redditinc.com/blog/an-update-on-reddits-redesign)（官方博客，文字为实测摘录）
- `【官方公开资料】` Instagram 官方在其排序说明中把**形态（format）**列为排序信号之一：「We've also started considering other factors like **format**, so if we notice you prefer photos, we'll show you more photos.」官方同时给出了信号类别（发布时机、设备类型、对视频的点赞频率等）。→ [Instagram Ranking Explained](https://about.instagram.com/blog/announcements/instagram-ranking-explained)
- `【官方公开资料】` Instagram 工程博客把"推荐内容接入信息流"的设计原则写成四个字：「**Feels Like Home**」——「scrolling through the End of Feed Recommendations should feel like **scrolling down an extension of Instagram Home Feed**」。→ [Designing a Constrained Exploration System](https://about.instagram.com/blog/engineering/designing-a-constrained-exploration-system)

### 1.3 各平台的取舍（按可取证程度分档）

**A 档：有官方卡片/信息流规范**

| 平台 | 官方可查到的取舍 | 来源 |
| --- | --- | --- |
| BBC（GEL） | 卡片 = 预览区 + 工具条；**最多 12 部件且顺序固定**；移动端卡片最大宽度 100%、最小 266px；图片恒 16:9；元数据条 1px keyline 分隔 | [Cards](https://www.bbc.co.uk/gel/guidelines/cards)、[Promos](https://www.bbc.co.uk/gel/features/promos) |
| Discord | 密度与消息行距是**两个独立用户设置**；Compact 靠**去头像**省空间 | [Appearance 设置](https://support.discord.com/hc/en-us/articles/207260127-How-to-Change-Discord-Color-Themes-and-Customize-Appearance-Settings) |
| Reddit | 排序为一等公民（帖子 5 种、评论 3 种官方口径）；客户端存在 Card/Classic/Compact 三档视图 | [Filters and sorts](https://support.reddithelp.com/hc/en-us/articles/19695706914196-What-filters-and-sorts-are-available)、[2017 改版博客](https://www.redditinc.com/blog/an-update-on-reddits-redesign) |
| Instagram | 排序把"形态偏好"当信号；推荐内容必须"像主页的延伸" | [Ranking Explained](https://about.instagram.com/blog/announcements/instagram-ranking-explained)、[Constrained Exploration](https://about.instagram.com/blog/engineering/designing-a-constrained-exploration-system) |
| Material（3） | 卡片只承载**单一主题**；默认**无投影**、低海拔 | [M3 Cards](https://m3.material.io/components/cards/overview) |

**B 档：只有官方公开的"未获授权"声明** —— 未能取得任何官方公开的卡片/信息流结构规范。

- `【官方公开资料】` 小红书产品设计中心（RPDC）官网确实存在且可访问，但它是一份**团队介绍与设计周活动页**，**没有**对外发布设计系统、组件规范或信息流结构文档。→ [RPDC 主页](https://rpdc.xiaohongshu.com/)

**C 档：完全未能取得官方公开资料**（**本节不作任何关于这些平台界面取舍的断言**）

- X / Twitter：`blog.x.com/en_us/topics/product` 经代理返回**空正文**；官方公开可查的只有推荐算法相关材料（开源算法仓库与其说明文档），**没有**关于时间线密度、卡片层数的官方设计文档。→ [X's Recommendation Algorithm（官方开源）](https://cdn.jsdelivr.net/gh/twitter/the-algorithm@main/README.md)。**X 的"宽松/紧凑"显示模式未取得官方来源，故不写入结论。**
- B 站：`open.bilibili.com/doc` 返回的是**开放平台 API 文档目录**（账号授权 / 视频管理 / 专栏管理 / 直播能力 / 客户端 SDK），`bilibili.com/blackboard/help.html` 是**播放故障排查帮助页**。两者都**不含**UI 规范。→ [哔哩哔哩开放平台](https://open.bilibili.com/doc)、[bilibili 帮助中心](https://www.bilibili.com/blackboard/help.html)
- 微博：官方帮助中心可查到的是**发布与草稿**相关流程（见 3.3），**没有**信息流卡片规范。→ [新浪帮助 - 如何发布长微博](https://help.sina.com.cn/comquestiondetail/view/1461/)

> ⚠️ 网上流传的「B 站设计规范 / 小红书色值表」类文档，本次排查到的均为**第三方从线上页面反推的采集结果**（例如某 `oh-my-design-cli` 的 `DESIGN.md` 自述为 "product snapshots… not reconstructions of … the mobile app"）。这类内容证据等级为 `【二手】`，**不得**作为官方规格引用，本文因此不采纳其色值。

### 1.4 `【本文推断】` 关于"单屏信息密度"的一般化

- 官方文档普遍**不给**"单屏几条"的具体数字；它们给的是**可调维度**（Discord 的两级密度）、**顺序约束**（BBC 的 12 部件固定顺序）、**可读性下限**（Apple 的"不要被裁剪/截断"、BBC 的 60 字符行宽）。
- 因此 `【本文推断】`：把"密度"当作**一个可以在产品级选定、并且应当可被测试的变量**，比当作"照抄某个竞品的手感"更接近官方证据支持的做法。

### 1.5 对 Dorm 的含义

Dorm 的信息流卡片如果只有"圆角 + 投影 + 蓝白配色"这一层，是没有信息层级的；官方可迁移的硬约束其实在别处——**卡片只讲一件事**（M3）、**卡片内部件顺序不允许随手调**（BBC）、**元数据要能被一眼降权**（BBC 的 keyline + 灰色非链接属性）。

---

## 2. 导航模型：底部 Tab 数量、FAB / 顶部 Tab / 分段控件 / 抽屉的分工、深链与返回栈

### 2.1 底部导航的数量与分工（双端官方都给数）

- `【官方公开资料】` Material 3 导航栏（Navigation bar）官方：「Navigation bars provide access to **three to five destinations**」；「**Avoid putting more than five navigation items in a navigation bar**」；「Navigation bars **shouldn't be used for accessing single tasks**, such as viewing one email.」；用于「**Three to five main pages in the product**」与「**top-level destinations**」。→ [Navigation bar – M3 Guidelines](https://m3.material.io/components/navigation-bar/guidelines)
- `【官方公开资料】` M3 导航栏还有两条**极易被违反**的正文明文：
  - 「**Destinations don't change. They should be consistent across app screens.**」
  - 「**Re-selecting the currently active destination should reset the scroll position to the top of the page.**」
  - 「**All navigation items require a label text. It should be 1-2 words.**」
  - 「Navigation bars can be **temporarily** covered by dialogs, bottom sheets, navigation drawers, the on-screen keyboard… They should **not be permanently obstructed on any screen**.」
  → 同上页
- `【官方公开资料】` M3 导航栏 **不允许**横滑切页：「**Swiping across the screen does not navigate between destinations, and is not supported by the navigation bar.** Swipe behavior should be reserved for related items, such as cards in a carousel, or actions such as archiving a list item.」→ 同上页
- `【官方公开资料】` M3 已进入 **M3 Expressive** 阶段，导航栏的官方口径出现了变化：「**Baseline navigation bar is no longer recommended**」。→ [Navigation bar – M3 Overview](https://m3.material.io/components/navigation-bar/overview)。**这是"官方规范会变"的直接证据，引用时必须带版本**。
- `【官方公开资料】` Android 官方移动端布局指南：「The navigation bar can hold **three to five navigation destinations across the same hierarchy level**. This component translates to the **navigation rail** for large screens.」；并明确导航抽屉的劣势：「Although the navigation drawer can hold more than five navigation destinations, **the pattern isn't as ideal as the navigation bar**. This is because users must **reach for the top bar** on compact sizes.」→ [Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- `【官方公开资料】` Apple HIG Tab bars 的官方口径是"**数量取决于你的层级复杂度，不是固定值**"，但给了两条硬规则：
  - 「**Use a tab bar to support navigation, not to provide actions.** If you need to provide controls that act on elements in the current view, use a **toolbar** instead.」
  - 「**Avoid overflow tabs.** … If horizontal space limits the number of visible tabs, the trailing tab becomes a **More tab** … The More tab makes it **harder for people to reach and notice content** on tabs that are hidden, so limit scenarios in your app where this can happen.」
  - 「**Don't disable or hide tab bar buttons, even when their content is unavailable.** … If a section is empty, **explain why its content is unavailable**.」
  - 「**Include tab labels**… Use **single words** whenever possible.」
  → [Tab bars | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- `【官方公开资料】` Apple HIG 对新平台的适配取向：**「Avoid using the same bottom navigation bar across sizes」**（Android）、**「Consider using a tab bar first. A tab bar provides more space to feature content」**（Apple 对 iPadOS/macOS 的 sidebar 建议）。Apple 同时提供 `sidebarAdaptable` 风格，让**同一套 Tab 在大屏可切换成侧边栏**，且「Both variations include a button that people can use to switch between them」。→ [Sidebars | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/sidebars)

### 2.2 FAB 的官方定位（含"什么时候不要 FAB"）

- `【官方公开资料】` M3 FAB 官方：「Use a FAB for **the most important action on a screen**; it appears in front of all other content.」尺寸三档（FAB / Medium FAB / Large FAB），并明确「**Medium FAB (most recommended)**」「**The small FAB is no longer recommended**」。→ [FAB – M3 Guidelines](https://m3.material.io/components/floating-action-button/guidelines)
- `【官方公开资料】` M3 明确给出了 **Don't** 场景，这是本节最有价值的一条：
  - 「**Don't display multiple FABs on a single screen**」（配图："A screen with 3 FABs makes it hard to tell what the primary action should be"）。
  - 「**FABs are not needed on every screen**, such as when **images represent primary actions**」（配图举例：一个照片信息流**没有** FAB）。
  → 同上页
- `【官方公开资料】` Android 官方布局指南补充了 FAB 与其他动作入口的分工：「Provide controls to enable users to accomplish actions. Common patterns include **top bar actions, floating action button (FAB), and menus**.」以及「For actions of the highest importance, a FAB provides a large and prominent button… **Provide only one action at a time at this level.**」→ [Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- `【官方公开资料】` M3 规定 FAB 与导航栏的空间关系：「The FAB should be **right-aligned above the navigation bar**」；导航栏可被 FAB 覆盖时可临时让位。→ [Navigation bar – M3 Guidelines](https://m3.material.io/components/navigation-bar/guidelines)
- `【本文推断】` **Apple HIG 没有 FAB 组件**。我是通过在 Apple HIG 的组件目录（App bars、Buttons、Toolbars、Tab bars、Sidebars 等）与 Android/Material 的 FAB 规范之间做对照得出的；本次未能通过搜索直接命中一句官方"Apple 不提供 FAB"的表述，**因此这条按推断处理，需人工复核**。

### 2.3 顶部 Tab / 分段控件 / 抽屉的适用边界

- `【官方公开资料】` M3 Tabs 分**primary tabs**（应用主内容目的地，位于顶栏下方）与 **secondary tabs**（在内容区内进一步切分相关内容、建立层级，**永远在主 tabs 下方**）。官方两条硬限制：「**Avoid using more than four tabs at once. At five or more tabs, the container becomes cramped.**」；「**Avoid placing swipeable items in the content area of a UI that has tabs**, as the user may mistakenly swipe the wrong component.」→ [Tabs – M3 Guidelines](https://m3.material.io/components/tabs/guidelines)
- `【官方公开资料】` M3 Segmented buttons：「Use for **simple choices between two to five items**（for more items or complex choices, use chips）」。→ [Segmented buttons – M3 Overview](https://m3.material.io/components/segmented-buttons/overview)
- `【官方公开资料】` M3 Navigation drawer 的适用条件是「**Apps with 5 or more top-level destinations**」，且强调两个 **Avoid**：「**Avoid using a navigation drawer with other primary navigation components, such as a navigation bar.**」「**Avoid using two navigation components on the same screen.**」→ [Navigation drawer – M3 Guidelines](https://m3.material.io/components/navigation-drawer/guidelines)
- `【官方公开资料】` Android 官方把导航分成**主/次两级**：导航栏与模态抽屉是**主**导航；「**Material 3 Tabs and the bottom app bar are secondary navigation patterns** that you can use to **supplement** primary navigation or appear on **child views**」。→ [Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- `【官方公开资料】` Apple HIG 对侧边栏的官方建议里有一条层级上限：「**In general, show no more than two levels of hierarchy in a sidebar.** When a data hierarchy is deeper than two levels, consider using a **split view** interface that includes a content list between the sidebar items and detail view.」→ [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)

### 2.4 搜索应该放在哪

- `【官方公开资料】` Apple HIG Searching：「**If search is important, give it a primary position in your app or view.** For example, in the Notes app, a search field is in the bottom **toolbar**… In apps that use **tab bars**, like Photos and Apple TV, **search is a dedicated tab**.」；「**Aim to make your app's content searchable through a single location.**」；「**Clearly display the current scope of a search.**」→ [Searching | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/searching)
- `【官方公开资料】` Apple HIG Tab bars 新形态：「A tab bar can include **a dedicated search tab at the trailing end**.」→ [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- `【官方公开资料】` M3 Search：「Use search for navigating a product with queries」；「Use a **search app bar** to provide an emphasized, **global entry-point**」；M3 Expressive 下「Styles: Search can be **contained (recommended)** or divided」。→ [Search – M3 Overview](https://m3.material.io/components/search/overview)

### 2.5 返回栈与深链的官方语义

- `【官方公开资料】` Android 官方的 Back 是**系统级契约**，且已被预测性返回（Predictive Back）改造：「Predictive Back, a gesture navigation feature, **lets users preview where the back swipe takes them**」；「**Starting with Android 15, the developer option for predictive back animations is no longer available.** System animations such as back-to-home, cross-task, and cross-activity now appear for apps that have opted in…」官方给出的迁移路径是**放弃 `onBackPressed` / `KEYCODE_BACK`，改用 `OnBackPressedCallback`（AndroidX Activity 1.6.0+）或 `OnBackInvokedCallback`**。→ [Add support for the predictive back gesture](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)
- `【官方公开资料】` Android 官方的多返回栈（multiple back stacks）与深链（deep links / app links）是**独立成篇的官方主题**，说明"每个 Tab 各自维护返回栈"是被官方承认的正规做法。→ 导航文档目录中的 [Multiple back stacks](https://developer.android.com/guide/navigation/backstack/multi-back-stacks)、[About deep links](https://developer.android.com/training/app-links)
- `【官方公开资料】` Android 官方对**状态保存**的期望描述得非常具体，直接决定返回栈的"记忆"体验：「A user expects a screen's UI state to remain the same throughout a **configuration change**… A user also expects your app's UI state to remain the same if they **temporarily switch to a different app and then come back**… the system **may destroy the application process** while the user is away… When the user relaunches the app, the screen is **unexpectedly in a clean state**.」官方给出的三档手段是 **ViewModel / Saved state / Persistent storage**，并明确「**ViewModels are destroyed during a system-initiated process death**」。→ [Save UI states](https://developer.android.com/topic/libraries/architecture/saving-states)
- `【官方公开资料】` Apple HIG Modality 给出了"什么时候该打断当前上下文"的官方判据：模态用于「**Ensure that people receive critical information**」「Provide options that let people confirm or modify their most recent action」「**Help people perform a distinct, narrowly scoped task without losing track of their previous context**」「Give people an immersive experience」；并明确反例：「**Present content modally only when there's a clear benefit.**」「**Take care to avoid creating a modal experience that feels like an app within your app.**」→ [Modality | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/modality)

### 2.6 对 Dorm 的含义

底线是**`【官方公开资料】` 三条可当硬约束**：底部主 Tab 官方区间为 3–5 且**不允许**超 5 进 overflow；Tab 是**导航**不是动作区（动作归 toolbar / FAB）；**存在 5 个以上顶层目的地时才用抽屉，且抽屉不得与底部导航同屏**。旧端"导航一堆入口 + 无层级"的做法在官方口径里没有任何支撑。

---

## 3. 发布与创作入口：位置、打断成本、草稿与发布流程

### 3.1 位置：官方只约束"动作归谁"，不指定"放哪一格"

- `【官方公开资料】` Apple：动作**不属于** tab bar（见 2.1 引文），应放 **toolbar**；需要"完成一件事"的独立任务用**模态**（见 2.5 引文）。
- `【官方公开资料】` Material / Android：动作入口是 **top bar actions / FAB / menus** 三类，最高重要性的动作给 FAB，且**同一时刻只给一个**（见 2.2 引文）。
- `【本文推断】` 「发布入口放在底部 Tab 中间那一格」是国内内容型 App 非常常见的一种做法，但它**不是**上述任何官方规范里的条目，而且与 Apple「**tab bar 不承载动作**」的官方表述在措辞上是冲突的。**本次调研未能取得任何官方文档为该做法背书**，因此在本项目里它只能作为一个**需要明确承担代价的产品选择**，不能写成"平台规范"。→ 上文 Apple Tab bars / M3 FAB 两处官方原文为对照依据。

### 3.2 打断成本：模态是有代价的，官方要求必须给"退出口"和"防丢"

- `【官方公开资料】` Apple HIG Modality 对模态成本的官方表述：「A modal experience **takes people out of their current context and requires an action to dismiss**」；并要求：
  - 「**Aim to keep modal tasks simple, short, and streamlined.** If a modal task is too complicated, people can **lose track of the task they suspended**…」
  - 「**Always give people an obvious way to dismiss a modal view.**」
  - 「**Make it easy to identify a modal view's task.**」
  - 「**Let people dismiss a modal view before presenting another one.** … you **never want to display more than one alert at the same time**.」
  - 数据丢失保护：「if closing the view could result in the loss of **user-generated content**, be sure to **explain the situation and give people ways to resolve it**」（例：iOS 上给出含保存选项的 action sheet）。
  → [Modality | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/modality)

### 3.3 草稿：官方口径差异极大，且都承认"会丢"

- `【官方公开资料】` 微博官方帮助中心（更新时间 2025-05-19）对草稿的说明是目前找到的**最坦白的官方实现描述**：
  - 入口：「进入微博客户端，在【我】页面，点击草稿箱」；草稿可编辑后再发。
  - 删除交互**双端不同**：安卓「**长按**某一条草稿，即可选择删除该草稿或清空草稿箱」；iPhone「点击草稿箱右上角的"**编辑**"后，点击删除按钮-**完成**」。
  - **明确承认草稿的脆弱性**：「**只有微博客户端中才有草稿箱，草稿箱内容仅保存在本地，在不同设备的客户端登录账号都是不会同步的。另清除缓存、重装客户端的操作可能会清空草稿箱。**」
  → [如何查看/删除客户端草稿箱中的微博](https://kefu.weibo.com/faqdetail?id=14150)
- `【官方公开资料】` 微博官方对**发布失败**的处理给出了一个可迁移的产品模式：**失败后草稿箱里留错误提示**——「发布失败后查看草稿箱存在错误提示」，并把失败原因分类列举（禁言 / 违反社区公约 / 客户端或网络异常 / 不安全链接 / 人身攻击内容 / 账号风险），且**每一类都给出可操作建议**（改内容重试、清缓存换网络、改密码绑手机等）。→ [为何微博无法成功发布](https://kefu.weibo.com/faqdetail?id=13790)
- `【官方公开资料】` Android 官方对"用户输入不能被系统杀掉"的要求是**架构级**的：进程可能在后台被销毁，必须用 **Saved state（`SavedStateHandle` / `rememberSaveable`）/ Persistent storage** 兜底，且官方明确「**Don't use saved state to store large amounts of data**, such as bitmaps… Instead, store only primitive types and simple, small objects」。→ [Save UI states](https://developer.android.com/topic/libraries/architecture/saving-states)
- `【官方公开资料】` Apple HIG 把"用户生成内容丢失"列为需要**确认**的场景（见 3.2）。→ [Modality](https://developer.apple.com/design/human-interface-guidelines/modality)
- `【本文推断】` 「草稿仅本地 + 不同步」是微博的**产品选择**，不是平台要求；Android 官方口径实际上要求**至少做到进程死亡后输入不丢**。两者不矛盾但级别不同：前者是功能设计，后者是工程底线。

### 3.4 对 Dorm 的含义

发布入口的位置可以选，但**打断成本必须付清**：模态任务要短、要给明确退出口、要有防丢确认、要能识别"这是什么任务"。草稿只要存在，就必须回答"进程被杀 / 清缓存 / 换设备"三问——微博的官方说明已经证明"仅本地不同步"是会写进帮助中心让用户自己承担的代价。

---

## 4. 评论区与回复层级：一二级、楼中楼、点赞与排序

### 4.1 排序：官方文档普遍比产品实际更保守

- `【官方公开资料】` Reddit 官方帮助中心只承认评论三种排序：**Relevance / Top / New**，并说明帖子侧排序 Relevance 的因子是「relative rarity of each word… **age of the post**, and **number of votes and comments**（越少见词权重越高 + 时间 + 赞数与评论数）」，Hot 是「posts that have **recently** been getting upvotes, comments」，Top 可按时间过滤。→ [What filters and sorts are available?](https://support.reddithelp.com/hc/en-us/articles/19695706914196-What-filters-and-sorts-are-available)
- `【实测/观察】` **官方文档与客户端实际不一致**：客户端评论区实际提供 **Best / Top / New / Controversial / Old** 五项（社区帖实测），且「opening a post … seems to **reset the sort to 'best'**」；版主可在版块设置里改默认排序。→ [r/help 帖](https://www.reddit.com/r/help/comments/1cg64sv/options_for_sorting_comments/)（**二手**，社区帖，非官方）
  **结论**：引用"Reddit 有五种评论排序"时，必须说明它来自用户观察而非官方文档。

### 4.2 折叠：评论树的可用性靠"能折叠"而不是靠"层级深"

- `【实测/观察】` Reddit 评论区折叠的官方渠道证据缺失，可靠证据来自 r/help 的**用户共识描述**：New Reddit「click on the **vertical columns** to collapse it」；Old Reddit「click on the **[-] button** next to the voting arrows」；App「**long tap on the comment** to collapse it」，或「three dots → **collapse thread**」。并给出了**语义**：「If you click on the first comment, it **collapses itself and all the comments under it**. If you click on the second comment, then the second comment and all the comments under it collapse, but the first comment remains visible.」→ [Is it possible to collapse a thread? : r/help](https://www.reddit.com/r/help/comments/12gnr8a/is_it_possible_to_collapse_a_thread/)（**二手**）
  ⚠️ **本节最重要的一条事实**：这条（"点父评论折叠整棵子树，父评论本身保留"）**没有官方文档来源**，我只能追溯到社区共识。它被广泛当作常识使用，但在本文必须标 `【实测/观察】/二手`。

### 4.3 楼中楼与"回复"的官方形态

- `【官方公开资料】` Discord 官方帮助把"回复"和"话题串（Thread）"**拆成两个不同机制**：在文本频道里可以「creating a **thread**」或「**replying directly to a message**」，取决于服务器给你的权限。→ [Text Channels & Text Chat In Voice Channels](https://support.discord.com/hc/en-us/articles/4412085582359-Text-Channels-Text-Chat-In-Voice-Channels)
- `【官方公开资料】` YouTube 官方帮助确认了"**回复挂在评论下**"的一级挂载形态（「Click **REPLY** beneath a comment」），并给出了三个直接可迁移的互动机制：
  - **置顶**：「Highlight a comment for your fans by **pinning it to the top**」；移动端「viewers must **expand the comment section** to view the pinned comment」。
  - **创作者"心动"**：心形按钮，与赞/踩并列；官方明确它会**发通知**。
  - **评论预览区**：「Comment previews FAQ」——列出哪些评论会进入预览（Recently posted / Pinned or given a "heart" by the video creator…），以及「**To view all comments, tap anywhere in the comment preview section.**」
  → [Post and interact with comments – YouTube Help](https://support.google.com/youtube/answer/6000964)
- `【官方公开资料】` Discord 官方在"一屏塞不下"的规模问题上走的是**摘要**路线而非更深嵌套：「**In-Channel Conversation Summaries**」把消息「consolidates … into **easy-to-navigate topics**」，展示「a conversation preview, **the number of messages about a specific topic**, and **who is part of the discussion**」；官方说明该功能「currently available in **select servers**」且属于实验。→ [In-Channel Conversation Summaries](https://support.discord.com/hc/en-us/articles/12926016807575-In-Channel-Conversation-Summaries)
- `【本文推断】` 「一二级评论 + 楼中楼」这套中国互联网常见结构，**本次调研未取得任何官方设计规范来源**。可信的官方材料只有：Reddit 的排序（官方 3 种）、Discord 的 reply/thread 二分、YouTube 的 reply + pin + heart + 预览。**"楼中楼层数上限"没有任何官方来源，本文不给出任何数字。**

### 4.4 对 Dorm 的含义

评论区的"深度"不是关键，"**深度失控后的收敛手段**"才是关键：官方材料给出的收敛手段有三种——**排序**（Reddit）、**折叠**（Reddit，但只有社区证据）、**摘要/预览**（Discord、YouTube）。Dorm 的树洞与万能墙在匿名场景下尤其需要至少一种，且必须是**可被用户发现**的显式控件，而不是靠长按这种隐藏手势。

---

## 5. 暗色模式：分层表面如何组织，如何避免"纯黑 + 高饱和"

### 5.1 为什么不能用纯黑 —— Material 官方给了完整的因果链

- `【官方公开资料】` Material 2 官方 Dark theme 页原文：「Use **dark grey – rather than black** – to express elevation and space in an environment with a wider range of depth.」「A dark theme uses **dark grey, rather than black**, as the primary surface color for components. Dark grey surfaces can express a wider range of color, elevation, and depth, because **it's easier to see shadows on grey** (instead of black). Dark grey surfaces also **reduce eye strain**, as light text on a dark grey surface has **less contrast** than light text on a black surface.」官方给出的推荐表面色是 **`#121212`**。→ [Dark theme – Material Design 2](https://m2.material.io/design/color/dark-theme.html)

  > ⚠️ 此处 `#121212` **是 Material 官方文档自己印出的数值**，不是本文推断。但它是 **M2 的**推荐值；M3 已改用 surface container 角色体系（见 5.3）。引用时必须带版本，不能写成"暗色模式应该用 #121212"。

- `【官方公开资料】` Material 官方博客（Android Developer Relations 作者署名）把因果讲得更直白：「The first thing you might notice is that the default background for apps in dark theme is **not black, but instead a dark grey: `#121212`**.」并解释系统 UI 可以用纯黑是因为「these system surfaces tend to be quite simple, typically just text and simple icons, so to battle contrast issues we can adjust the text and icon colors to suit」，而**应用**不行：「In apps though, your surfaces can contain anything: complex colorful vector animations, bright imagery, contrasting branded surfaces and lots more. **Placing these against a pure black background means that the resulting contrast is much higher, which can increase eye strain.** Unlike text and icons… it is often difficult or unwanted to tint/re-color these types of content to reduce the contrast, **meaning a lighter background is the solution**.」→ [Building a Material Dark Theme on Android](https://m3.material.io/blog/android-dark-theme-tutorial)

### 5.2 暗色下如何表达"层级" —— 官方共识是**改表面色**而不是加阴影

- `【官方公开资料】` Material 2 官方：「In a dark theme, components **retain the same default elevation levels and shadows** as components in lighter themes. However, in a dark theme, **the surfaces of different elevation levels are illuminated differently**.」「**The higher a surface's elevation**, the **lighter that surface becomes**. That lightness is expressed through the application of a **semi-transparent overlay** using the **On Surface** color.」→ [Material 2 – Dark theme](https://m2.material.io/design/color/dark-theme.html)
- `【官方公开资料】` Material 2 官方给出的 overlay 区间是 **0%（最低海拔）到 16%（最高海拔）**，并给出示例：**1dp 卡片用 5% overlay、8dp bottom app bar 用 12% overlay**；同时规定**该 overlay 不施加在使用 primary / secondary 色的组件表面上**。→ 同上页
- `【官方公开资料】` Material 官方**明确禁止**用发光代替阴影：「**Don't use light glows in place of dark shadows to express elevation**, because they don't accurately represent elevation the way a cast shadow does.」→ 同上页
- `【官方公开资料】` Material 2 官方给出的**对比度底线**（注意它的推导方式很值得学）：「Dark theme surfaces must be dark enough to display white text. They should use a contrast level of **at least 15.8:1** between text and the background. This ensures that body text passes **WCAG's AA standard of at least 4.5:1** when applied to surfaces at the **highest (and lightest) elevation**.」「**Ensure that the background color is dark enough so that body text meets a contrast level of at least 4.5:1 (AA) on the highest elevated surface (24dp).**」→ 同上页
- `【官方公开资料】` **纯黑是被官方承认的例外，不是默认**：「UIs that **require efficient battery usage** can use true black. In these cases, some devices (such as **wearables with OLED screens**) can turn off any pixels that display black to conserve battery power.」→ 同上页
- `【官方公开资料】` Apple HIG 用的是**另一套命名**但同一个原理：「In Dark Mode, the system uses two sets of background colors — called **base** and **elevated** — to enhance the perception of depth when one dark interface is layered above another. The **base colors are dimmer**, making background interfaces **appear to recede**, and the **elevated colors are brighter**, making foreground interfaces **appear to advance**.」→ [Dark Mode | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- `【官方公开资料】` Apple 还给出了**两套三档**背景色语义（这是 iOS 上"分层表面"的官方落点）：系统色有 `systemBackground` / `secondarySystemBackground` / `tertiarySystemBackground`，分组色有 `systemGroupedBackground` / `secondarySystemGroupedBackground` / `tertiarySystemGroupedBackground`，官方使用判据是「use the **grouped** background colors **when you have a grouped table view**; otherwise, use the **system** set」。→ [Color | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/color)
- `【官方公开资料】` Atlassian Design System 的 elevation 体系是最贴近"分层表面"这个说法的公开命名：四个基础层级 **sunken / default / raised / overlay**，外加特例 **overflow**。其暗色逻辑与 Material 一致：「Shadows can be **harder to see in dark mode**, so dark mode elevations also rely on **different surface colors**. Imagine that the surfaces are distantly lit from the front — **the higher the elevation, the lighter the surface looks**.」并强调：「Always pair `elevation.surface.raised` with `elevation.shadow.raised`. This is particularly important in **dark mode**, where **raised surfaces are lighter** to help differentiate elevations.」→ [Elevation – Atlassian Design System](https://atlassian.design/foundations/elevation)
- `【官方公开资料】` Atlassian 还给出一个**极易踩的坑**：`elevation.surface.sunken` 与 `color.background.neutral` 在亮色下看起来像，但行为不同——前者是**不透明**且**亮暗两态都变暗**，后者是**透明**且「**darkens in light mode and lightens in dark mode**」，用途是"让背景随所处层级自适应"。→ 同上页
- `【官方公开资料】` Atlassian 对"过渡动画代替状态"的态度可直接引用：「Transitions between elevations can be used as an alternative to hovered and pressed tokens… This approach should be **used sparingly to avoid excessive animation**. It should **not** be used for very small UI, as elevation changes are harder to see than surface color changes at this size.」→ 同上页
- `【官方公开资料】` Adobe Spectrum 用的是"背景层"（background layers）体系，并给出**亮暗两态的实际映射**：`Layer 2` = light `gray-25` / dark `gray-75`；`Layer 1` = light `gray-50` / dark `gray-50`；另有 `Elevated`（最高注意力，"used **sparingly**"，靠 drop shadow）。Spectrum 还区分 **editing context** 与 **browsing context** 两种页面语境，两者对同一层的用法不同。→ [Background layers – Spectrum](https://spectrum.adobe.com/foundations/color/background-layers)。⚠️ 这些 `gray-NN` 数值是 Spectrum 官方文本给出的，但**不能直接搬到别的产品**。

### 5.3 Material 3 的分层角色体系（比 M2 的 overlay 更结构化）

- `【官方公开资料】` M3 的色角色共 **45 个**，官方声明「These color pairs provide an accessible **minimum 3:1 contrast**」（指角色配对本身保证的下限）。→ [Color roles – M3](https://m3.material.io/styles/color/roles)
- `【官方公开资料】` M3 的明确分工：「**Use surface roles for more neutral backgrounds, and container colors for components like cards, sheets, and dialogs.**」表面角色有三个：**Surface**（背景默认色）、**On surface**（任何 surface 或 surface container 之上的文字与图标）、**On surface variant**（低强调版本）。→ 同上页
- `【官方公开资料】` **五个 surface container 角色**（这是 M3 相对 M2 的关键变化）：「**Surface container lowest**（最低强调）/ **low** / **（默认）** / **high** / **highest**」，官方说这些「are especially helpful for **creating hierarchy and nested containers**」，并给出最常见的组合：「**The most common combination of surface roles uses `surface` for a background area and `surface container` for a navigation area.**」→ 同上页
- `【官方公开资料】` M3 对配色的**警告**值得抄进任何设计宪法：「**Improper color mappings can produce unintended visual results and break accessibility.**」「**Pair and layer color roles as intended** to ensure expected visual results and accessibility.」「Use caution when changing color roles for visual effect.」→ 同上页
- `【官方公开资料】` M3 的强调级分工：**Primary** = 最重要动作与元素（如 FAB）；**Secondary** = 不需立即注意的元素（如导航图标的选中态、可忽略的按钮）；**Tertiary** = 需要特别强调但不需要立即注意的小元素（如 badge / 通知）。→ 同上页
- `【官方公开资料】` M3 已支持**三档对比度**（standard / medium / high），且「Contrasts also are **tokenized**」（2025 年 5 月更新）。→ [Color system – M3](https://m3.material.io/styles/color/system/overview)

### 5.4 高饱和色的官方禁令

- `【官方公开资料】` Material 2 官方：「A dark theme should **avoid using saturated colors**, as they **don't pass WCAG's accessibility standard of at least 4.5:1** for body text against dark surfaces. **Saturated colors also produce optical vibrations against a dark background, which can induce eye strain.**」配图标注 **Don't**。→ [Material 2 – Dark theme](https://m2.material.io/design/color/dark-theme.html)
- `【官方公开资料】` Material 2 的解法是**去饱和 + 提亮**：「In a dark theme, dark surfaces occupy the majority of the UI. **Accent colors are typically light (desaturated pastels) or bright (saturated, vivid color)** to help accented elements stand out. They should be **used sparingly** to accent key elements.」并说明 baseline 用的是主色的 **200 色调**（官方原文：「uses the **200 tone** of the primary color (passing the WCAG's AA standard of at least 4.5:1 for normal text, at all elevation surfaces)」）。→ 同上页
- `【官方公开资料】` Material 2 还给了**品牌色进暗色**的官方做法：「To create branded dark surfaces, **overlay the primary brand color at a low opacity** over the recommended dark theme surface color (#121212).」示例：`#121212` + **8% Primary** = `#1F1B24`。→ 同上页
- `【官方公开资料】` Apple 的对应表述不看色相看**语义**：「**Embrace colors that adapt to the current appearance.** Semantic colors … **automatically adapt**… When you need a custom color, add a **Color Set asset** … and specify the **bright and dim variants**. **Avoid using hard-coded color values or colors that don't adapt.**」→ [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- `【官方公开资料】` Apple 另有一条专门针对"白底图"的官方建议，正好对应旧端"玻璃拟态/白卡在暗色下发亮"的问题：「**Soften the color of white backgrounds.** If you display a content image that includes a **white background**, consider **slightly darkening the image** to prevent the background from **glowing** in the surrounding Dark Mode context.」→ 同上页

### 5.5 对比度：官方数值（可直接作为验收线）

- `【官方公开资料】` W3C WCAG 2.2 SC 1.4.3 Contrast (Minimum) 原文：「The visual presentation of **text** … has a **contrast ratio of at least 4.5:1**」，例外：「**Large Text** … at least **3:1**」；并给出换算「**14pt and 18pt are equivalent to approximately 18.5px and 24px**」；且强调「the computed values **should not be rounded** (e.g., **4.499:1 would not meet** the 4.5:1 threshold)」。→ [Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- `【官方公开资料】` Android 官方把同一标准翻译成了 sp 口径：「If the text is **smaller than 18sp**, or if the text is **bold and smaller than 14sp**, use … at least **4.5:1**。For all other text, set the color contrast ratio to at least **3:1**。」→ [Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)
- `【官方公开资料】` Apple 的线上口径比 WCAG 更严：「**At a minimum, make sure the contrast ratio between colors is no lower than 4.5:1.** For custom foreground and background colors, **strive for a contrast ratio of 7:1**, especially in small text.」并明确要求**亮暗两态 + 提高对比度模式都要检查**：「Make sure to check the minimum contrast in **both light and dark appearances**」；自定义色要**每个变体都提供"显著更高差异"的 increased contrast 选项**。→ [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)、[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- `【官方公开资料】` Atlassian 的官方自述口径：「Must pass **3:1** contrast: Any UI essential to understanding the experience and text **24px or larger**；Must pass **4.5:1**: Text **smaller than 24px**。」→ [Color – Atlassian Design System](https://atlassian.design/foundations/color)

### 5.6 一个必须知道的官方反例：Discord 提供多档主题

- `【官方公开资料】` Discord 官方**没有**只给"亮/暗"两档，而是桌面 **Light / Ash / Dark / Onyx / Sync with computer**、移动 **Light / Dark / Midnight / Automatic**；官方还说明「themes **may display slightly differently on mobile**. For instance, if you select **Ash on desktop, it will appear as Dark on mobile**.」。另外 Discord 提供了 **Saturation 滑块**让用户降低全应用色彩强度，以及「Display Role colors as a **dot** beside someone's name」这类降噪选项。→ [Appearance 设置](https://support.discord.com/hc/en-us/articles/207260127-How-to-Change-Discord-Color-Themes-and-Customize-Appearance-Settings)、[Making Discord on Desktop Look Just Right](https://discord.com/blog/making-discord-on-desktop-look-just-right-display-settings-to-ease-the-eyes)
- ⚠️ **与 Apple 的官方口径冲突**：Apple HIG 明确说「**Avoid offering an app-specific appearance setting.** … they may think your app is **broken because it doesn't respond to their systemwide appearance choice**.」→ [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- `【本文推断】` 这组冲突说明：**双端不必一致**（本项目已定"不追求两端 1:1"）。iOS 侧跟随系统外观是 Apple 的官方期望；Android 侧则没有对应的"禁止应用内主题"官方表述。**建议在提案里显式记录这条平台差异**，而不是取两者交集。

### 5.7 对 Dorm 的含义

暗色模式不是"把白色换成黑色"：官方证据指向的是**一套有序的表面层级**（Material 的 surface container 五档 / Apple 的 base-elevated / Atlassian 的四级），加上**禁止高饱和、禁止纯黑大面积、禁止用发光代替阴影**，以及 4.5:1（普通文字）与 3:1（大字号/非文本）两条可验收线。旧端 1144 处硬编码色值在这套体系下**不可能**成立——因为同一个"卡片底色"在亮暗两态、三档对比度、以及不同嵌套层里必须是**不同值**。

---

## 6. 动效的节制：哪些值得动、哪些应当不动

### 6.1 官方立场：动效是**有目的的**，且**必须可关**

- `【官方公开资料】` Apple HIG Motion 的三条 Best practices 原文：
  - 「**Add motion purposefully, supporting the experience without overshadowing it.**」
  - 「**Make motion optional.**」
  - 在 Providing feedback 一节：「**Aim for brevity and precision in feedback animations.**」「**In apps, generally avoid adding motion to UI interactions that occur frequently.**」「**Let people cancel motion.**」
  → [Motion | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/motion)

  > 「**generally avoid adding motion to UI interactions that occur frequently**」是本节最可操作的一条：**高频交互默认不动**。
- `【官方公开资料】` Adobe Spectrum：「motion should be **adding meaning** to an experience」，并把动效**分类**为三种用途：**directional**（方向 = 语义：线性=前进/进度、对角=上下文切换"potentially disruptive"、顺时针=无明确进度的循环，即 loading）、**interaction**（交互反馈）、**wayfinding**（仍在开发中）。Spectrum 同时明确：「**motion over large surface areas needs to support browser and system settings for reduced motion.**」以及"箭头动效要**sparingly**, only on the most important action(s) on a page"。→ [Motion – Spectrum](https://spectrum.adobe.com/foundations/behavior/motion)
- `【官方公开资料】` Atlassian 对"用动效代替状态"的节制要求见 5.2 末条（"used sparingly to avoid excessive animation"）。→ [Elevation – Atlassian](https://atlassian.design/foundations/elevation)

### 6.2 官方给的"动效语法"（不是"动效参数表"）

- `【官方公开资料】` M3 的动效体系已从"时长 + 曲线"转为 **springs（弹簧）**：官方定义三个属性 **stiffness / damping / initial velocity**，理由是「**Springs feel natural**… They **handle gestures, interruptions, and retargeting animations seamlessly**.」→ [Motion – M3 Overview](https://m3.material.io/styles/motion/overview)
- `【官方公开资料】` M3 提供两个预设 motion scheme：**expressive**（"Material's opinionated motion scheme, and **should be used for most situations**, particularly hero moments and key interactions"，会 **overshoot** 造成回弹）与 **standard**（"feels more functional with **minimal bounce**, and should be used for **utilitarian products**"）。→ 同上页
- `【官方公开资料】` M3 把动效 token 拆成 **spatial**（移动：位置/旋转/尺寸/圆角，"overshoots the final value and bounces into place"）与 **effects**（颜色/透明度，"**where there shouldn't be any overshoot**"）两类，各三档速度（default / fast / slow）。官方给的速度判据是「**Most motion should use the default speed**, while **smaller elements may use fast** and **larger elements may use slow**」，并给出示例：bottom sheet / expanded nav rail 用 default；switch、button 用 fast；full-screen 动画用 slow。→ 同上页
- `【官方公开资料】` M3 的 easing **选择规则是按"进出屏幕的方式"决定的**，这条非常可操作：
  - **begin and end on screen** → Emphasized
  - **enter the screen** → Emphasized **decelerate**
  - **exit the screen permanently** → Emphasized **accelerate**（"By ending at peak velocity, it gives the impression the exiting component **cannot be retrieved**"）
  - **exit the screen temporarily** → Emphasized（"ending at rest just off screen, it gives the impression the exiting component **can be retrieved**"）
  官方另有版本兼容说明：「The **Standard** easing set can be used for small utility focused transitions that need to be quick. The Standard set is also a **fallback for platforms that don't support Emphasized easing, like iOS and Web**.」
  → [Easing and duration – M3](https://m3.material.io/styles/motion/easing-and-duration)
- `【官方公开资料】` M3 的时长判据是**相对面积**而非绝对毫秒：「Transitions that cover **small areas** of the screen have **short durations**. Those that **traverse large areas** have **long durations**. **Scaling duration with the size of a transition area gives a consistent sense of speed.**」→ 同上页
- `【官方公开资料】` M3 还明确点名了**负面样例**：「Avoid transitions with such a short duration they become **jarring**」。→ 同上页
- `【官方公开资料】` M3 导航栏对动效有一条**方向性约束**：「The active indicator animation should **only apply on one axis** to better represent a **flat, shared plane**.」→ [Navigation bar – M3 Guidelines](https://m3.material.io/components/navigation-bar/guidelines)

### 6.3 「减少动态效果」是必须响应的系统契约

- `【官方公开资料】` Apple HIG Accessibility 对 Reduce Motion 的要求是**功能级**的，且列出了具体做法：
  - 「People who are prone to these effects can turn on the **Reduce Motion** accessibility setting. When this setting is active, **ensure your app or game responds by reducing automatic and repetitive animations**, including **zooming, scaling, and peripheral motion**.」
  - 官方列出的其他 reduce-motion 实践：「Tightening animation springs to **reduce bounce** effects」「Tracking animations **directly with people's gestures**」「**Avoiding animating depth changes in z-axis layers**」「Replacing transitions in x-, y-, and z-axes with **fades**」「**Avoiding animating into and out of blurs**」
  → [Accessibility | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- `【官方公开资料】` Apple 同时把"快速/闪烁动画"列为健康风险：「**Be cautious with fast-moving and blinking animations.** … it can be distracting, **cause dizziness**, and in some cases even result in **epileptic episodes**.」→ 同上页
- `【官方公开资料】` Android 侧的对应机制是系统级动画缩放 `Settings.Global.ANIMATOR_DURATION_SCALE`（官方 API 参考页存在该常量，与 `TRANSITION_ANIMATION_SCALE` / `WINDOW_ANIMATION_SCALE` 同族）。→ [Settings.Global | Android Developers](https://developer.android.com/reference/android/provider/Settings.Global)。⚠️ **本次抓取该页只拿到页面导航骨架，未读到正文条目文字，因此"该常量存在"这一条按「官方 API 页存在该条目」处理，`【本文推断】`：应用应读取该缩放值并据此关闭/缩短动画。此项需人工复核具体 API 措辞。**
- `【官方公开资料】` Android 官方在 Compose 侧已经把 reduced motion **做进了组件默认行为**：`Modifier.placeholder` 的官方 API 文档写明「The reveal of the content will be **animated** when it becomes available… **unless the ReducedMotion setting is enabled, in which case those are instantaneous**.」→ [placeholder | API reference](https://developer.android.com/reference/kotlin/androidx/wear/compose/material3/placeholder.composable)
- `【官方公开资料】` Web 侧的对应能力是 `prefers-reduced-motion` 媒体特性（MDN 官方文档页存在并可访问）。→ [prefers-reduced-motion | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)。⚠️ 本次抓取该页只得到 MDN 的导航骨架，**未读到正文**，故此处只记"该能力存在"。

### 6.4 「装了动画库但 0 处引用」与「到处乱动」分别是哪种病

先说清两个库**官方声明自己是干什么用的**（这决定了"装了不用"为什么是浪费）：

- `【官方公开资料】` Reanimated 官方首页自述：「Reanimated lets you define animations in plain JavaScript which **run natively on the UI thread by default**. Smooth animations and interactions **up to 120 fps**」，并列出能力范围：Animations / Gestures / **Layout animations** / Sensor-based / Keyboard-based；强调「It also provides more control over the platform's native components…」。→ [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- `【官方公开资料】` Gesture Handler 官方自述：「Gesture Handler provides a **declarative API exposing the native platform's touch and gesture system** to React Native. It's designed to be a **replacement of React Native's built in touch system called Gesture Responder System**. Using native touch handling allows **addressing the performance limitations** of React Native's Gesture Responder System.」并明确其与 Reanimated 的关系：「**Using Reanimated is the recommended method of handling gesture-driven interactions on the UI thread.**」→ [React Native Gesture Handler – Getting started](https://docs.swmansion.com/react-native-gesture-handler/docs/)

- `【本文推断】` **「装了动画库但 0 处引用」是"能力未接入"的病**：官方文档说明这两个库分别解决 **UI 线程动画**与**原生手势**两个具体问题（见上两条）。0 处引用意味着这两类问题**一个都没解决**——手势仍然是 RN 内置 responder 系统（官方说它有性能限制），动画如果靠 JS 线程驱动则在高频手势下会掉帧。**症状不在"没有动画"，而在"所有本该由原生手势承担的高频交互都没被接管"**（下拉刷新、侧滑返回、长按菜单、图片查看器缩放、卡片拖拽）。
- `【本文推断】` **「到处乱动」是"动效没有语义"的病**：官方证据支持这个判断——M3 要求动效有 spatial/effects 之分与"进出屏幕"的 easing 语义（见 6.2）；Spectrum 要求动效"adding meaning"并分为 directional/interaction/wayfinding（见 6.1）；Apple 明确"高频交互一般不加动效"（见 6.1）。**如果每个页面进场都做一次 300ms 位移淡入，那它既不表达方向、也不表达层级、还发生得极其频繁——三条官方判据全踩。**
- `【本文推断】` **Android 上玻璃拟态失效的直接技术原因**（本次找到了官方一手说明）：Expo 官方文档 `expo-blur` 页写明：「This is the **legacy** way of creating a `BlurView`, which will result in a **blur only on iOS**. **On Android, this will result in a view with a semi-transparent background.**」官方在页首另有说明：「In **SDK 55 and later**, `expo-blur` is **stable on Android, but some code changes are required** for the `BlurView` to work.」并列出 Known issue：「The blur effect **does not update** when `BlurView` is rendered **before** dynamic content is rendered using, for example, `FlatList`.」→ [BlurView – Expo Documentation](https://docs.expo.dev/versions/latest/sdk/blur-view/)
  **这条把旧端"Android 上玻璃拟态从未生效"从"玄学"变成了"可解释的默认行为"**：旧写法在 Android 上**必然**退化为半透明背景。**注意**：这是 Expo 的文档；若新 App 不用 Expo 而用 `@react-native-community/blur` 或原生 `RenderEffect`，需另行取证，**不得**把本条的结论直接外推到别的库。
- `【官方公开资料】` Apple HIG 有**专门的材质章节**说明了"玻璃"在 iOS 上的正确用法边界，与"到处贴玻璃"相反：「**Only use clear Liquid Glass for components that appear over visually rich backgrounds.**」「The **regular** variant blurs and adjusts the luminosity of background content to **maintain legibility**… Use the regular variant when background content **might create legibility issues**, or when components have **a significant amount of text**.」「**Help ensure legibility by using vibrant colors on top of materials.**」「**Choose materials and effects based on semantic meaning and recommended usage.** Avoid selecting a material or effect based on **the apparent color it imparts**.」→ [Materials | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/materials)

### 6.5 对 Dorm 的含义

两类病的药方完全不同：**"装了不用"要治的是接入**（把高频手势与列表动画交给原生层，而不是删库）；**"到处乱动"要治的是语义**（每个动效都要能回答"它在表达方向、层级，还是反馈"，答不上来就删）。另外，**Android 上的模糊/毛玻璃必须先在真机验证再写进设计**——官方文档已明说旧式用法在 Android 只会得到半透明背景。

---

## 7. 空态 / 加载 / 错误 / 无网：成熟产品怎么表达

### 7.1 空态：官方把它拆成了**类别**，而不是一张插画

- `【官方公开资料】` Carbon Design System 是本次找到的**最系统的官方空态规范**，把空态分成三类并给出各自的"目标"：
  - **No data empty states**（首次使用、还没有数据）→ 目标：「User understands **what will be available** on the page when data has been added… They understand **how to add data themselves**.」
  - **User action empty states**（用户动作导致，如搜索无结果、流程完成确认）→ 目标：「User understands **how to adjust search terms or filters** to continue their search.」
  - **Error management empty states**（权限问题 / 系统问题 / 需要配置）→ 目标：「User understands **the problem** and if there are **corrective actions** available, knows what action to take…」，且官方说这类「a **higher level of detail and specificity** will better support the user」。
  → [Empty states – Carbon Design System](https://carbondesignsystem.com/building-blocks/core/patterns/empty-states)
- `【官方公开资料】` Carbon 给出的几条**可直接当验收项**的规则：
  - 「Empty states **should replace the element that would ordinarily show**. For example, an empty state for a table would replace the table and **the column headers and footer should not be present**.」（理由是避免屏幕阅读器先读完整个表格）「Likewise, if you search for something and there are no results, **any underlying content should be replaced** by the empty state message.」
  - **对齐**：「Empty state elements should be **left-aligned as a block**.」唯一例外是小 tile（图片居中于左对齐的文字与主操作之上，"to prevent the empty state looking too much like content, where it could be **skipped over**"）。
  - **空间决定形式**：「**If space is limited, use just text.**」（图片尺寸随可用空间缩放）
  - **多个空态同屏**：「we recommend using a **tertiary button** for the call to action. This avoids scenarios with **multiple primary action buttons** in the UI.」以及「If you have a dashboard with a number of widgets and there is a failure for multiple widgets to load, the repetition of the empty state may not have the same impact if you use **illustrative icons**. In this case, an empty state that uses **just text** may be preferable.」
  - 「**Don't cover multiple options in one empty state.** If there are multiple things a user can do, **pick the most important** and keep the focus on that action.」
  → 同上页
- `【官方公开资料】` Material 2 的官方空态页口径一致且更简短，并有一条**独特的禁止项**：「The most basic empty state consists of a **non-interactive image and a text tagline**.」「**Don't use a tagline worded like a call to action**, as empty tags **aren't interactive and don't respond when tapped**. Images that express **urgency or confusion** should also be avoided.」官方还提出了 **starter content**：「screens which would otherwise be empty can be populated with **starter content**… allows users to **begin using an app right away**, making it easier for them to learn about what an app has to offer.」→ [Empty states – Material Design 2](https://m2.material.io/design/communication/empty-states.html)
- `【官方公开资料】` Apple 侧与之呼应的是"空 Tab 也要解释原因"：「**Don't disable or hide tab bar buttons**, even when their content is unavailable… **If a section is empty, explain why its content is unavailable.**」→ [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

### 7.2 加载：官方区分了**占位内容**与**进度指示器**，并都给了取舍依据

- `【官方公开资料】` Apple HIG Loading 的官方原则极为简洁：「**The best content-loading experience finishes before people become aware of it.**」具体条目：
  - 「**Show something as soon as possible.** If you make people wait for loading to complete before displaying anything, they can interpret **the lack of content as a problem with your app**. Instead, consider showing **placeholder text, graphics, or animations** as content loads, replacing these elements as content becomes available.」
  - 「**Let people do other things** … while they wait for content to load.」（后台加载）
  - 「**If loading takes an unavoidably long time, give people something interesting to view** while they wait.」
  - 「**Clearly communicate that content is loading and how long it might take to complete.** … you use a **determinate** progress indicator when you **know how long** loading will take, and an **indeterminate** one when you **don't**.」
  → [Loading | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/loading)
- `【官方公开资料】` Apple HIG Progress indicators 补充了几条**极易违反**的细则：
  - 「**When possible, use a determinate progress indicator.**」
  - 「**Be as accurate as possible when reporting advancement**… Showing 90 percent completion in five seconds and the last 10 percent in 5 minutes can make people wonder if your app is still working and can even feel **deceptive**.」
  - 「**Keep progress indicators moving** so people know something is continuing to happen. People tend to associate a **stationary indicator with a stalled process or a frozen app**.」
  - 「**Don't switch from the circular style to the bar style.**」
  - 「**If it's helpful, display a description that provides additional context for the task.** Be accurate and succinct. **Avoid vague terms like _loading_ or _authenticating_ because they seldom add value.**」
  - 「**Display a progress indicator in a consistent location.**」
  - iOS 的**下拉刷新**官方语义：「A refresh control … is **hidden by default**, becoming visible when people **drag down** the view they want to reload.」，并强调「**Perform automatic content updates.** … **Don't make people responsible for initiating every update.**」
  → [Progress indicators | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- `【官方公开资料】` Material 3 新引入的 **loading indicator** 有明确的时长与替代关系：「The loading indicator is designed to show progress that loads in **under five seconds**. It **should replace most uses of the indeterminate circular progress indicator**.」并说明「Used for **pull-to-refresh** interactions」，且「Recommended as a replacement for indeterminate circular progress indicators」。→ [Loading indicator – M3 Overview](https://m3.material.io/components/loading-indicator/overview)
- `【官方公开资料】` M3 对进度指示器还有一条一致性要求：「**Use the same configuration for all instances of a process (like loading)**」。→ [Progress indicators – M3 Overview](https://m3.material.io/components/progress-indicators/overview)
- `【官方公开资料】` **分页加载的官方状态机**（这是"上拉加载更多"的正确答案）：Android Paging 库把加载状态定义成 **`LoadState.NotLoading`（含 `endOfPaginationReached`）/ `LoadState.Loading` / `LoadState.Error`**，并为每种 **LoadType**（refresh / append / prepend）各给一路信号；错误态的官方处理是**带 retry 的按钮**（`ErrorButton(... onClick = { pagingItems.retry() })`），官方还明确「You can use this state in two ways: handling the **main content visibility (like a full-screen refresh spinner)** or **inserting loading items directly into your `LazyColumn` stream (like a footer spinner)**」。**注意**：官方特别提醒"header/footer 方案**仅在 placeholders 关闭时有效**，否则 load state 项会显示在 placeholder 之后"。→ [Manage and present loading states](https://developer.android.com/topic/libraries/architecture/paging/load-state)
- `【官方公开资料】` **骨架屏（skeleton）的官方定义**来自 Atlassian 组件文档（本次找到的最明确的一手表述）：「**A skeleton acts as a placeholder for content, usually while the content loads.**」官方组件支持 `isShimmering` 控制微光动画，并支持把 shimmer 的起止色**token 化**（`color` / `ShimmeringEndColor`）。→ [Skeleton – Atlassian Design System](https://atlassian.design/components/skeleton)
- `【官方公开资料】` Android 侧把 skeleton 概念直接写进了 API 文档：`Modifier.placeholder` 官方描述为「draws a **skeleton shape** over a component, for situations when **no provisional content (such as cached data) is available**. The placeholder skeleton can be displayed instead, while the content is loading.」→ [placeholder | API reference](https://developer.android.com/reference/kotlin/androidx/wear/compose/material3/placeholder.composable)

### 7.3 错误与"服务不可用"：官方要求"说清发生了什么 + 给出下一步"

- `【官方公开资料】` GOV.UK Design System 的官方错误文案规范是最可执行的：核心要求是「**explain what went wrong and how to fix it**」。其 Validation pattern 进一步规定：
  - 校验的目标是「tell the user **what's gone wrong** and **how to fix it**」，且要「**minimise your chances of needing to show an error message in the first place**」。
  - 传达方式（无障碍相关，三条同时做）：「add '**Error: **' to the beginning of the page `<title>` so screen readers read it out as soon as possible」；「show an **Error summary** component at the **top of the page, and move keyboard focus to it**」；「show **Error message** components **next to fields** with errors」。
  → [Recover from validation errors – GOV.UK Design System](https://design-system.service.gov.uk/patterns/validation/)、[Error message](https://design-system.service.gov.uk/components/error-message/)
- `【官方公开资料】` GOV.UK 有一套**成体系的失败页面规范**（这是国内产品普遍缺失的部分）：`Service unavailable pages`、`There is a problem with the service pages`、`Page not found pages`。其中"服务有问题"页的官方要求是「**Tell the user there is something wrong with the service.**」「**Log all errors and fix them as quickly as possible.**」，并且**专门为有离线能力的服务**提供了变体与要求：「include a **link to another service or contact information about offline support**」。→ [There is a problem with the service pages](https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/)
- `【官方公开资料】` Apple HIG Feedback 把"反馈强度必须匹配信息重要性"写成原则，并给了分级判据：
  - 「The most effective feedback tends to **match the significance of the information to the way it's delivered**. For example, it often works well to display **status information in a passive way**… In contrast, a warning about possible data loss **needs to interrupt people**.」
  - 「**Consider integrating status feedback into your interface**… people get important information **without having to take action or leave their current context**.」
  - 「**Use alerts to deliver critical — and ideally actionable — information.** By design, alerts **disrupt the current context**… Alerts can **lose their impact if you use them too often** or to deliver unimportant information.」
  - 「**When it makes sense, confirm that a significant action or task has completed.** … because people typically **expect their action or task to succeed, they only need to know when it doesn't**.」
  - 「**Show people when a command can't be carried out and help them understand why.**」
  → [Feedback | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/feedback)
- `【官方公开资料】` Apple 的一条反直觉但很实用的规则：「**Warn people when they initiate a task that can cause data loss that's unexpected and irreversible.** In contrast, **don't warn people when data loss is the expected result** of their action. For example, the Finder **doesn't warn** people every time they throw away a file because deleting the file is the expected result.」→ 同上页

### 7.4 无网 / 离线优先：官方把它当作**数据层架构**，不是一张提示图

- `【官方公开资料】` Android 官方离线优先指南的定义：「An **offline-first app** is an app that is able to perform **all, or a critical subset of its core functionality without access to the internet**.」核心要求是「an offline-first app has a **minimum of 2 data sources** for every repository that utilizes network resources」，且：
  - 「**The local data source is the canonical source of truth for the app. It should be the exclusive source of any data that higher layers of the app read.** This ensures **data consistency between connection states**.」
  - 「The **network data source is the actual state** of the application. At best, the local data source is **synchronized** with the network data source…」
  - 「**The domain and UI layers of the app must never communicate directly with the network layer.** It is the responsibility of the hosting `repository`…」
  → [Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first)
- `【官方公开资料】` Android 官方对离线错误的推荐模型是 **LCE（Loading / Content / Error）**：「when there is a failure while reading, you **show an error state**. Usually, you achieve LCE by **modeling the UI states as Kotlin sealed classes**.」官方示例给出 `Loading` / `Success(author)` / `Error` 三态。→ 同上页
- `【官方公开资料】` Web 侧官方（web.dev）的离线范式是**具名的缓存策略集合**：Cache only / Network only / **Cache falling back to network** / **Cache then network** / stale-while-revalidate / 后台同步等，并明确指出 "Network falling back to cache" 的缺陷：「If the user has an **intermittent or slow connection** they'll have to **wait for the network to fail** before they get the perfectly acceptable content already on their device. **This can take an extremely long time and is a frustrating user experience.** See the next pattern, **Cache then network**, for a better solution.」→ [The offline cookbook](https://web.dev/articles/offline-cookbook)
- `【官方公开资料】` 微博官方帮助确认了**发布失败**这类"有网但失败"的场景应当**把失败原因持久化在草稿里**（见 3.3）。→ [为何微博无法成功发布](https://kefu.weibo.com/faqdetail?id=13790)
- `【官方公开资料】` Apple 有一条**容易被忽略的官方建议**：不要在没有控制手段的情况下自动播放音视频；并且**不鼓励用不定量进度指示器**做长等待的默认表达（watchOS 一节：「**Avoid displaying an indeterminate progress indicator** — such as a loading indicator — in a watchOS app. An animated indicator can make people think they **need to continue paying attention** to the display」）。→ [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)、[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### 7.5 对 Dorm 的含义

四个状态不是四张插画，而是**四条不同规则**：空态要**分类**（Carbon 三类）、加载要**先给东西看再报进度**（Apple）+ 分页要有**状态机**（Android `LoadState`）、错误要**说清 + 可操作**（GOV.UK）、无网要**架构级成立**（本地为 source of truth）。旧端"页面空白 + 转圈"同时违反了其中至少三条。

---

## 8. 收尾：什么让它像成品原生 App，什么让它像网页（可操作判据清单）

> **本节全部条目的性质**：每条都指回上文对应章节的官方原文。**判据本身是可检查的行为/结构**，不是审美主张。
> 使用时建议逐条打勾并注明证据来源；打不上勾的条目**不允许**用"后面再优化"结案。

### 8.1 「像成品原生 App」的判据（**74 条**，分 A–E 五组）

| 组 | 主题 | 条数 | 主要依据章节 |
| --- | --- | --- | --- |
| A | 结构层次（信息流 / 导航） | 20 | §1、§2.1–§2.3 |
| B | 返回与状态 | 9 | §2.5、§3 |
| C | 视觉系统（色与层） | 13 | §5 |
| D | 动效与手势 | 11 | §6 |
| E | 内容状态（空/载/错/离线） | 21 | §7 |
| | **合计** | **74** | |

#### A. 结构层次（来自 §1、§2）

| # | 判据 | 依据 |
| --- | --- | --- |
| A1 | 一张卡片只讲**一件事**；卡片内部件有固定顺序，任何人改顺序都要说明理由 | `【官方公开资料】` M3 Cards；BBC GEL Cards 的"12 部件固定顺序" |
| A2 | 卡片默认**不靠投影**表达存在感（M3 默认低海拔、无阴影） | `【官方公开资料】` M3 Cards「Differences from M2」 |
| A3 | 元数据（作者/时间/来源）在视觉上**被明确降权**，且链接型元数据与非链接型**不同样式** | `【官方公开资料】` BBC GEL Promos |
| A4 | 文本不会被**裁剪或截断**到不可读 | `【官方公开资料】` Apple HIG Lists and tables |
| A5 | 正文行宽有上限（BBC 官方建议 ≤60 字符/行） | `【官方公开资料】` BBC GEL Typography |
| A6 | 图片比例在产品内**统一**（BBC 官方为 16:9） | `【官方公开资料】` BBC GEL Cards |
| A7 | 底部主导航 **3–5 个**，且**没有** overflow 的 More tab | `【官方公开资料】` M3 Navigation bar；Android 官方；Apple HIG Tab bars |
| A8 | Tab 数量与内容**不随页面变化** | `【官方公开资料】` M3「Destinations don't change」 |
| A9 | 每个 Tab 都有 **1–2 词的文字标签** | `【官方公开资料】` M3 Navigation bar |
| A10 | Tab 是**导航**；动作走 toolbar / FAB / 菜单 | `【官方公开资料】` Apple HIG Tab bars；M3 FAB；Android 官方 |
| A11 | 再点当前 Tab **回到该 Tab 顶部** | `【官方公开资料】` M3 Navigation bar |
| A12 | 底部导航在**任何**屏都不被永久遮挡（弹层/键盘只是临时） | `【官方公开资料】` M3 Navigation bar |
| A13 | 内容为空的分区**不被隐藏**，而是解释为什么空 | `【官方公开资料】` Apple HIG Tab bars |
| A14 | 顶部 Tab **≤4 个**；有 Tab 的内容区不放大面积可横滑组件 | `【官方公开资料】` M3 Tabs |
| A15 | 分段控件只用于 **2–5 项**的简单选择 | `【官方公开资料】` M3 Segmented buttons |
| A16 | 抽屉只在**≥5 个顶层目的地**时使用，且**不与底部导航同屏** | `【官方公开资料】` M3 Navigation drawer |
| A17 | 主/次导航分工明确（Android 官方：导航栏=主，Tabs/bottom app bar=次） | `【官方公开资料】` Android 布局与导航模式 |
| A18 | 侧边栏层级**≤2 级**，更深用 split view | `【官方公开资料】` Apple HIG Sidebars |
| A19 | 屏幕尺寸变化时**换导航形态**（compact 导航栏 → 大屏 rail/sidebar），而不是同一根底栏铺满 | `【官方公开资料】` Android 官方「Avoid using the same bottom navigation bar across sizes」；Apple `sidebarAdaptable` |
| A20 | FAB 一屏**最多一个**；该屏主操作如果是内容本身（如看图）则**不放** FAB | `【官方公开资料】` M3 FAB「Don't display multiple FABs」「FABs are not needed on every screen」 |

#### B. 返回与状态（来自 §2.5、§3）

| # | 判据 | 依据 |
| --- | --- | --- |
| B1 | 返回是**系统级**行为：使用平台的 Back API，不劫持 `KEYCODE_BACK` | `【官方公开资料】` Android predictive back 迁移要求 |
| B2 | 每个 Tab 各自**独立维护返回栈** | `【官方公开资料】` Android 官方 multiple back stacks 主题 |
| B3 | **配置变更**（旋转/分屏）后 UI 状态不丢 | `【官方公开资料】` Android Save UI states |
| B4 | **进程被杀**后返回 App，输入与滚动位置**不丢**（至少输入不丢） | `【官方公开资料】` Android Save UI states |
| B5 | 深链落到具体内容时**返回栈合理**（不是空栈） | `【官方公开资料】` Android deep links / app links 官方主题 |
| B6 | 模态任务**短**、有**明显退出口**、能一眼看出**这是什么任务** | `【官方公开资料】` Apple HIG Modality |
| B7 | 关闭模态会丢用户内容时，**先解释再给解决方式** | `【官方公开资料】` Apple HIG Modality |
| B8 | 同时**不叠两个模态**；任何时刻**不同时显示两个 alert** | `【官方公开资料】` Apple HIG Modality |
| B9 | 发布失败时**内容不丢**，且失败原因**可回看** | `【官方公开资料】` 微博官方"失败后草稿箱留错误提示"；Android 状态保存要求 |

#### C. 视觉系统（来自 §5）

| # | 判据 | 依据 |
| --- | --- | --- |
| C1 | **没有硬编码色值**：所有颜色来自语义角色（surface / on-surface / primary / …） | `【官方公开资料】` M3 色角色体系；Apple「Avoid using hard-coded color values」 |
| C2 | 大字面区域**不用纯黑**（除非有明确省电/OLED 理由且只用于简单界面） | `【官方公开资料】` Material 2 Dark theme（推荐 `#121212`）；Material 官方博客的因果解释 |
| C3 | 暗色下**层级靠表面色变化**表达，不是只靠阴影 | `【官方公开资料】` Material 2；Atlassian「the higher the elevation, the lighter the surface」；Apple base/elevated |
| C4 | 暗色下表面层级**有明确档数且成体系**（M3 五档 surface container / Atlassian 四级 / Apple base-elevated） | `【官方公开资料】` M3 Color roles；Atlassian Elevation；Apple Dark Mode |
| C5 | **不用发光代替阴影**表达海拔 | `【官方公开资料】` Material 2「Don't use light glows in place of dark shadows」 |
| C6 | 暗色下**避免高饱和色**做文字/大面积 | `【官方公开资料】` Material 2「avoid using saturated colors… optical vibrations」 |
| C7 | 强调色在暗色下**去饱和/提亮**，且**只用在关键元素** | `【官方公开资料】` Material 2 accent 说明；M3 primary/secondary/tertiary 分工 |
| C8 | 亮、暗**两态**的文字对比度都 ≥ **4.5:1**；大字/非文本 ≥ **3:1** | `【官方公开资料】` W3C WCAG 2.2 SC 1.4.3；Android 官方 sp 口径；Apple（自定义色建议 7:1） |
| C9 | 自定义色**为每个变体提供**亮/暗 + 高对比度版本 | `【官方公开资料】` Apple HIG Color |
| C10 | 语义色**不被挪用**（分隔线色不当文字色，次级文字色不当背景色） | `【官方公开资料】` Apple HIG Color「Avoid redefining the semantic meanings」；M3「Use caution when changing color roles for visual effect」 |
| C11 | 白底图片在暗色下有**抑制发光**的处理 | `【官方公开资料】` Apple HIG Dark Mode「Soften the color of white backgrounds」 |
| C12 | 每个色角色**只与官方指定的配对/层级组合**使用 | `【官方公开资料】` M3「Pair and layer color roles as intended」 |
| C13 | 高注意力元素**一屏只有一组** | `【官方公开资料】` Spectrum Attention hierarchy「only one element or group of elements should have high attention on a page」 |

#### D. 动效（来自 §6）

| # | 判据 | 依据 |
| --- | --- | --- |
| D1 | 每个动效都能回答"它在表达**方向 / 反馈 / 寻路**中的哪一种"；答不上就删 | `【官方公开资料】` Spectrum Motion 的三分类；Apple「Add motion purposefully」 |
| D2 | **高频交互默认不动** | `【官方公开资料】` Apple HIG Motion「generally avoid adding motion to UI interactions that occur frequently」 |
| D3 | 位移类（spatial）可以有回弹，颜色/透明度类（effects）**不得**回弹 | `【官方公开资料】` M3 spatial vs effects tokens |
| D4 | 动效时长**随覆盖面积缩放**，而不是所有转场一个固定毫秒 | `【官方公开资料】` M3「Scaling duration with the size of a transition area」 |
| D5 | 进退屏的 easing **按语义区分**（进入=decelerate、永久离开=accelerate、临时离开=emphasized） | `【官方公开资料】` M3 Easing and duration |
| D6 | 转场既**不短到刺眼**，也不长到像在等 | `【官方公开资料】` M3「Avoid transitions with such a short duration they become jarring」 |
| D7 | 尊重系统「减少动态效果」；开启后**停止自动/重复动画**（缩放、位移、视差），必要时**换成淡入淡出** | `【官方公开资料】` Apple HIG Accessibility；Android `Placeholder` 官方行为；`prefers-reduced-motion` |
| D8 | 减少动效时**不做 z 轴深度动画**、**不做进出模糊** | `【官方公开资料】` Apple HIG Accessibility |
| D9 | 原生手势（下拉刷新、侧滑返回、长按、缩放、拖拽）由**原生手势层**接管，而非 JS responder | `【官方公开资料】` Gesture Handler 官方自述"replacement of RN's Gesture Responder System"且"addressing the performance limitations" |
| D10 | 手势驱动的动画在**UI 线程**执行 | `【官方公开资料】` Reanimated 官方"run natively on the UI thread by default"；Gesture Handler 官方"Using Reanimated is the recommended method" |
| D11 | 模糊/毛玻璃效果**在 Android 真机上验证过**才写进设计 | `【官方公开资料】` Expo `expo-blur` 官方：legacy 用法"blur **only on iOS**"，Android 退化为半透明；SDK 55+ 才 stable 且"some code changes are required" |

#### E. 内容状态（来自 §7）

| # | 判据 | 依据 |
| --- | --- | --- |
| E1 | 空态**分了类**（首次无数据 / 用户动作无结果 / 错误管理），且各自动作不同 | `【官方公开资料】` Carbon 三类空态 |
| E2 | 空态**替换掉**本该显示的组件本体（表格空态不显示表头与页脚） | `【官方公开资料】` Carbon |
| E3 | 空态**不把 tagline 写成 call to action**（因为空态图不可点） | `【官方公开资料】` Material 2 Empty states |
| E4 | 空态图**不表达紧急/困惑** | `【官方公开资料】` Material 2 |
| E5 | 空间有限时**只用文字**，不硬塞插画 | `【官方公开资料】` Carbon；Material 2 |
| E6 | 同屏多个空态时，CTA 降级为 **tertiary**，避免多个主按钮 | `【官方公开资料】` Carbon |
| E7 | 一个空态只给**一个**最重要动作 | `【官方公开资料】` Carbon「Don't cover multiple options in one empty state」 |
| E8 | 加载**先给东西看**（占位内容/骨架），不是先给空白 | `【官方公开资料】` Apple HIG Loading「Show something as soon as possible」 |
| E9 | 知道时长用**确定性**指示器，不知道才用不确定性的 | `【官方公开资料】` Apple HIG Loading / Progress indicators |
| E10 | 进度指示器**持续在动**（静止会被读成卡死） | `【官方公开资料】` Apple HIG Progress indicators |
| E11 | 不给进度指示器配"loading…"这种**无信息量的文字** | `【官方公开资料】` Apple HIG「Avoid vague terms like loading」 |
| E12 | 进度指示器出现在**一致的位置** | `【官方公开资料】` Apple HIG |
| E13 | 分页加载有**明确状态机**：refresh / append / prepend × NotLoading / Loading / Error，错误带 **retry** | `【官方公开资料】` Android Paging `LoadState` / `CombinedLoadStates` |
| E14 | 错误文案**说清发生了什么 + 给出怎么修** | `【官方公开资料】` GOV.UK Error message / Validation |
| E15 | 错误有**焦点管理**：错误摘要在页面顶部并把焦点移过去；字段级错误就近显示 | `【官方公开资料】` GOV.UK Validation |
| E16 | 反馈的**强度匹配信息重要性**（状态用被动方式，数据丢失才打断） | `【官方公开资料】` Apple HIG Feedback |
| E17 | 用户**预期会成功**的操作不弹成功提示；失败才提示 | `【官方公开资料】` Apple HIG Feedback「they only need to know when it doesn't」 |
| E18 | **预期内的删除不警告**；意外且不可逆的才警告 | `【官方公开资料】` Apple HIG Feedback（Finder 反例） |
| E19 | 离线时**本地是唯一数据源**，UI 只读本地，网络只由 repository 写本地 | `【官方公开资料】` Android offline-first |
| E20 | 无网/弱网**不靠"等网络失败"**才给内容（Cache then network 优于 Network falling back to cache） | `【官方公开资料】` web.dev offline cookbook |
| E21 | 有离线能力的服务，其"服务不可用"页要给出**离线支持联系方式** | `【官方公开资料】` GOV.UK problem-with-the-service-pages |

### 8.2 「像网页」的判据（18 条，即上表的反面症状）

> 说明：以下症状是**由 §8.1 的官方判据反推**得到的（`【本文推断】`），因此**每一条都必须能被 §8.1 中对应条目的官方依据所反驳**，否则不予采用。

| # | 症状 | 违反的官方依据 |
| --- | --- | --- |
| W1 | 用**硬编码色值 / 字号字面量**铺 UI（旧端：1144 处色值、645 处 `fontSize`） | C1 / C9 —— Apple 官方要求自定义色以 Color Set 提供多态变体；M3 要求色角色配对 |
| W2 | 亮色做完后**把白改黑**就算暗色模式 | C2 / C3 / C4 —— 暗色需要成体系的表面层级，不是颜色取反 |
| W3 | 暗色下**大面积纯黑 + 高饱和品牌色** | C2 / C6 —— Material 官方给出因果与"Don't" |
| W4 | 所有"层"都用**阴影**区分，暗色下也照抄 | C3 / C5 —— 暗色靠表面色变亮；官方禁止用发光代替阴影 |
| W5 | 一套**固定毫秒数**套在所有转场 | D3 / D4 —— M3 按时长随面积缩放、spatial/effects 分离 |
| W6 | 页面**进场动画到处都是**，滑动/切换处处有位移 | D1 / D2 —— 动效要有语义；高频交互官方明确"generally avoid" |
| W7 | **装了动画/手势库但全项目 0 处引用**（旧端实测） | D9 / D10 —— 库解决的是"原生手势"与"UI 线程动画"，不引用则两个问题都没解 |
| W8 | 关键交互（下拉刷新、返回、长按、看图缩放）仍走 **JS 层手势** | D9 —— Gesture Handler 官方定位即"替代 RN 内置 responder 以解决其性能限制" |
| W9 | **Android 上照搬 iOS 毛玻璃**且未真机验证（旧端实测"从未生效"） | D11 —— Expo 官方明确 legacy 用法在 Android 只得到半透明背景 |
| W10 | 底部导航**超过 5 个**或出现 More tab；Tab 数量随页面变 | A7 / A8 —— M3 与 Apple 官方明文 |
| W11 | 把**动作**塞进底部 Tab（Tab 承担"发布"这类动作） | A10 —— Apple 官方"tab bar 支持导航，不提供动作"；**且注意 §3.1：这种做法本次未获任何官方背书** |
| W12 | Tab **没有文字标签**或标签是长句 | A9 —— M3 官方"1–2 词" |
| W13 | 有 Tab 的内容区同时放大面积**横滑组件** | A14 —— M3 官方明确 Avoid |
| W14 | **底部导航 + 抽屉同屏**、或一级导航里混两级 | A16 / A17 —— M3 官方两个 Avoid |
| W15 | 空态是**同一张插画**套所有场景，且 tagline 写成"点击这里发布吧" | E1 / E3 —— Carbon 要求分类；Material 官方明确禁止 CTA 式 tagline |
| W16 | 加载只有**空白 + 转圈**；网络回来才显示内容 | E8 / E20 —— Apple 要求"先给东西看"；web.dev 指出"等网络失败"是 frustrating UX |
| W17 | 错误只写"网络错误，请重试"，**不区分原因也不给下一步** | E14 —— GOV.UK 官方要求说清 + 可修复 |
| W18 | **无网时整屏不可用**（数据层没有本地 source of truth） | E19 —— Android 官方离线优先定义 |

### 8.3 `【本文推断】` 使用这份清单的方法建议

1. **先分级**：§8.1 的 A/B/D/E 组多数是**可自动检查**的（导航项数量、返回栈行为、色值是否硬编码、是否存在 reduced-motion 分支）；C 组需要人工看两态截图。
2. **每条判据都要留"依据版本"**：M3 已从 baseline 走到 M3 Expressive（`【官方公开资料】`「Baseline navigation bar is no longer recommended」）。**引用官方规范时必须带抓取日期**，否则半年后无法判断是规范变了还是我们做错了。
3. **冲突要显式记录，不要取交集**：本文已发现至少两组官方口径冲突——
   - Apple 官方反对应用内自建外观开关（§5.6），Discord 官方则提供五档主题 + 饱和度滑杆。
   - Apple 官方"tab bar 不承载动作"（§2.1），而"底部 Tab 中间放发布"是国内常见做法（§3.1，无官方背书）。
   本项目已定"双端并重、不追求 1:1"，**这两组冲突应当写进设计宪法作为"平台差异项"**，而不是统一成一条规则。

---

## 9. 来源清单（按取证等级）

### 9.1 官方公开资料（一手，已读到正文）

**平台设计规范**
- [Apple HIG – Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Apple HIG – Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG – Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple HIG – Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple HIG – Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Apple HIG – Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [Apple HIG – Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG – Searching](https://developer.apple.com/design/human-interface-guidelines/searching)
- [Apple HIG – Modality](https://developer.apple.com/design/human-interface-guidelines/modality)
- [Apple HIG – Loading](https://developer.apple.com/design/human-interface-guidelines/loading)
- [Apple HIG – Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [Apple HIG – Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Apple HIG – Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Apple HIG – Buttons（44×44pt 命中区）](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Apple HIG – Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material 3 – Cards](https://m3.material.io/components/cards/overview)
- [Material 3 – Navigation bar (Overview)](https://m3.material.io/components/navigation-bar/overview) / [(Guidelines)](https://m3.material.io/components/navigation-bar/guidelines)
- [Material 3 – FAB](https://m3.material.io/components/floating-action-button/overview) / [(Guidelines)](https://m3.material.io/components/floating-action-button/guidelines)
- [Material 3 – Tabs (Guidelines)](https://m3.material.io/components/tabs/guidelines)
- [Material 3 – Segmented buttons](https://m3.material.io/components/segmented-buttons/overview)
- [Material 3 – Navigation drawer (Guidelines)](https://m3.material.io/components/navigation-drawer/guidelines)
- [Material 3 – Search](https://m3.material.io/components/search/overview)
- [Material 3 – Progress indicators](https://m3.material.io/components/progress-indicators/overview) / [Loading indicator](https://m3.material.io/components/loading-indicator/overview)
- [Material 3 – Color roles](https://m3.material.io/styles/color/roles) / [Color system](https://m3.material.io/styles/color/system/overview)
- [Material 3 – Motion overview](https://m3.material.io/styles/motion/overview) / [Easing and duration](https://m3.material.io/styles/motion/easing-and-duration)
- [Material 2 – Dark theme](https://m2.material.io/design/color/dark-theme.html) / [Empty states](https://m2.material.io/design/communication/empty-states.html)
- [Material Blog – Building a Material Dark Theme on Android](https://m3.material.io/blog/android-dark-theme-tutorial)
- [Android – Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- [Android – Predictive back gesture](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)
- [Android – Multiple back stacks](https://developer.android.com/guide/navigation/backstack/multi-back-stacks) / [Deep links](https://developer.android.com/training/app-links)
- [Android – Save UI states](https://developer.android.com/topic/libraries/architecture/saving-states)
- [Android – Manage and present loading states (Paging)](https://developer.android.com/topic/libraries/architecture/paging/load-state)
- [Android – Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first)
- [Android – Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)
- [Android – Settings.Global](https://developer.android.com/reference/android/provider/Settings.Global)
- [Android – `Modifier.placeholder`](https://developer.android.com/reference/kotlin/androidx/wear/compose/material3/placeholder.composable)

**官方设计系统（非平台厂商）**
- [BBC GEL – Cards](https://www.bbc.co.uk/gel/guidelines/cards) / [Promos](https://www.bbc.co.uk/gel/features/promos) / [Typography](https://www.bbc.co.uk/gel/features/typography)
- [Carbon Design System – Empty states](https://carbondesignsystem.com/building-blocks/core/patterns/empty-states)
- [Atlassian Design System – Elevation](https://atlassian.design/foundations/elevation) / [Color](https://atlassian.design/foundations/color) / [Skeleton](https://atlassian.design/components/skeleton)
- [Adobe Spectrum – Background layers](https://spectrum.adobe.com/foundations/color/background-layers) / [Motion](https://spectrum.adobe.com/foundations/behavior/motion) / [Attention hierarchy](https://spectrum.adobe.com/foundations/attention-hierarchy)
- [GOV.UK Design System – Error message](https://design-system.service.gov.uk/components/error-message/) / [Recover from validation errors](https://design-system.service.gov.uk/patterns/validation/) / [There is a problem with the service pages](https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/)

**官方产品帮助中心 / 官方博客**
- [Discord – Appearance 设置](https://support.discord.com/hc/en-us/articles/207260127-How-to-Change-Discord-Color-Themes-and-Customize-Appearance-Settings) / [Compact text mode](https://support.discord.com/hc/en-us/articles/217047657-How-do-I-switch-to-compact-text-mode) / [Text Channels](https://support.discord.com/hc/en-us/articles/4412085582359-Text-Channels-Text-Chat-In-Voice-Channels) / [Conversation Summaries](https://support.discord.com/hc/en-us/articles/12926016807575-In-Channel-Conversation-Summaries) / [官方博客：Display settings](https://discord.com/blog/making-discord-on-desktop-look-just-right-display-settings-to-ease-the-eyes)
- [Reddit Help – What filters and sorts are available?](https://support.reddithelp.com/hc/en-us/articles/19695706914196-What-filters-and-sorts-are-available) / [官方博客：An Update on Reddit's Redesign](https://www.redditinc.com/blog/an-update-on-reddits-redesign)
- [Instagram – Instagram Ranking Explained](https://about.instagram.com/blog/announcements/instagram-ranking-explained) / [Designing a Constrained Exploration System](https://about.instagram.com/blog/engineering/designing-a-constrained-exploration-system)
- [YouTube Help – Post and interact with comments](https://support.google.com/youtube/answer/6000964)
- [微博客服 – 草稿箱](https://kefu.weibo.com/faqdetail?id=14150) / [发布失败原因](https://kefu.weibo.com/faqdetail?id=13790) / [新浪帮助 – 如何发布长微博](https://help.sina.com.cn/comquestiondetail/view/1461/)
- [小红书 RPDC 产品设计中心官网](https://rpdc.xiaohongshu.com/)
- [哔哩哔哩开放平台文档](https://open.bilibili.com/doc)
- [X – 官方开源推荐算法仓库说明](https://cdn.jsdelivr.net/gh/twitter/the-algorithm@main/README.md)

**Web 平台标准**
- [W3C – Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [web.dev – The offline cookbook](https://web.dev/articles/offline-cookbook) / [Offline data](https://web.dev/learn/pwa/offline-data)
- [MDN – prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)（**页面存在，本次仅取到导航骨架，正文未读到**）

**库/框架官方文档**
- [React Native – Using List Views（FlatList / SectionList）](https://reactnative.dev/docs/using-a-listview)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/)
- [Expo – BlurView（含 Android 支持与已知问题）](https://docs.expo.dev/versions/latest/sdk/blur-view/)

### 9.2 二手来源（仅作补充，**不得**当官方规格）

- [r/help – Sorting by "Best", "Top", "Hot", "Controversial"](https://www.reddit.com/r/help/comments/10wiph5/sorting_by_best_top_hot_controversial_what/)、[Options for 'Sorting Comments'](https://www.reddit.com/r/help/comments/1cg64sv/options_for_sorting_comments/)、[Is it possible to collapse a thread?](https://www.reddit.com/r/help/comments/12gnr8a/is_it_possible_to_collapse_a_thread/) —— Reddit **用户社区帖**，用于说明"官方文档（3 种排序）与客户端实际（5 种排序、折叠手势）不一致"，以及折叠语义的社区共识。
- `raintree-technology/hig-doctor`（Apple HIG 的第三方结构化镜像）：仅用于**定位** HIG 页面要点；本文所有 Apple 引文均已回原站核对，正文文字取自原站。

### 9.3 明确"未取得"的来源（本报告不据此下任何结论）

| 目标 | 结果 |
| --- | --- |
| X / Twitter 界面与时间线设计官方文档 | ❌ `blog.x.com/en_us/topics/product` 返回空正文；未找到官方 UI/密度规范。**本文不对 X 的界面取舍作任何断言。** |
| 小红书设计系统 / 组件规范 | ❌ RPDC 官网只有团队介绍与活动页；`fe.xiaohongshu.com`、`xiaohongshu.com/crown/help` 均 404；小程序开放平台需登录。**本文不对小红书信息流结构作任何断言。** |
| B 站 UI 规范 | ❌ 只有开放平台 API 文档与播放故障帮助页。**本文不对 B 站界面作任何断言。** |
| 微博信息流卡片规范 | ❌ 只有发布/草稿/失败流程帮助页。**本文只引用其发布流程。** |
| Material 3 `loading-data/*` 页 | ❌ 经代理返回空正文，未引用。 |
| Polaris（Shopify）色/层规范 | ❌ 代理返回空正文，未引用。 |
| Reddit 官方评论折叠文档 | ❌ 未找到官方文档，仅有社区共识。 |
| Apple 是否"不提供 FAB"的官方明文 | ❌ 未命中；§2.2 末条按 `【本文推断】` 处理。 |
| Android `ANIMATOR_DURATION_SCALE` 正文措辞 | ⚠️ 页面存在但本次只取到导航骨架；§6.3 相关条目按推断处理。 |

---

## 10. 证据最薄弱、需要人工复核的结论（诚实清单）

按"风险从高到低"排：

1. **「底部 Tab 中间放发布入口」没有任何官方规范背书（§3.1）。**
   风险最高，因为它是国内产品的普遍共识，很容易在提案里被写成"行业标准"。目前我只能证明 Apple 官方**反对**把动作放进 tab bar，以及 M3 把动作归 FAB/menus。**需要人工复核**：是否有国内平台（微博/小红书/B站）**官方**公开材料描述过自己的发布入口设计；本次全部未取得。

2. **Reddit 评论树的行为（折叠语义、5 种排序）只有社区证据（§4.1、§4.2）。**
   官方帮助中心只列 3 种排序、且不描述折叠。如果 Dorm 想引用"Reddit 的评论折叠模型"，必须标明这是社区共识。**需要人工复核**：Reddit 官方是否有开发者/设计文档描述 comment tree 交互。

3. **「Apple HIG 没有 FAB」是我的对照推断（§2.2）。**
   我没有拿到一句官方否定表述。**需要人工复核**：Apple HIG 组件索引中是否存在任何 Floating action button 条目。

4. **Apple HIG 四页（Lists and tables / Dark Mode / Motion / Tab bars）的定位过程借用了第三方镜像。**
   正文已回原站核对通过，但**如果后续要引用 HIG 的更细条目（如具体排版取值）**，仍应逐页重读原站。`developer.apple.com` 的 HIG 页面正文在本次抓取中**不稳定**（有的页返回完整正文，有的只返回导航骨架），这是这次取证的主要不确定性来源。

5. **`#121212`、`5%` / `8%` / `12%` / `16%` overlay、`gray-25` / `gray-75` 等数值全部带版本与厂商归属（§5.2、§5.3）。**
   它们分别来自 **M2**、**M2 博客**、**Spectrum 官方文本**，**不是**通用标准，**不能**直接搬成 Dorm 的令牌值。特别提醒：M3 已用 surface container 角色取代 M2 的 overlay 机制，**两套不要混用**。

6. **`ANIMATOR_DURATION_SCALE`（§6.3）与 `prefers-reduced-motion`（§6.3）本次都未读到正文。**
   "系统提供减弱动效开关、应用应当响应"这个**结论**有 Apple 官方一手的强支撑；但**Android 与 Web 的具体 API 措辞**需要人工复核后再写进设计宪法。

7. **`expo-blur` 的 Android 结论（§6.4）绑定 Expo 与 SDK 版本。**
   官方原文区分了 legacy 用法（Android 退化为半透明）与 SDK 55+（stable 但需改代码）。**如果新 App 不采用 Expo**，此条**不可**外推，需针对实际使用的模糊方案（`@react-native-community/blur`、原生 `RenderEffect`、`BackdropFilter` 等）单独取证并**真机验证**。

8. **Discord 的「一屏密度两档独立设置」（§1.2）是桌面端为主证的。**
   官方帮助页的 UI Density 描述里明确标注 "(and navigation spacing in the **desktop app**)"，移动端是否同构**未取证**。不要把它当成"移动端应有两档密度"的依据。

9. **`【本文推断】` 的 §8.2 全部 18 条"像网页"症状是我从 §8.1 反推的，不是任何官方文档的表述。**
   它们的价值在于**可检查**，但**引用时必须标为推断**；其中 W11（Tab 里放动作）和 W9（Android 毛玻璃）已在上面单独标注了复核需求。

10. **本文完全没有覆盖的领域**（调研范围外，提案时不要误以为已有依据）：
    - 排版细节（字号阶梯、字重、行高的具体取值）——只取到了 BBC GEL 的一套字阶与 Apple 的 44pt 命中区规则，**没有**取到任何移动端官方的"正文字号应为 N"的规定。
    - 图标体系、插画风格、品牌色生成算法。
    - 手势冲突仲裁、无障碍焦点顺序的具体实现。
    - 性能预算（帧率、首屏时间、包体积）——本次只在 Reanimated 官方看到"up to 120 fps"这类能力声明，**没有任何官方给出"App 应达到 N fps"的验收线**。
