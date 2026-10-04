# App 设计调研-02：Android 与 iOS 平台规范与「本机感」硬要求

**调研日期**：2026-09-30
**调研目标**：为「同一产品、Android 与 iOS 各自做到最优」提供可执行的平台规范依据，判定哪些是**平台强制**、哪些是**规范强建议**、哪些是**我们可自选**。
**服务对象**：`docs/05-Tasks/App设计阶段/`（App 设计宪法 → 脚手架 → 模块铺开）
**证据类型**：`m3.material.io` / `developer.android.com` / `developer.apple.com`（HIG、Documentation、Newsroom、News）/ `reactnative.dev` / `github.com/facebook/react-native` CHANGELOG 与 Issues API / npm registry / 官方库 README。
**信源标注约定**：`【官方公开资料】`＝官方文档原文；`【实测/观察】`＝本机实测或第三方仓库可核验状态；`【本文推断】`＝笔者据上述证据的推论；`【未能证实】`＝查不到一手来源，明确不采信。

> **时点说明（重要）**：本文所有结论以 **2026-09-30** 为基准。当天在线的关键版本为 **iOS 27.0.1 / iPadOS 27.0.1（iOS 27 于 2026-09-14 正式发布）**、**Android 16（API 36）为稳定版、Android 17（API 37）已进入行为变更文档**、**React Native 最新稳定版 0.87.1（2026-08-26），0.88.0-rc.3（2026-09-28）**。平台规范随版本变化，**年份与版本号是结论的一部分**，下文逐条标注。

---

## 0. 结论（先看这里）

1. **Android 侧已无「设计自由度」可谈的两件事：edge-to-edge 与预测式返回。** 自 target API 36（Android 16）起，`windowOptOutEdgeToEdgeEnforcement` **被弃用且禁用，无法退出 edge-to-edge**；同一 target 下预测式返回动画**默认开启**，且 `onBackPressed` / `KEYCODE_BACK` **不再被派发**。二者不是「建议」，是**平台上架强制的物理约束**。（[Android 16 行为变更](https://developer.android.com/about/versions/16/behavior-changes-16)）
2. **iOS 侧 Liquid Glass 的「可退出」是一张有效期到 iOS 27 SDK 的临时牌。** Apple 官方文档原文：`UIDesignRequiresCompatibility` 这个 Info.plist 键 **`The system ignores this key when you build for iOS 27 or later`**——即用 iOS 27 SDK 构建时该键被忽略。Apple 同时公告 **2026-04-28 起提交 App Store Connect 必须用 iOS 26 SDK 或更新构建**。合起来是一条清晰的时间线：**现在可选兼容模式，下一步（iOS 27 SDK 生效）就是必选新设计**。
3. **RN 生态在 Android 16 上有一个已核实的真实缺口：预测式返回与 `react-native-screens` 冲突。** RN 0.81 官方博客称「预测式返回已默认开启，[BackHandler](https://reactnative.dev/docs/backhandler) 对多数场景照常工作」；但社区在 `react-native-screens` 的 issue/discussion 中报告：开启预测式返回后 RN 收不到返回事件，**Android 判定应退出 Activity，App 直接关闭**。至今 `expo/expo#39092` 仍为 **open**。→ **这是 Android 首发必须排期验证的头号技术风险**，不是 UI 细节。
4. **两端最根本的冲突不在配色，在「返回」的语义与承载者。** Android 的返回是**系统级、可从屏幕任意左右边缘触发、有系统预览动画**的契约；iOS 的返回是**页面左上角按钮 + 边缘右滑手势**，且 iOS 的导航栈由 `UINavigationController` 的交互式转场承载。二者不能用同一套导航壳「凑合」——这正是旧版「1:1 复刻 Web UI」失败的机制性原因。
5. **「本机感」的最小充分条件（本文主张）**：**系统级返回契约 + 系统级滚动/转场动效 + 系统级材质 + 系统级字体字阶**。这四件事在两端**都由原生控件白送**，而 RN 自绘**必然打折**。因此 iOS 混原生代码应优先投在这四处；Android 侧则必须优先投在 insets 与返回栈正确性上。
6. **Liquid Glass 对 RN 不是「能不能用」，而是「值不值得自己做导航壳」。** `@callstack/liquid-glass@0.8.2`（2026-09-15）确实把 `glassEffect` 暴露给了 RN，但**它只能给自定义方块加玻璃底**，**不能把你的自绘 Tab Bar 变成 iOS 26 的原生 Tab Bar**。要拿到原生 Tab Bar（含 search tab 分离、滚动最小化、Liquid Glass 材质、转场），必须用原生 Tab 容器（`react-native-bottom-tabs` 或 expo-router native tabs）。

---

## A. Android（首发平台，重点）

### A1. Material 3 / Material 3 Expressive 当前状态

#### A1.1 定位：M3 Expressive 不是「M4」，是 M3 的一次能力扩展

【官方公开资料】Material Design 官方博客，**发布于 2025-05-13**，标题 *Start building with Material 3 Expressive*，原文明确：

> "M3 Expressive isn't a new version of the system. We're not deprecating M3, and this isn't 'M4'."

即 **M3 未被废弃，Expressive 是增量**。同页给出该版本的更新规模与研究方法：**14 个新增或更新的组件**、**35 个新增形状**、**46 项研究 / 逾 18,000 名参与者**。
来源：[m3.material.io/blog/building-with-m3-expressive](https://m3.material.io/blog/building-with-m3-expressive)（Published Time: 2025-05-13）

【官方公开资料】该博客给出的 7 条 Expressive 设计战术（原文编号）：① 使用多样形状；② 应用丰富而细腻的色彩；③ 用排版引导注意力；④ 用容器收束内容；⑤ 加入流动自然的动效；⑥ 利用组件灵活性；⑦ 组合以上战术制造 hero moment（并明确建议**一个产品只保留 1–2 个 hero moment**）。这是一份可直接落进设计宪法的清单。

#### A1.2 设计令牌体系（色彩 / 字阶 / 形状 / 间距 / 层级）

**令牌的分层结构**【官方公开资料】：Material 的令牌分**三类——reference（引用）、system（系统）、component（组件）**，命名以「用途」而非「外观」为准（示例：`md.comp.fab.primary.container.color`）；官方同时强调「用令牌而非硬编码值」。
来源：[m3.material.io/foundations/design-tokens/overview](https://m3.material.io/foundations/design-tokens/overview)
【本文推断】这条对我们直接有用：**Web 端已有 `frontend/src/styles/tokens.css`（265 个令牌）**，App 侧应建立**同一套语义命名**的三层令牌（reference→system→component），而不是把 Web 的 CSS 变量名直接搬过来。跨端要一致的是**令牌语义与命名**，不必一致的是**每层的具体值**（两端色彩角色可用同一套品牌色，但 neutral surface 的 tonal 取值应各按平台算）。

**形状 / 圆角比例**【官方公开资料】：M3 shape system 采用**十级 corner radius scale**，原文逐级数值：

| 级别 | 圆角 |
|---|---|
| None | 0dp |
| Extra small | 4dp |
| Small | 8dp |
| Medium | 12dp |
| Large | 16dp |
| Large increased | 20dp |
| Extra large | 28dp |
| Extra large increased | 32dp |
| Extra extra large | 48dp |
| Full | 完全圆角 |

同页并给出 M2→M3 的演进描述：M2 是「三级、按组件容器尺寸」的尺度，M3 是「十级、按圆角程度」的尺度（M3 新增 shape morphing）。
来源：[m3.material.io/styles/shape/corner-radius-scale](https://m3.material.io/styles/shape/corner-radius-scale)

**层级（elevation）**【官方公开资料】：M3 的关键转变是**用色调表面（tonal surface）替代默认阴影**——原文："M3: Using color instead of shadows to communicate elevation"、"Shadows: Instead of applying shadows by default to all levels, use shadows only when required"；官方同时说明 **「令牌本身不含阴影或颜色；每个平台自行决定各层级的具体阴影与数值」**，并建议**只用少量 elevation 层级**。
来源：[m3.material.io/styles/elevation/overview](https://m3.material.io/styles/elevation/overview)
【本文推断】这条是旧 App「玻璃/模糊在 Android 从未生效」的**根因级解释**：旧路线在 Android 上照搬了 iOS 的「模糊分层」，而 **Android 的 M3 正统做法是 tonal surface 抬升 + 极少量阴影**。两端「层级」的正确实现手段**本来就不同**，跨端一致应该一致的是「谁比谁高」的语义，而不是「都用高斯模糊」。

**色彩角色**【官方公开资料】`m3.material.io/styles/color/roles` 提供完整的角色清单（primary / on-primary / primary-container … 及 surface 系列）。
来源：[m3.material.io/styles/color/roles](https://m3.material.io/styles/color/roles)
> ⚠️ **本文不复制任何具体 token 数值或色值**。官方角色数值随主题与动态取色（dynamic color）变化，且必须通过 Material Theme Builder / `material-tokens` 仓库生成。**请勿据本文写死色值**；需要数值请从 [material-foundation/material-tokens](https://github.com/material-foundation/material-tokens) 与 [Material Theme Builder](https://goo.gle/material-theme-builder-figma) 生成。这符合本次调研「不编造官方 token 数值」的硬要求。

**断点 / 尺寸类别（间距与自适应的事实依据）**【官方公开资料】：Material 已把 **window size classes 改称 breakpoints**，并从三档扩展为**五档**（原文措辞："previously window size classes"）：

| Breakpoint | 宽度 (dp) | 典型设备 |
|---|---|---|
| Compact | < 600dp | 手机竖屏 |
| Medium | 600–839dp | 平板竖屏；折叠屏展开竖屏 |
| Expanded | 840–1199dp | 手机横屏；平板横屏；折叠屏展开横屏；桌面 |
| Large | 1200–1599dp | 桌面 |
| Extra-large | 1600dp+ | 桌面；超宽显示器 |

同页给出各断点的**页面窗格数与导航形态**建议：Compact → 1 窗格 + navigation bar；Medium → 1（推荐）或 2 窗格 + navigation bar 或 modal expanded navigation rail；Expanded/Large → 1 或 2（推荐）窗格 + modal/standard expanded navigation rail；Extra-large → 1–3（推荐）窗格。并给出跨断点的五种适配手段：**reveal / divide / resize / reposition / swap**。行宽建议：**40–60 字符/行**。
来源：[m3.material.io/foundations/layout/applying-layout/window-size-classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)

#### A1.3 Expressive 新增能力（动效物理、形状变形、灵活排版、新组件）

**动效物理（motion physics）——取代旧 easing+duration 体系**【官方公开资料】：
- 引入时间：**2025 年 5 月**，随 M3 Expressive 引入，原文 "Material introduced the **motion physics system** with M3 Expressive"，并明确 "The physics system is **replacing** the previous system based on easing and duration"。
- 两套预设 motion scheme：**expressive**（会过冲以产生弹跳，适用于 hero moment 与关键交互）与 **standard**（几乎无弹跳，适用于工具型产品）。
- **实现可用性（官方表格原文）**：Jetpack Compose —— **Available**（API 为 `androidx.compose.material3.MotionScheme`）；Android Views (MDC-Android) —— **Available, Not added to components**；**Flutter —— Unavailable**；Web —— Compatible with Compose springs。

来源：[m3.material.io/styles/motion/overview/how-it-works](https://m3.material.io/styles/motion/overview/how-it-works) 与 [Motion overview](https://m3.material.io/styles/motion/overview)
【本文推断，关键风险】官方表格里 **Flutter 标为 Unavailable**，而 **React Native 在官方表格中根本没有条目**。也就是说：**M3 的 motion physics 没有任何官方 RN 实现**。在 RN 上要「像 Android 一样动」，只能用 `react-native-reanimated` 的 spring 参数**近似模拟** `MotionScheme` 的观感，这**不可能与 Compose 原生应用逐帧一致**。这应写进设计宪法的「已知不可达项」，避免又一轮「照搬即失败」。→ 标注【未能证实】的部分：官方未给出 expressive / standard 两套 spring 的公开数值（stiffness/damping），因此**不要编造 spring 常量**，需以真机对照调参。

**形状变形（shape morph）**【官方公开资料】：M3 Expressive 提供 **35 个形状**，并有**内建 shape-morph 动画**（原文："A built-in shape-morph animation allows smooth transitions from one shape to another"）。
来源：[m3.material.io/blog/building-with-m3-expressive](https://m3.material.io/blog/building-with-m3-expressive)

**灵活 / 强调排版（flexible & emphasized typography）**【官方公开资料】：新增**强调字阶（emphasized text styles）**，支持可变字体与静态字体，用于强化信息层级（原文举例：「开始录音」这类动作、未读消息这类信息）。
来源：同上博客；[m3.material.io/styles/typography/overview](https://m3.material.io/styles/typography/overview)

**组件**【官方公开资料】：**14 个新增/更新组件**，包含更丰富的配置能力、形状选项与强调文字。博客正文点名的有 **app bars、toolbars、buttons**；组件清单与逐项规格见官方 components 区。
来源：[m3.material.io/blog/building-with-m3-expressive](https://m3.material.io/blog/building-with-m3-expressive)
> ⚠️ **诚实标注**：本任务要求覆盖 toolbar / split button / loading indicator 等具体新组件。官方博客正文**未逐一列出这 14 个组件的名字**。本文因此**不逐项断言**其规格与存在性——请在设计阶段直接以 [m3.material.io/components](https://m3.material.io/components) 组件区逐页核对。**本文不编造组件 API 或规格。**

#### A1.4 Navigation bar 的硬建议（直接决定我们的底部 Tab）

【官方公开资料】M3 Navigation bar guidelines 原文要点：
- **「Navigation bars provide access to three to five destinations.」**——**3 到 5 个**。
- **「For products with more than five navigation items, don't use a navigation bar」**；超过 5 个应改用 tabs 或 **modal expanded navigation rail**。
- **「Don't use a navigation bar for fewer than three destinations. Instead, use tabs.」**——**少于 3 个也不要用它**。
- **标签必须有**：**「Don't remove the labels from navigation items」**；标签 **1–2 个词**；禁止为塞下文字而缩小字号或截断。
- 激活态图标用 **filled**，非激活用 **outlined**；**激活/非激活图标与容器的对比度均需 ≥ 3:1**。
- **禁止在目的地之间滑动切换**（"Don't swipe between destinations"）——滑动应留给卡片轮播、归档等操作。
- **选中已在当前的目的地时，应滚动到页面顶部**。
- **屏幕阅读器激活时不得在滚动中隐藏导航栏**。
- 自适应：**仅在 Compact 与 Medium 断点使用 navigation bar**；**Expanded 及 Extra-large 改用 navigation rail**。Compact 用垂直项（图标在上文字在下），Medium 用水平项（图标与文字并排于指示器内）。FAB 应右对齐**浮在 navigation bar 之上**，不得与导航栏重叠。

来源：[m3.material.io/components/navigation-bar/guidelines](https://m3.material.io/components/navigation-bar/guidelines)
【本文推断，对我们的直接约束】「校园小红书 + 食堂点评 + 二手 + 课表」天然想做 5–7 个入口。M3 在此处**没有让步空间**（3–5 硬区间、标签不可省、不可滑动切换）。**Android 首发的底部 Tab 必须压到 ≤5**，超出的入口应下沉为页面内 tabs 或「更多」；且**平板/折叠屏上不能沿用底部栏，要切成 navigation rail**。

---

### A2. Android 平台演进带来的强制要求

#### A2.1 edge-to-edge 强制 —— 版本、target API 关系、退出开关的死线

【官方公开资料】Android 官方 edge-to-edge 文档原文：

> "Once you target SDK 35 or higher on a device running Android 15 or higher, your app is displayed **edge-to-edge**. The window spans the entire width and height of the display by drawing behind the system bars."

并说明 target SDK 35+ 时**自动启用**；对更早 Android 版本需手动调用 `WindowCompat.enableEdgeToEdge(window)`。默认行为：**系统栏透明**，但**三键导航模式下导航栏会获得半透明 scrim**；系统图标与 scrim 颜色随系统明暗主题调整。
来源：[developer.android.com/develop/ui/views/layout/edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)

【官方公开资料】**退出开关的死线（Android 16 行为变更）**，原文逐条：

> - "Android 15 enforced edge-to-edge for apps targeting Android 15 (API level 35), but your app could opt-out by setting `R.attr#windowOptOutEdgeToEdgeEnforcement` to `true`."
> - "For apps targeting **Android 16 (API level 36)**, `R.attr#windowOptOutEdgeToEdgeEnforcement` is **deprecated and disabled**, and your app **can't opt-out** of going edge-to-edge."
> - "If your app targets Android 16 (API level 36) and is running on an Android 15 device, `R.attr#windowOptOutEdgeToEdgeEnforcement` continues to work."
> - "If your app targets Android 16 (API level 36) and is running on an **Android 16 device**, `R.attr#windowOptOutEdgeToEdgeEnforcement` is **disabled**."

来源：[developer.android.com/about/versions/16/behavior-changes-16](https://developer.android.com/about/versions/16/behavior-changes-16)

【官方公开资料】**target API 的商业死线**：自 **2026-08-31** 起，**新应用与更新必须 target Android 16（API 36）或更高**才能在 Google Play 提交（Wear OS / Automotive 例外为 API 35，TV / XR 例外为 API 34）；既有应用须 target API 35+ 才能对新用户保持可见。
来源：[developer.android.com/google/play/requirements/target-sdk](https://developer.android.com/google/play/requirements/target-sdk)
【本文推断】该日期（2026-08-31）在本文写作时**已经过去**。因此对「从零重做、要上架」的我们：**target 36 不是选择项，是入场券**；而 target 36 ⇒ **edge-to-edge 不可退出 + 预测式返回默认开启**。二者必须在脚手架阶段就当作**既定事实**，不是后期适配项。

#### A2.2 三类 insets：必须分别处理的三种「遮挡」

【官方公开资料】官方把 edge-to-edge 相关的 insets 明确分为三类，用途不同：

| 类型 | 官方描述 | 适用场景 |
|---|---|---|
| **System bars insets** | 系统 UI 在 Z 轴上方显示的区域 | 可点击、且**不得被系统栏视觉遮挡**的视图（官方示例：被导航栏遮住的 FAB） |
| **Display cutout insets** | 因设备形状产生挖孔的区域 | 侧边挖孔（横屏时挖孔可能位于垂直边缘）；官方强调**默认情况下应用会绘制进挖孔**，需自行 padding |
| **System gesture insets** | 系统手势**优先于**应用的手势区域 | 需把**可滑动视图**移离边缘：官方点名 **bottom sheets、游戏滑动手势、ViewPager2 轮播** |

官方 API：`WindowInsetsCompat.Type.systemBars()` / `.displayCutout()` / `.systemGestures()`（可逻辑或组合），通过 `ViewCompat.setOnApplyWindowInsetsListener` + `WindowInsetsCompat.CONSUMED` 消费。列表场景官方建议 `android:clipToPadding="false"` 让内容滚动时进入系统栏后方。
来源：[developer.android.com/develop/ui/views/layout/edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
【本文推断，最高优先级落地项】对我们这个产品，**system gesture insets 是真正的雷区**：校园社区类产品到处是横向滑动（图片轮播、Tab 切换、卡片左右滑、二手商品图集）。**任何从屏幕左右边缘起手的横滑，都会与 Android 的返回手势正面冲突**，且这是系统优先的，应用抢不到。官方已点名 bottom sheet / ViewPager2 / carousel 需避让——我们必须在设计稿上就画出**边缘禁滑区**。

#### A2.3 预测式返回（predictive back）：启用条件与 target 36 的强制行为

【官方公开资料】**target 36 的强制行为**（原文）：

> "For apps targeting Android 16 (API level 36) or higher and running on an Android 16 or higher device, the predictive back system animations (back-to-home, cross-task, and cross-activity) are **enabled by default**. Additionally, **`onBackPressed` is not called and `KeyEvent.KEYCODE_BACK` is not dispatched anymore**."

若应用拦截了返回且未迁移，官方给出的两条路：**迁移到受支持的返回 API**，或**临时**在 `<application>` 或 `<activity>` 上设 `android:enableOnBackInvokedCallback="false"` 退出。
来源：[developer.android.com/about/versions/16/behavior-changes-16](https://developer.android.com/about/versions/16/behavior-changes-16)

【官方公开资料】**迁移路径**（[预测式返回指南](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)）：
- 需要 **AndroidX Activity 1.6.0+** 的 `OnBackPressedCallback` / `OnBackPressedDispatcher`，或平台 `OnBackInvokedCallback`；Compose 另有 `PredictiveBackHandler`（需 `androidx.activity:activity-compose:1.8.0+`）。
- 必须**停止**用 `onBackPressed()` / `KeyEvent.KEYCODE_BACK` 拦截。
- **Android 15 起开发者选项里的预测式返回开关已移除**；系统动画（back-to-home / cross-task / cross-activity）对已选择性加入的应用直接生效。
- 退出方式：`android:enableOnBackInvokedCallback="false"`，可设在 application 或单个 activity 级。

【官方公开资料】**Android 16 把预测式返回扩展到三键导航**：长按返回键会触发预测式返回动画预览。
来源：[developer.android.com/about/versions/16/behavior-changes-all](https://developer.android.com/about/versions/16/behavior-changes-all)

#### A2.4 RN 在预测式返回上的真实状态 —— 本条是本文最重要的风险发现

【官方公开资料】React Native 0.81 官方博客（**2025-08-12**）原文：

> "Android apps built with React Native 0.81 will now **default to targeting Android 16 (API level 36)**."
> "**Predictive back gesture** is now **enabled by default** for apps targeting Android 16. The **BackHandler API should continue to work as before for most use cases**. However, if your app relies on **custom native code for back handling** (such as overriding the `onBackPressed()` method), you may need to manually migrate your code or temporarily opt-out. **Please test your app's back navigation thoroughly after upgrading.**"

同页：RN 0.81 **弃用内置 `<SafeAreaView>`**（理由：**仅 iOS 支持**、**与 Android edge-to-edge 不兼容**、除 padding 外不可定制），推荐改用 `react-native-safe-area-context`；并**新增 gradle 属性 `edgeToEdgeEnabled`**，用于在 Android 16 以下版本选择是否启用 edge-to-edge。
来源：[reactnative.dev/blog/2025/08/12/react-native-0.81](https://reactnative.dev/blog/2025/08/12/react-native-0.81)

【实测/观察】**但社区在真实设备上报告了相反的结果**（属第三方来源，非官方文档，故单列）：
- `software-mansion/react-native-screens` **Discussion #2540「Predictive back gesture support on Android」** 中，维护者早前表示曾研究 `react/react-native#34529` 但「话题死了」，并指出在 Fragment 层做预测式返回需要 FragmentManager 返回栈，「**highly likely this won't be ever done in react native screens v4**」。
- 同讨论后续（2025-10-06）有开发者报告 **Android 16 上按返回键直接退出 App**，并给出机制解释：*"Android 16 no longer calls `onBackPressed()` or dispatches `KEYCODE_BACK` for apps targeting API level 36+. React Native still depends on these legacy callbacks (…→ JS BackHandler). As a result, when predictive back is active, **React Native never receives the back event, and Android assumes the activity should exit — causing the app to close**."* 该评论获 23 个赞。
- 同讨论中另一条报告：「confirmed it's not happening with `android:enableOnBackInvokedCallback="false"`」——即**关掉预测式返回可规避**。
来源：[github.com/software-mansion/react-native-screens/discussions/2540](https://github.com/software-mansion/react-native-screens/discussions/2540)

【实测/观察】`expo/expo` **Issue #39092**「[SDK 54] Back navigation with gesture does not work on Android with Expo Router when the predictive back gesture is enabled」：**created 2025-08-23，updated 2026-08-11，state = open，comments = 15**；标签为 `Issue accepted`、`📦 expo-router`、**`Upstream: React Native Screens`**、`contributor: external`（经 GitHub API 核对）。
来源：[github.com/expo/expo/issues/39092](https://github.com/expo/expo/issues/39092)

【实测/观察】`facebook/react-native` **Issue #34529**「Are there any plans to replace unsupported APIs (KEYCODE_BACK and #onBackPressed) to support Android's new Predictive back gesture?」：**created 2022-08-30，updated 2025-10-21，state = closed，labels 含 `Stale`, `Platform: Android`**（经 GitHub API 核对）。
来源：[github.com/facebook/react-native/issues/34529](https://github.com/facebook/react-native/issues/34529)

【本文推断，必须写进风险清单】
1. **官方口径（"BackHandler 对多数场景照常工作"）与社区实测（target 36 上返回即退 App）不一致**，且不一致点恰好落在**我们必然使用的导航库**（React Navigation 的 native-stack 建立在 `react-native-screens` 之上）上。
2. 这是**P0 级风险**：它不是「不够好看」，而是**核心导航不可用**（用户按返回直接退出 App）。
3. 可行动的兜底：**保留 `android:enableOnBackInvokedCallback="false"` 作为已知逃生舱**（官方支持、社区验证有效），但需注意它只是「临时退出」，且是在「屏幕右滑无系统预览动画」的代价下换取返回栈正确——**本机感有损**。
4. **必须在脚手架第一周做真机 spike**：RN 0.87 / React Navigation 7.20 / react-native-screens 4.28 + target 36 + Android 16 真机，验证「返回是否退 App」，再决定是否投入自研预测式返回桥接。**不要等到功能做完才发现。**

#### A2.5 系统栏适配与手势导航冲突区（含 RN 侧工具链）

【官方公开资料】`react-native-safe-area-context` 是 RN 官方向导推荐的 SafeAreaView 替代方案（见 A2.4 的 RN 0.81 原文「many apps have opted for more portable and flexible solutions, such as `react-native-safe-area-context`」）。
工具链版本【实测/观察，npm registry 查询】：`react-native-safe-area-context` 由 `th3rdwave` 维护；`react-native-screens` 最新 **4.28.0（2026-09-14）**；`@react-navigation/native-stack` **7.20.0（2026-09-29）**；`@react-navigation/bottom-tabs` **7.20.0（2026-09-29）**。

【官方公开资料】React Navigation 7 native-stack 文档中，Android 的 `statusBarTranslucent` / `navigationBarTranslucent` 一类选项已被标注弃用，理由原文：**"for apps targeting Android SDK 35 or above edge-to-edge mode is enabled by default and it is expected that the edge-to-edge will be enforced in future SDKs"**。文档同时注明 **`headerLargeTitle` / 大标题语义是 iOS 侧能力**，Android 是另一种表现。
来源：[reactnavigation.org/docs/7.x/native-stack-navigator](https://reactnavigation.org/docs/7.x/native-stack-navigator)

【本文推断】RN 侧的 `Translucent` 类配置**正在被平台强制淘汰**，因此**不要在 RN 层试图「配置」系统栏透明度**——正确做法是接受 edge-to-edge，然后用 insets 做内边距。这也是「旧 App Android 模糊不生效」之外的第二类「照搬失效」：把 iOS 的「半透明系统栏」当成可配置项搬到 Android，而 Android 已把这件事变成不可配置的既定布局前提。

---

### A3. 大屏 / 折叠屏 / 平板自适应

【官方公开资料】断点表见 A1.2（Compact <600 / Medium 600–839 / Expanded 840–1199 / Large 1200–1599 / Extra-large 1600+ dp），来源 [M3 window size classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)。Android 官方另有 [use-window-size-classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes) 与 [adaptive-layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/adaptive-layouts) 提供 Compose 实现路径。

【官方公开资料】**Android 16 的大屏强制变化（target 36）**，原文：

> "For apps targeting Android 16 (API level 36), **orientation, resizability, and aspect ratio restrictions no longer apply on displays with smallest width >= 600dp**. Apps fill the entire display window, regardless of aspect ratio or a user's preferred orientation, and **pillarboxing isn't used**."

未准备好的应用可**临时**通过 manifest 属性 `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` 退出（可 activity 级或 application 级），回到兼容模式。
来源：[developer.android.com/about/versions/16/behavior-changes-16](https://developer.android.com/about/versions/16/behavior-changes-16)

【官方公开资料】**这个「临时退出」在 Android 17 也没了**，原文：

> "We introduced Platform API changes in Android 16 to ignore orientation, aspect ratio, and resizability restrictions on large screens (sw >= 600dp) for apps targeting API level 36 or higher. Developers have the option to opt out of these changes with SDK 36, but **this opt-out will no longer be available for apps that target Android 17 (API level 37) or higher**."

来源：[developer.android.com/about/versions/17/behavior-changes-17](https://developer.android.com/about/versions/17/behavior-changes-17)（该页明确 **Android 17 = API level 37**）
【本文推断】「锁竖屏」这个学生项目里最容易被当作省事手段的选项，**在 target 36 的大屏上已经失效、在 target 37 上彻底失效**。我们的课表、二手商品图集、食堂点评都需要**真可缩放/可旋转**的布局，这不是加分项。**建议把「可旋转 + sw≥600dp 单/双窗格自适应」直接列为首发范围**，避免未来一次全量返工。

---

### A4. Android 与「iOS 式」设计的冲突点

| 维度 | Android（官方依据） | iOS（官方依据） | 冲突实质 |
|---|---|---|---|
| **底部导航项数** | **3–5 项**，>5 禁用 navigation bar，<3 也不用；**标签必须保留**；**禁止滑动切换目的地**（[M3 nav bar guidelines](https://m3.material.io/components/navigation-bar/guidelines)） | 「keep in mind that it's generally easier to navigate among **fewer** tabs」；**避免 overflow**（溢出会产生 More 标签）；若允许用户自定义，**默认不超过五个**；**不要禁用或隐藏 tab 按钮**（[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)） | Android 有**硬区间 3–5**；iOS 是**倾向更少 + 容量溢出机制**。→ **不能共用一套「Tab 数量」策略**；但**上限 5** 是两端都能接受的安全交集。 |
| **返回语义** | **系统级契约**：系统返回手势/按键、预测式返回预览动画（back-to-home / cross-task / cross-activity）；target 36 下 `onBackPressed`/`KEYCODE_BACK` 不再派发；**可从屏幕左右边缘触发**（[A16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)、[predictive back guide](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)） | **页面左上角返回按钮 + 右滑交互式转场**，由导航控制器承载（[HIG Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search)） | **Android 的返回不属于页面，属于系统**。页面左上角放返回箭头在 Android 上是「多余的第二入口」；反过来，把返回只交给左上角按钮在 Android 上会让用户按系统返回时**直接退出 App**。这是两端**必须各按各的**的第一硬项。 |
| **导航栈承载者** | 系统返回栈 + Activity/Fragment 返回栈（RN 侧由 `react-native-screens` 桥接，见 A2.4 风险） | `UINavigationController` / SwiftUI `NavigationStack` 的交互式转场 | 栈的**所有权**不同。跨端可共享「路由表/信息架构」，**不可共享「导航壳」**（见 C 判据表）。 |
| **弹层（bottom sheet / modal）** | bottom sheet 属可滑动视图，必须避开 **system gesture insets**（官方点名，[edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)）；React Navigation 7 的 `sheetAllowedDetents` 在 **Android 最多 3 档** | sheets 有 detents（medium/large），iOS 26 起**半屏内缩、全高时转为更不透明**以聚焦任务（[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)、[HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)） | 弹层**物理行为不同**：Android 要躲手势区且档位受限；iOS 有内缩与材质变化。→ 弹层应**各端原生实现**。 |
| **触感反馈** | 三档原生实现：`View.performHapticFeedback()` + `HapticFeedbackConstants`（**无需 VIBRATE 权限**，常量自带 fallback）；预定义 `VibrationEffect`（`areEffectsSupported` 判断是否有定制实现，否则平台 fallback）；**Android 16 (26Q4) 起** `VibrationEffect.Builder` 支持时间轴组合、内建跨元素自动 fallback。官方点名语义：`CONFIRM` 轻短、`REJECT` 更强。**官方明确不鼓励**用老的 `createOneshot`/`createWaveform`（"often too loud for regular haptic feedback"）。来源：[developer.android.com/develop/ui/views/haptics/haptic-feedback](https://developer.android.com/develop/ui/views/haptics/haptic-feedback) | `UIFeedbackGenerator` 三类预定义模式：**notification / impact / selection**；同时标定 Apple 的语义（notification 表示任务结果；selection 表示取值变化）；并强调**系统控件本身已自动播报触感**。来源：[HIG Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) | 两端**都没有给对方等价物的保证**：iOS 的 impact/selection 在 Android 无 1:1 对应，反之亦然。→ 触感应定义**语义层**（成功/失败/选择变化/到达边界）并在两端**各自映射到本机常量**，而不是跨端复用同一组强度数字。 |
| **字体与字重渲染** | target 35 起 `elegantTextHeight` 默认 `true`（替换紧凑字体、更易读）；**Android 16 弃用 `elegantTextHeight`，target 36 时该属性被忽略**——「UI fonts」被停用，官方要求**为阿拉伯语、老挝语、缅甸语、泰米尔语、古吉拉特语、卡纳达语、马拉雅拉姆语、奥里亚语、泰卢固语、泰语调整布局**以保证一致且面向未来的文本渲染。来源：[A16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16) | 系统字体 **SF Pro**；`Dynamic Type` 是**系统级文本尺寸设置**；官方规格给了各字阶的**点值/行高/强调字重**（如 iOS 默认 Body 17pt、最低 11pt）；并使用**系统文字样式（text styles）**以获得 Dynamic Type 支持。来源：[HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | 这是**「双端各自最优」最容易被忽视的一条**：Android 的字高/字体度量在 target 35→36 之间**已经变过一次**，且是可被应用覆写的属性；iOS 则靠**系统文字样式 + Dynamic Type** 自动缩放。→ **两端不应共用同一套「绝对 pt 值」字阶常量**。 |

【实测/观察，RN 侧补充】RN CHANGELOG 中与两端字体/返回差异直接相关、且**已修复但值得知情**的条目：
- **v0.84.0**：「**BackHandler**: Fix BackHandler callbacks not working after app resume **on API 36+**」——说明 **API 36 上的 BackHandler 确实曾有问题**，与 A2.4 的社区报告相互印证。
- **New Architecture**：「**Font**: Custom fonts with an explicit `fontWeight` no longer render at the heaviest weight on the New Architecture」（新架构下修复）；「**Font**: Add support for condensed system font when using the New Architecture」。
- **v0.86.0**（多条 edge-to-edge 修正）：「Handle edge-to-edge when it's not enabled by the `edgeToEdgeEnabled` gradle property **but enforced by the OS (Android 15+)**」；「Fix `KeyboardAvoidingView` on Android 15+ / with `edgeToEdgeEnabled`」；「Fix `measureInWindow` returning incorrect coordinates when edge-to-edge is enabled」；「Fix `Dimensions` `window` values on Android < 15 when edge-to-edge is enabled」。
来源：[facebook/react-native CHANGELOG.md](https://raw.githubusercontent.com/facebook/react-native/main/CHANGELOG.md)
【本文推断】v0.86.0 这批修正**证明「edge-to-edge 被 OS 强制」这一路径在 RN 上是相对新的、且曾有多处坐标/键盘/尺寸错误**。→ **固定一个 RN 版本并锁住，不要跨大版本随意升级**；且这些条目说明**屏幕坐标与安全区在 Android 上必须真机验证**，模拟器不足以暴露。

---

## B. iOS

### B5. Apple HIG 当前要点

#### B5.1 导航模型

【官方公开资料】HIG 的导航与搜索页给出导航模型分类（hierarchical / flat / content-driven 等），并主张按内容结构选择模型，而非按端「统一样式」。来源：[HIG Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search)
【官方公开资料】iOS 26 世代补充的导航要求（原文要点）："Establish a clear navigation hierarchy"——**导航元素必须与内容层明确分离**；tab bars 与 sidebars **浮在 Liquid Glass 层**；可**让 tab bar 依上下文自动适配成 sidebar**；iOS 可选择**滚动时自动最小化 tab bar**（`TabBarMinimizeBehavior` / `UITabBarController.MinimizeBehavior`）。来源：[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)、[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

【官方公开资料】**Tab bar 的 iOS 专属形态**（iOS 26 起）：tab bar **浮在内容之上**，item 落在 **Liquid Glass** 背景上、允许下方内容透出；可含**位于末端的专用 search tab**（系统会把它与其他 tab 自动分离并置于尾部）；iPadOS 上 tab bar 出现在**屏幕靠近顶部**，可表现为固定元素或带「转换为 sidebar」按钮。来源：[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) 与 [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)

#### B5.2 Sheet detents

【官方公开资料】Sheets 提供 detents；iOS 26 起 **sheet 圆角增大**、**半屏 sheet 从屏幕边缘内缩**以让下方内容透出、**展开到全高时转为更不透明的外观**以维持任务聚焦。来源：[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass) 与 [HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
【实测/观察】RN 侧对应能力：React Navigation 7 native-stack 的 `sheetAllowedDetents` 支持 `'fitToContents'` 或递增分数数组，**并明确「Android is limited to 3 detents」**；`sheetElevation` 默认 **24**（**Android only**）；文档另列有 iOS/Android 各自的限制条目。来源：[reactnavigation.org/docs/7.x/native-stack-navigator](https://reactnavigation.org/docs/7.x/native-stack-navigator)

#### B5.3 安全区（safe area）

【官方公开资料】HIG Layout（**change log 显示 2026-09-09 更新**）定义：**layout guide** 是帮助定位/对齐/间距的矩形区域；**safe area** 是「窗口内未被硬件特性或窗口内其他视图（如 toolbar、tab bar、status bar）覆盖的区域」，并明确「**Respecting the safe area is essential** to make sure system UI and hardware features like the Dynamic Island don't obstruct content and controls」。开发者 API：SwiftUI `SafeAreaRegions`、UIKit `Positioning content relative to the safe area` / `UILayoutGuide`。
来源：[HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

#### B5.4 触控目标最小尺寸

【官方公开资料】HIG Accessibility 给出**逐平台的最小触控目标表**（原文表格节选）：

| Platform | Default size | Minimum size |
|---|---|---|
| **iOS, iPadOS** | **44x44 pt** | **28x28 pt** |
| macOS | 28x28 pt | 20x20 pt |
| tvOS | 66x66 pt | 56x56 pt |
| visionOS | 60x60 pt | 28x28 pt |
| watchOS | 44x44 pt | 28x28 pt |

来源：[HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
【对照 Android，官方公开资料】Android 官方无障碍文档原文：**"For touch interfaces, we recommend that each interactive UI element have a focusable area, or touch target size, of at least 48dpx48dp. Larger is even better."** 并补充：精确输入设备（鼠标/触控板）可更小；Compose 的 `Button`/`IconButton`/`ListItem` 已内建该最小值，**自定义交互元素需自行设置**（`Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)`）。来源：[developer.android.com/guide/topics/ui/accessibility/apps](https://developer.android.com/guide/topics/ui/accessibility/apps)
【本文推断】**44pt（iOS 推荐）与 48dp（Android 推荐）不是同一个数**，且 iOS 的「最小 28pt」是**容错下限而非设计目标**。→ 设计稿应**双标注**（例如「≥48dp / ≥44pt」），或在密集列表动作（点赞、更多）上**用 Android 48dp 定尺寸、iOS 用 44pt**。**不要**用「一个数字走两端」。

#### B5.5 Dynamic Type 与 VoiceOver

【官方公开资料】**Dynamic Type**：系统级特性，让人可调整可见文本尺寸。官方要求：
- **支持更大字号**：理想情况下允许放大**至少 200%**（watchOS 为 140%）。
- **iOS/iPadOS 自定义字号的默认/最小值：默认 17 pt、最小 11 pt。**
- 官方提供了**逐字阶的 Dynamic Type 规格表**（含 size、leading、emphasized weight），**change log 记载 2025-12-16「Added emphasized weights to the Dynamic Type style specifications for each platform」**。
- 用**内置文字样式**可自动获得 Dynamic Type 与更大无障碍字号支持；自定义字体**必须自行实现同等行为**。
- **随字号增大图标也要增大**（用 SF Symbols 可自动随 Dynamic Type 缩放）。
- **大字号下考虑调整布局**：改为上下堆叠、减少列数，避免截断/重叠；可用 `isAccessibilityCategory` 判断。
来源：[HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

【官方公开资料】**对比度（WCAG Level AA 作为参照，Accessibility Inspector 采用）**：

| Text size | Text weight | Minimum contrast ratio |
|---|---|---|
| Up to 17 pts | All | **4.5:1** |
| 18 pts | All | **3:1** |
| All | Bold | **3:1** |

并要求：若无默认达标，至少应在系统开启 **Increase Contrast** 时提供高对比配色；支持暗色模式时**明暗两种外观都要检查**。
来源：[HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
【对照 Android，官方公开资料】M3 navigation bar 要求**激活与非激活图标对容器对比度均 ≥ 3:1**（见 A1.4）。

【官方公开资料】**VoiceOver**：HIG 明确「**Describe your app's interface and content for VoiceOver**」，VoiceOver 是让用户无需看屏即可使用界面的屏幕朗读器，指引链接至专门的 VoiceOver 页。
来源：[HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

【官方公开资料】**Reduce Motion / Reduce Transparency**：HIG 要求当 **Reduce Motion** 开启时，应用须**减少自动与重复动画（含缩放、周边运动）**；官方并列举了减少动效的若干做法。Liquid Glass 文档进一步要求：**在多种显示与无障碍设置下测试界面**——半透明与形变动画会随用户偏好调整，**标准系统组件会自动适配**，但**自定义元素、颜色与动画需自行测试**。
来源：[HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)、[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)
【本文推断】这条对我们**极关键**：它给出一个可判定的决策规则——**用标准系统组件 ⇒ 自适应免费；自绘 ⇒ 必须自己实现 Reduce Motion / Reduce Transparency / Increase Contrast 三条旁路**。旧 App 是「自绘 + 照搬模糊」，等于**同时放弃了自适应与平台材质**。这是「本机感」缺失的可解释机制。

### B6. Liquid Glass / iOS 26 世代：到底能不能用、值不值得用

> 本节按要求**实事求是**，明确区分「Apple 一手文档」「第三方报道」「未能证实」。

#### B6.1 时间线与当前版本

【官方公开资料】Apple Newsroom **2026-09-14**：新功能「start rolling out today across **iOS 27, iPadOS 27, macOS 27, watchOS 27, visionOS 27, and tvOS 27**」。其中 Design 段原文：*"Refinements to the software design with **Liquid Glass** deliver an even more focused and approachable experience. For example, a **new slider in Settings gives users the option to personalize Liquid Glass**, adjusting it anywhere from **ultraclear to fully tinted** to match their preference, and app icons have been updated to be sharper and more defined."*
来源：[Apple Newsroom, 2026-09-14](https://www.apple.com/newsroom/2026/09/major-updates-for-apples-software-platforms-are-now-available/)
【实测/观察】后续点版本为 **iOS 27.0.1 / iPadOS 27.0.1 / macOS 27.0.1 / visionOS 27.0.1**（MacTech 报道，2026-09-28）。
【本文推断】**Liquid Glass 引入于 iOS 26（2025 年，随 Xcode 26 SDK），当前世代已是 iOS 27。** 因此「Liquid Glass 是不是可用的公开 API」这个问题，**在 2026-09 的答案是肯定的**，且已经是**第二代（有用户侧个性化滑杆）**。

#### B6.2 它是不是可用的公开 API？—— 是，且分两层

【官方公开资料】**第一层：标准组件自动采用（零代码）**。原文：*"If your app uses standard components from SwiftUI, UIKit, or AppKit, your interface picks up the latest look and feel on the latest platform releases."* 以及 *"In system frameworks, standard components like **bars, sheets, popovers, and controls automatically adopt this material**."* 同时要求 **减少在控件与导航元素上使用自定义背景**，以免覆盖/干扰 Liquid Glass 或系统提供的 **scroll edge effect**。
来源：[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)

【官方公开资料】**第二层：自定义视图可显式采用（有公开 API）**。原文与示例（SwiftUI）：
```swift
Text("Hello, World!").font(.title).padding().glassEffect()
Text("Hello, World!").font(.title).padding().glassEffect(in: .rect(cornerRadius: 16.0))
Text("Hello, World!").font(.title).padding().glassEffect(.regular.tint(.orange).interactive())
```
- `glassEffect(_:in:)`：默认用 `Glass.regular`，在 `Capsule` 形状内应用；可指定形状、tint、`interactive(_:)` 以响应触摸/指针。
- `GlassEffectContainer`：多个玻璃视图**应放在容器里以获得最佳渲染性能**，并让形状可融合与形变（`glassEffectUnion(id:namespace:)`、`glassEffectID(_:in:)`、`GlassEffectTransition` 的 `matchedGeometry` / `materialize`）。
- 官方性能警告原文：*"Creating too many Liquid Glass effect containers and applying too many effects to views outside of containers can degrade performance. Limit the use of Liquid Glass effects onscreen at the same time."*
- 官方克制要求：*"**Avoid overusing Liquid Glass effects.** … Limit these effects to the most important functional elements in your app."*
来源：[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)

#### B6.3 对第三方 App 的实际可用性与限制

【官方公开资料】**兼容退出键存在，但从 iOS 27 SDK 起失效**。`UIDesignRequiresCompatibility`（BundleResources / Information Property List，**Availability: iOS 26.0+ iPadOS 26.0+ macOS 26.0+ tvOS 26.0+**）原文：
- 类型：`boolean`；说明：*"A Boolean value that indicates whether the system runs the app using a compatibility mode for UI."*
- **Warning**: *"Temporarily use this key while reviewing and refining your app's UI for the design in the latest SDKs."*
- *"If `YES`, the system runs the app using a compatibility mode for UI elements. The compatibility mode displays the app as it looks when built against previous versions of the SDKs."*
- *"If `NO`, the system uses the UI design of the running OS, with no compatibility mode. Absence of the key, or `NO`, is the default value for apps linking against the latest SDKs."*
- **关键句**：*"**The system ignores this key when you build for iOS 27 or later, iPadOS 27 or later, Mac Catalyst 27 or later, macOS 27 or later, or tvOS 27 or later.**"*

来源：[UIDesignRequiresCompatibility](https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility)

【官方公开资料】**提交门的 SDK 下限**：Apple News「Upcoming SDK minimum requirements」，**发布日 2026-02-03**，原文 *"Starting **April 28, 2026**, apps and games uploaded to App Store Connect need to meet the following minimum requirements: **iOS and iPadOS apps must be built with the iOS 26 & iPadOS 26 SDK or later**"*（tvOS/visionOS/watchOS 同理要求 26 SDK）。
来源：[developer.apple.com/news/?id=ueeok6yw](https://developer.apple.com/news/?id=ueeok6yw)

【本文推断，本节最重要结论 —— 时间线推演】
把上面两条官方事实叠起来：
1. **已经生效（2026-04-28 起）**：必须用 **iOS 26 SDK** 构建才能提交。用 iOS 26 SDK 构建时，**若不设** `UIDesignRequiresCompatibility=YES`，系统就用**运行 OS 的设计**——也就是在 iOS 26/27 设备上**自动呈现 Liquid Glass**。
2. **现在仍可选退出**：设 `UIDesignRequiresCompatibility=YES` 可回到旧外观。官方措辞是 **"Temporarily"**，且明确 **"ignores this key when you build for iOS 27 or later"**。
3. **下一步（用 iOS 27 SDK 构建时）**：**退出键被系统忽略**。按 Apple 一贯节奏（本次是 26 SDK 在 2026-04-28 成为下限），可预期 **iOS 27 SDK 会在 2027 年上半年成为提交下限**；届时**无法再退出**。

→ 因此：**「要不要做 Liquid Glass」不是一个可以永久推迟的产品选择，而是一个有明确到期日的技术债。** 用 iOS 26 SDK 构建并设退出键，是一张**有期限的缓冲牌**，不是解决方案。这正好也解释了本次任务里那条「iOS 27 强制 Liquid Glass」的传闻。

【未能证实 —— 必须诚实标注的部分】
- 搜索到的「**iOS 27 makes Liquid Glass mandatory, adds transparency slider**」类内容（如 `nihonnews.jp.net` 等聚合站）**属于二手/聚合来源**。本文**未采信其作为依据**。
- **能够一手证实**的部分只有两条：(a) `UIDesignRequiresCompatibility` 官方文档写明 **iOS 27+ SDK 构建时该键被忽略**（这已经**等价于**「iOS 27 SDK 世代起无法退出新设计」）；(b) Apple Newsroom 官方确认 iOS 27 中 Liquid Glass 有**用户侧个性化滑杆（ultraclear ↔ fully tinted）**。
- **未能一手证实**的部分：Apple 是否在 App Review Guidelines 中新增了「必须采用 Liquid Glass」的条文；Apple 是否官方声明某个**具体日期**后「强制」。→ 截至 2026-09-30，**本文未找到这类一手条文**。请勿据此对外宣称「Apple 强制必须用 Liquid Glass」；**准确表述是「兼容退出键在 iOS 27 SDK 世代被系统忽略」**。

#### B6.4 对 React Native 项目的现实含义（能不能用、值不值得用）

【实测/观察】**能用，但被限制在「自定义方块加玻璃底」这一层**。`@callstack/liquid-glass`：
- **npm 最新 0.8.2，发布于 2026-09-15**（npm registry 查询）；GitHub `callstack/liquid-glass` **1,690 stars，最后推送 2026-09-15**。
- README 原文定位：*"`@callstack/liquid-glass` brings iOS 26 liquid glass effect to React Native apps on iOS."*
- 前置条件（README Warning 原文）：*"Make sure to compile your app with **Xcode >= 26**. **React Native 0.80+** is required."*；并明确 ***"This library is not supported in Expo Go."***
- 暴露的 API：`LiquidGlassView`（props：`interactive`、`effect: 'clear' | 'regular' | 'none'`、`animated`、`animationDuration`、`tintColor`、`colorScheme`）、`LiquidGlassContainerView`（`spacing`）、以及布尔常量 `isLiquidGlassSupported`。
- README 自陈的**能力边界**（很重要，直接决定它不能干什么）：
  - *"On unsupported iOS version (below iOS 26), it will render a normal `View` without any effects."*
  - ***"There appears to be a size limit for the glass to automatically adapt the text color. If the glass view height is >= 65 it won't automatically adapt to the material behind it."*** ← **语言文本自动配色有高度上限**，这是实际约束。
  - 自动文本配色需搭配 RN 的 `PlatformColor`（如 `PlatformColor('labelColor')`）。
来源：[github.com/callstack/liquid-glass README](https://github.com/callstack/liquid-glass)、npm registry

【实测/观察】**要真正的原生 Tab Bar / 导航材质，必须换原生容器**。`react-native-bottom-tabs`：
- **npm 最新 1.4.0，发布于 2026-07-09**；GitHub **1,459 stars，最后推送 2026-09-24**（GitHub API 查询）。
- README 原文定位：*"**React Native Bottom Tabs** that use **native platform primitives**."* 支持平台表列出 **iOS / Android / iPadOS / visionOS / tvOS / macOS**；并注明 *"This library uses native platform primitives which are **not available on web**."*
- 包结构：`react-native-bottom-tabs`、`@bottom-tabs/react-navigation`、`@bottom-tabs/expo-template`。
来源：[github.com/okwasniewski/react-native-bottom-tabs README](https://github.com/okwasniewski/react-native-bottom-tabs)

【实测/观察】**expo-blur 不能产出 Liquid Glass。** `expo-blur` **npm 最新 57.0.3，发布于 2026-09-11**（npm registry 查询）。它提供的是模糊视图，**不是** Apple 的 Liquid Glass 材质（Liquid Glass 含折射/反射/对触摸与指针的实时响应，官方明确其为"combines the optical properties of glass with a sense of fluidity"且"reacts to touch and pointer interactions in real time"）。
【本文推断，直接因果】旧 App 的失败链条现在完全可解释：**RN 自绘 UI + expo-blur 近似 + 在 Android 上照搬** ⇒ ①在 iOS 上得到的是「模糊」，不是 Liquid Glass（缺折射与交互响应）；②在 Android 上 M3 的正统做法是 **tonal surface 而非模糊**，所以**模糊在 Android 上根本不生效/不正确**。二者叠加 = 「网页感 + Android 玻璃失效」。

【本文推断 —— 对 RN 项目的三条现实结论】
1. **能用的部分**：给少量自定义卡片/浮层加玻璃底（`LiquidGlassView`），`LiquidGlassContainerView` 做形状融合。适用于**「一个产品只保留 1–2 个 hero moment」**的克制用法（与 M3 对 hero moment 的建议惊人一致）。
2. **不值得的部分**：**自己用 RN 重画 Tab Bar / 导航栏 / sheet 然后贴玻璃**。因为 Liquid Glass 的关键价值（滚动边缘效果、tab 最小化、search tab 分离、sidebar 自适应、与触摸的实时响应、以及**自动随 Reduce Transparency/Reduce Motion 适配**）**都绑定在系统组件上**，自绘只能拿到「静态观感」，拿不到「行为」。自绘 + 贴玻璃 = **成本最高、本机感最差**的组合。
3. **正确的取舍**：**导航壳交给原生容器**（iOS 用原生 tab / native-stack，`react-native-bottom-tabs` 这类库；Android 用 RN 侧但严格按 M3 nav bar 规范 + 正确处理 insets），**内容层用 RN 自绘并严格遵循各端令牌**。这样「本机感」来自原生壳，「产品个性」来自 RN 内容层。

### B7. iOS 侧值得用原生实现的场景（服务「iOS 加点原生」决策）

【本文推断】判定标准用一条可操作的规则：**该能力的价值是否绑定在系统行为/系统状态上**（而非仅视觉）。绑定 ⇒ 原生赢；仅视觉 ⇒ RN 自绘可接受。

| # | 场景 | 为什么原生明显更优 | RN 现状与损失 | 结论 |
|---|---|---|---|---|
| 1 | **Tab Bar / 底部导航壳** | 官方：tab bar 浮在 Liquid Glass 层、可随滚动自动最小化（`TabBarMinimizeBehavior`）、可含**末端专用 search tab 并被系统自动分离**、iPadOS 上可转为 sidebar。这些是**系统行为 + 系统材质**（[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)、[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)） | RN 自绘 tab bar 只能拿到静态外观；用 `react-native-bottom-tabs`（**1.4.0 / 2026-07-09**）可用原生原语拿到这些行为 | **原生** |
| 2 | **导航栈与交互式右滑返回 + 大标题** | iOS 的 push/modal 转场与边缘右滑由 `UINavigationController` 承载；大标题折叠是系统行为 | RN 侧可用 React Navigation native-stack（**7.20.0 / 2026-09-29**，基于 `react-native-screens`）获得大部分；但**自定义 header 会失掉大标题、搜索栏等原生功能**（官方文档原文：*"if you specify a custom header, the native functionality such as large title, search bar etc. won't work"*） | **原生导航栈（含原生 header）**；**不要自绘 header** |
| 3 | **Sheet / 弹层与 detents** | iOS 26 起 sheet 圆角增大、半屏内缩、全高转不透明；拖动/peek 行为是系统级 | RN 侧 native-stack 的 `sheetAllowedDetents` 可用，但文档自陈多处限制（Android 仅 3 档、`sheetElevation` 为 Android only、`flex:1` 与 `fitToContents` 组合在 Android 会导致 sheet 不显示） | **原生 sheet**，不要自绘拖拽弹层 |
| 4 | **触感反馈** | `UIFeedbackGenerator` 的 notification/impact/selection 三族有系统级语义定义；系统控件**本就自动播报** | RN 需经第三方桥接；且**Android 侧是完全不同的常量族**（`HapticFeedbackConstants` / `VibrationEffect`，Android 16 起有 `VibrationEffect.Builder`） | **两端各自调本机 API**；语义层共享、数值不共享 |
| 5 | **Dynamic Type + VoiceOver + Reduce Motion/Transparency** | 用**标准系统组件**时这些**自动适配**（官方原文）；自绘则需自行实现全部旁路 | RN 自绘文本不自动获得 Dynamic Type 文字样式语义与 SF Symbols 缩放；无障碍标签需手动补 | **关键路径（导航、表单、列表）优先原生**；至少必须**手动补齐** a11y 标签 |
| 6 | **系统材质与滚动边缘效果（Liquid Glass / scroll edge effect）** | 官方：系统 bars 默认采用 scroll edge effect；自定义 bar 需**显式注册**才获得该效果；`backgroundExtensionEffect` 用于 sidebar 下的背景延伸 | RN 只有 `@callstack/liquid-glass` 的 `glassEffect` 子集，且**文本自动配色在高度 ≥65 时失效**（README 自陈） | **原生**（或严格克制地用在 1–2 处） |
| 7 | **图片选择** | `PHPickerViewController` 提供系统隐私边界与一致 UI | RN 用第三方 picker 库（如 `expo-image-picker`），权限与 UI 非系统原生 | **原生**（若需极致本机感；否则可接受第三方） |
| 8 | **文本输入与键盘避让** | UIKit 的键盘避让、`TextInput` 的 IME 行为是系统级 | RN 的 `KeyboardAvoidingView` **在 Android edge-to-edge 下曾出问题**（CHANGELOG v0.86.0 修）；iOS 侧需依赖社区方案 | **iOS 原生输入**（尤其多行/富文本场景）；简单输入可 RN |
| 9 | **上下文菜单 / 长按操作** | `UIContextMenuInteraction` 提供系统级预览、模糊背景与手势 | RN 需自绘或第三方，观感与手势响应不同 | **原生**（列表项长按菜单） |
| 10 | **Widget / Live Activities / 分享扩展 / 推送富媒体** | 只能在原生侧实现（无 RN 等价） | — | **必须原生** |

【官方公开资料】第 9 项的官方依据：Liquid Glass 文档要求「**Match top menu actions to swipe actions**」（上下文菜单顶部动作应与同一项的滑动动作一致），并建议用 `UIContextMenuInteraction` 一类的系统能力以自动获得菜单项图标（系统按 selector 决定标准动作如 Cut/Copy/Paste 的图标）。
【官方公开资料】第 10 项相关：App icons 现在**分层（foreground/middle/background）**，系统自动施加反射、折射、阴影、模糊与高光；官方提供 **Icon Composer**，并**要求导出的图标保持元素居中以避免被裁切**，最终形状由系统遮罩生成（iOS/iPadOS/macOS 圆角矩形、watchOS 圆形）。→ **Liquid Glass 世代的应用图标本身就要重做**（分层 + 用 Icon Composer 预览）。
来源：[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)

【实测/观察，版本锚点】iOS 侧原生能力真正可用的**最低工具链条件**：**Xcode ≥ 26**（`@callstack/liquid-glass` README 明确要求），且 **iOS 26 SDK 已是 App Store 提交下限（2026-04-28 起）**。→ 「iOS 混原生」在工具链上**没有额外门槛**：反正必须用 Xcode 26+。

---

## C. 跨端收尾

### C8. 「同一产品、两端各自最优」判据表

> 用法：设计评审时**逐行过**。左列若被判「必须一致」，则任何端特有改动都需走变更评审；若被判「必须分端」，则**禁止**用「为了统一」为由要求另一端照搬。

#### C8.1 必须两端一致（产品契约层）

| # | 项目 | 判据与依据 |
|---|---|---|
| 1 | **信息架构 / 一级入口集合与命名** | 用户对「这是同一个产品」的认知建立在**同一套东西叫什么、在哪**。两端可**呈现方式**不同（Android nav bar ↔ iOS tab bar ↔ 大屏 rail/sidebar），但**入口语义集合**必须一致。（依据：M3 每个断点都会 swap 导航组件，[M3 window size classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)） |
| 2 | **术语表（中英文）** | 与 Web 端共用 `shared/` 常量与语言包，是现有工程事实；两端各造词会造成同一功能三种叫法。 |
| 3 | **业务行为与状态语义** | 点赞/收藏/举报后发生什么、权限判定、错误文案含义、内容可见性规则——属**后端契约**，与端无关。 |
| 4 | **数据与权限边界** | 谁能看到什么、什么操作需要什么权限。与端无关。 |
| 5 | **颜色/品牌的语义角色** | 「主色=品牌蓝」「成功/危险/警告的语义」应一致；**具体取值可各按平台算**（M3 用 tonal palette 与动态取色，iOS 用系统色与 light/dark/increased-contrast 变体）。依据：[M3 color roles](https://m3.material.io/styles/color/roles)、[HIG Accessibility 的 system colors 指引](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| 6 | **无障碍的最低合规线** | 「最小触控目标」「最小对比度」的**目标**一致（可达标）；但**方**不同：Android 48dp / iOS 44pt，对比度 Android nav 图标 ≥3:1、iOS 按 4.5:1（≤17pt）/3:1（18pt 或加粗）。依据 A1.4 / B5.4 / B5.5 |
| 7 | **内容密度与信息层级的设计意图** | 「卡片里放哪几个字段、什么最重要」应一致，否则两端变成两个产品。 |
| 8 | **埋点/事件命名** | 分析口径必须一致，否则数据不可比。 |

#### C8.2 必须各按各的平台规范（平台契约层）—— 本文最重要的产出

| # | 项目 | Android 做法（依据） | iOS 做法（依据） | 为什么不能统一 |
|---|---|---|---|---|
| 1 | **导航壳（顶部/底部）** | M3 navigation bar（**仅 Compact/Medium**，**3–5 项**、**标签必留**、**禁滑动切换**）；Expanded+ 换 **navigation rail**（[M3 nav bar](https://m3.material.io/components/navigation-bar/guidelines)、[breakpoints](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)） | Tab bar 浮于 Liquid Glass 层；可滚动最小化；**可含末端 search tab**；iPadOS 移向顶部并可转 sidebar（[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)） | 形态、位置、材质、断点行为全不同；Android 有硬性 3–5 区间，iOS 无此区间但避免溢出 |
| 2 | **返回（Back）** | **以系统返回为主**：支持预测式返回动画契约；target 36 下 `onBackPressed`/`KEYCODE_BACK` 不再派发；**必须处理左右边缘手势冲突区**（[A16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)、[edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)） | **页面左上角返回按钮 + 边缘右滑交互式转场**，由导航控制器承载（[HIG Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search)） | Android 的返回**不属于页面**；iOS 的返回**是页面的一部分**。统一必然一方「网页感」 |
| 3 | **弹层（sheet/modal/bottom sheet）** | bottom sheet 须避开 **system gesture insets**（官方点名）；React Navigation 的 `sheetAllowedDetents` 在 Android **仅 3 档** | detents（medium/large）；iOS 26 起圆角增大、半屏内缩、全高转不透明 | 手势区约束、档位数、材质变化都不同 |
| 4 | **动效曲线 / 时长** | M3 **motion physics**（spring，取代 easing+duration）：**expressive**（过冲弹跳，用于 hero moment）与 **standard**（几乎无弹跳）；**官方实现表里 Flutter=Unavailable、RN 无条目**（[M3 motion](https://m3.material.io/styles/motion/overview/how-it-works)） | 系统转场与形变；Liquid Glass 的形状融合/形变（`matchedGeometry` / `materialize`）（[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)） | **物理模型不同，且 RN 无官方 M3 spring 实现**。统一曲线 = 两端都不native。**注：M3 未公开 spring 数值，禁止编造常量**【未能证实】 |
| 5 | **层级/抬升手段** | **tonal surface 抬升为主，阴影仅在必要时使用**，且**只用少量层级**（[M3 elevation](https://m3.material.io/styles/elevation/overview)） | **材质（Liquid Glass）+ scroll edge effect + background extension effect**（[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)） | 这正是旧 App「Android 玻璃从不生效」的根因：Android 正统是色调抬升，不是模糊 |
| 6 | **字体与字阶** | target 35 起 `elegantTextHeight` 默认 true；**Android 16 弃用该属性、target 36 起被忽略**，官方要求为多种语言调整布局（[A16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)） | 系统 **SF Pro** + **Dynamic Type 文字样式**（iOS 默认 17pt / 最小 11pt，含逐字阶 size/leading/emphasized weight）（[HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)） | 字号缩放机制（属性 vs 文字样式）、字体度量、字重渲染都不同。**不要共用一套绝对 pt 常量** |
| 7 | **触感反馈** | `HapticFeedbackConstants`（`CONFIRM`/`REJECT` 等，**无需 VIBRATE 权限**，自带 fallback）；Android 16 (26Q4) 起 `VibrationEffect.Builder`（[Android haptics](https://developer.android.com/develop/ui/views/haptics/haptic-feedback)） | `UIFeedbackGenerator` 的 notification / impact / selection（[HIG Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)） | 无常量对应关系。共享**语义**，各自映射 |
| 8 | **大标题 / 搜索栏等系统 header 能力** | 无 iOS 式大标题折叠语义；React Navigation 文档亦如此标注 | 原生 header 才有 large title / search bar（自绘 header 会失去，官方文档原文明确）（[RN native-stack](https://reactnavigation.org/docs/7.x/native-stack-navigator)、[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)） | iOS 独有；Android 不该假装有 |
| 9 | **应用图标** | M3 图标体系（自适应图标）；Expressive 新增 **35 个形状**可用于装饰性元素（[M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)） | **分层图标（foreground/middle/background）+ Icon Composer + 系统遮罩**；light/dark/clear/tinted 变体（[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)） | 图标系统完全不同（分层 vs 自适应形状） |
| 10 | **安全区与坐标** | edge-to-edge 强制；三类 insets 分别处理（systemBars / displayCutout / **systemGestures**）（[edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)） | `safe area`（避开 Dynamic Island 等）由系统定义并要求遵循（[HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)） | 机制不同；且 Android 多出「手势优先区」这一 iOS 没有的类别 |
| 11 | **无障碍旁路实现** | 需处理系统字号与 TalkBack；Android 16 **弃用 `announceForAccessibility` / `TYPE_ANNOUNCEMENT`**，官方称其会造成 TalkBack 体验不一致并指向更好的替代（[A16 behavior-changes-all](https://developer.android.com/about/versions/16/behavior-changes-all)） | 需处理 **Reduce Motion / Reduce Transparency / Increase Contrast**——**标准组件自动适配，自定义元素须自行测试**（[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)、[HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)） | 平台无障碍设置项不同，旁路代码不同 |
| 12 | **屏幕旋转 / 大屏策略** | target 36 起 **sw≥600dp 上忽略方向/尺寸/比例限制**；**target 37 起临时退出开关消失**（[A16](https://developer.android.com/about/versions/16/behavior-changes-16)、[A17](https://developer.android.com/about/versions/17/behavior-changes-17)） | 支持任意窗口尺寸；split view 自动回流；iPadOS 窗口可连续缩放（[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)） | 都要求自适应，但断点体系与实现路径不同 |
| 13 | **App 名称/图标/商店素材** | Play 商店规范 | App Store 规范 | 本就分端 |

#### C8.3 对设计宪法的直接输入（本文建议条目）

【本文推断】以下 8 条建议可直接作为设计宪法的硬约束候选：

1. **两端共享「信息架构 + 术语 + 业务行为」，不共享「导航壳 + 返回 + 弹层 + 动效曲线」。**（依据 C8.1/C8.2）
2. **禁止自绘导航壳与系统 header。** 导航必须走平台原生容器（iOS: 原生 tab/navigation；Android: 按 M3 规范且正确消费三类 insets）。**「自绘壳 + 贴玻璃」被判为禁止模式**（成本最高、本机感最差，见 B6.4）。
3. **底部一级入口上限 5。** Android 硬性 3–5（M3）；iOS 倾向更少且避免溢出。上限 5 是两端安全交集。
4. **返回契约分端定义。** Android：以系统返回为主，**并在脚手架第一周完成 target 36 真机验证**（见 A2.4 的 P0 风险）；iOS：页面返回按钮 + 边缘右滑。**禁止**把 iOS 的左上角返回箭头当作 Android 的主返回入口。
5. **横滑手势必须避让边缘。** 所有横向滑动组件（图集/轮播/卡片）在 Android 上须避开 system gesture insets 区域；在设计稿标出**边缘禁滑区**（依据 A2.2，官方点名 bottom sheet / ViewPager2 / carousel）。
6. **层级表达分端。** Android 用 **tonal surface** 抬升（阴影克制）；iOS 用系统材质。**禁止**把「模糊/玻璃」作为两端通用的层级手段。
7. **令牌三层落地（reference → system → component），语义命名两端一致、取值分端生成。** 不复制 Web 的 CSS 变量名，不复用绝对 pt 字阶常量（依据 A1.2、B5.5、C8.2#6）。
8. **锁定 RN 版本。** 理由：edge-to-edge 与 API 36 相关的坐标/键盘/尺寸修正在 **v0.86.0** 才集中落地；跨大版本随意升级会引入安全区回归（依据 A4 RN CHANGELOG 条目）。
9. **一件事只保留 1–2 个 hero moment。** M3 官方明确建议（[M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)）；Liquid Glass 官方也要求克制（"Avoid overusing Liquid Glass effects"，[Apple](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)）。→ 这是**两端罕见地给出同一结论**的地方，值得直接采纳。

---

## 附录

### 附录 A：版本与日期锚点表（2026-09-30 核验）

| 项目 | 版本 / 状态 | 日期 | 来源 |
|---|---|---|---|
| iOS / iPadOS | **27.0.1**（27 于 2026-09-14 发布） | 2026-09-14（发布会）/ 2026-09-28（27.0.1 报道） | [Apple Newsroom](https://www.apple.com/newsroom/2026/09/major-updates-for-apples-software-platforms-are-now-available/) |
| App Store 提交 SDK 下限 | **iOS 26 SDK 或更新** | 生效 **2026-04-28** | [Apple News](https://developer.apple.com/news/?id=ueeok6yw) |
| `UIDesignRequiresCompatibility` | iOS 26.0+；**iOS 27+ SDK 构建时被忽略** | — | [Apple Docs](https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility) |
| Android 16 | API 36，稳定；edge-to-edge 强制 + 预测式返回默认开启 | — | [behavior-changes-16](https://developer.android.com/about/versions/16/behavior-changes-16) |
| Android 17 | **API 37**；大屏限制退出开关取消 | — | [behavior-changes-17](https://developer.android.com/about/versions/17/behavior-changes-17) |
| Google Play target 要求 | 新应用/更新须 **target API 36+** | 生效 **2026-08-31** | [target-sdk](https://developer.android.com/google/play/requirements/target-sdk) |
| React Native 稳定版 | **0.87.1** | 2026-08-26 | GitHub Releases API |
| React Native RC | **0.88.0-rc.3** | 2026-09-28 | GitHub Releases API |
| RN 新架构 | **0.82 起移除 opt-out**（legacy 架构被移除/崩溃） | 见 CHANGELOG | [RN CHANGELOG](https://raw.githubusercontent.com/facebook/react-native/main/CHANGELOG.md) |
| RN edge-to-edge | 0.81 引入 opt-in；0.85+ 默认；0.86 修 OS 强制路径 | — | 同上 |
| RN SafeAreaView | **0.81.0 弃用**（仅 iOS、与 Android e2e 不兼容） | — | [RN 0.81 blog](https://reactnative.dev/blog/2025/08/12/react-native-0.81) |
| react-native-screens | **4.28.0** | 2026-09-14 | npm registry |
| @react-navigation/native-stack | **7.20.0** | 2026-09-29 | npm registry |
| @react-navigation/bottom-tabs | **7.20.0** | 2026-09-29 | npm registry |
| @callstack/liquid-glass | **0.8.2**（要求 Xcode≥26、RN≥0.80、不支持 Expo Go） | 2026-09-15 | npm registry + README |
| react-native-bottom-tabs | **1.4.0** | 2026-07-09 | npm registry |
| expo-blur | **57.0.3**（模糊视图，**非** Liquid Glass） | 2026-09-11 | npm registry |
| M3 Expressive | 发布（14 组件 / 35 形状 / 46 研究） | **2025-05-13** | [M3 blog](https://m3.material.io/blog/building-with-m3-expressive) |
| M3 motion physics | 引入（取代 easing+duration）；Compose 可用、Flutter Unavailable、**RN 无官方条目** | **2025-05** | [M3 motion](https://m3.material.io/styles/motion/overview/how-it-works) |
| M3 shape scale | **十级**（0 → 48dp、Full） | — | [M3 shape](https://m3.material.io/styles/shape/corner-radius-scale) |
| M3 breakpoints | **五档**（Compact<600 / Medium 600–839 / Expanded 840–1199 / Large 1200–1599 / XL 1600+） | — | [M3 window size classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes) |
| HIG Layout | change log **2026-09-09 更新** | 2026-09-09 | [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| HIG Typography | change log **2025-12-16 加入各平台强调字重** | 2025-12-16 | [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| HIG Tab bars | change log **2025-12-16 更新 Liquid Glass 指引** | 2025-12-16 | [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |
| HIG Accessibility | change log **2025-03-07 全面扩充** | 2025-03-07 | [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| exfy/expo 预测式返回 issue | **#39092 open**（labels: Issue accepted / expo-router / Upstream: React Native Screens） | created 2025-08-23, updated 2026-08-11 | GitHub Issues API |
| RN 预测式返回 issue | **#34529 closed**（labels: Stale, Platform: Android） | created 2022-08-30, updated 2025-10-21 | GitHub Issues API |

### 附录 B：本文明确「未证实 / 不采信」的清单（防止误引）

1. **M3 Expressive 那 14 个组件的完整名单与逐项规格**——官方博客正文未逐条列出。**本文不断言 toolbar / split button / loading indicator 的具体规格**，需以 [m3.material.io/components](https://m3.material.io/components) 逐页核对。**【未能证实】**
2. **M3 motion physics 的 spring 具体数值（stiffness/damping 等）**——官方未公开。**禁止编造**。**【未能证实】**
3. **任何 Material 色彩角色的具体十六进制取值**——随主题/动态取色变化。**请从官方 `material-tokens` 仓库或 Material Theme Builder 生成**，本文不复制数值。**【未能证实】**
4. **「Apple 强制要求采用 Liquid Glass」这一说法**——未找到 Apple 一手条文（如 App Review Guidelines 明文或官方声明具体强制日期）。**能一手证实的只有：`UIDesignRequiresCompatibility` 在 iOS 27+ SDK 构建时被系统忽略**，以及 **iOS 27 中 Liquid Glass 增加用户侧个性化滑杆**。请使用准确表述，不要升级为「Apple 强制」。**【未能证实】**
5. **「iOS 27 使 Liquid Glass 义务化」类报道（nihonnews.jp.net 等聚合站）**——**二手来源，未采信**。**【本文推断】**（仅基于官方两键文档的时间线推演）
6. **Android TV / Wear / Automotive / XR 的 target API 例外细节**——本文只引用了 Play 官方页面的例外数字（Wear/Automotive 35，TV/XR 34），**未深入验证**，因为与手机端 App 无关。**【未深入验证】**
7. **`react-native-bottom-tabs` 与 expo-router native tabs 在 iOS 26/27 上对 Liquid Glass 的完整适配程度**——本文只核到 README 的「native platform primitives」定位与版本/活跃度，**未逐项验证其 tab 最小化、search tab 分离、滚动边缘效果是否全部透传**。**【需在 spike 中验证】**
8. **RN 预测式返回冲突的当前状态（RN 0.87.1 + react-native-screens 4.28 组合）**——本文核到的是官方博客口径（0.81，2025-08）与社区报告（2025-10）、以及仍 open 的 expo issue（更新于 2026-08-11）。**最新版本组合下是否已修复，未实测，必须真机验证。**【需在 spike 中验证】

### 附录 C：建议的脚手架期「平台契约 spike」清单（各 1 天以内）

| # | Spike | 通过判据 | 依据 |
|---|---|---|---|
| 1 | **Android 16 真机 · target 36 · 返回行为** | 从二级页按系统返回 → **回到上一页而非退出 App** | A2.4 P0 风险 |
| 2 | Android 16 真机 · edge-to-edge insets | 顶部 app bar 绘制到状态栏后、底部导航栏绘制到导航栏后、FAB/底部按钮**不被导航栏遮挡**；列表滚动内容进入系统栏后方 | A2.2 |
| 3 | Android 真机 · 边缘手势冲突 | 图集/轮播从屏幕左/右边缘起手滑动 → **不误触返回**；必要处已预留边缘禁滑区 | A2.2（官方点名 carousel/ViewPager2） |
| 4 | Android 折叠屏/平板 · sw≥600dp | 不锁方向；Compact 单栏 → Medium/Expanded 出现第二栏；导航从 nav bar **swap 为 rail** | A3 |
| 5 | iOS 真机（iOS 26 与 27）· Liquid Glass | 用 iOS 26 SDK 构建且**不设**兼容键 → 原生 tab bar/sheet 呈现 Liquid Glass；设 `UIDesignRequiresCompatibility=YES` → 回到旧外观；开 Reduce Transparency → 观感正确降级 | B6.2 / B6.3 |
| 6 | iOS · Dynamic Type 极限 | 系统字号拉到 **AX5**：无截断/重叠，关键按钮仍可点（≥44pt） | B5.5 |
| 7 | 两端 · 触感语义映射 | 同一「成功/失败/选择变化」在两端各自调用本机 API 且体感不违和 | A4 / B7#4 |

---

**文档结束**。本文所有结论均以 2026-09-30 的一手来源为准；平台规范随版本变动，**引用本文时请连同版本号与日期一并引用**，并在每次大版本（Android 18 / iOS 28 / RN 1.x）发布后复核第 0 节与附录 A。
