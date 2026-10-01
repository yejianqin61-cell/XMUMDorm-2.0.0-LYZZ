# App 组件层调研 —— 现成组件库评估

**日期**：2026-10-01
**性质**：新 App 组件层选型的前置事实输入（回答所有者提问：**「组件，有没有现成的？还是说自己写好点？」**）
**方法**：npm registry 一手实测（`npm view`，2026-10-01）+ 官方文档原文 + GitHub API。**每个数字都附来源与访问日期。**
**证据等级**：`【一手实测】`＝本次跑了命令（附原始输出）；`【官方文档】`＝官方页面/仓库原文；`【推断】`＝本文推断，已标注。

> **本文只给事实与分类，不给结论。** 结论（三层策略）在 §5；写进宪法的硬条款在第 9 条。

---

## 0. 一句话回答

**这个问题没有"选一个库"的答案，只能分三层回答：**

| 层 | 答案 | 决定性依据 |
|---|---|---|
| **平台/运行时原语** | **必须用现成**，且**优先官方 `@expo/ui`** | Expo 官方原文：`@expo/ui` **"is not another UI library and not an opinionated design kit. Instead, it's a primitives library."** |
| **设计系统层**（令牌 → 主题 → 原子组件 → 组合组件） | **必须自研** | 本项目的两把尺子（零 `#hex`/`fontSize` 字面量、令牌必须携带实测对比度）**任何现成设计系统都满足不了**；且"苹果舒适感 + Discord 社区感 + 一点点 Neo-Brutalism（限三类）"这个组合**没有任何库实现** |
| **完整设计系统 / UI kit** | **不作为基座**（可作局部参考） | 它们的默认值是 M3 或它们自己的设计语言，采用即接受它们的色值与字阶 |

---

## 1. 为什么"用现成的还是自己写"是一个分层问题

### 1.1 三个判别维度

| 维度 | 问什么 | 为什么它决定成败 |
|---|---|---|
| **是否强加视觉身份** | 它自带调色板/字阶/主题，还是要求我提供？ | 本宪法第 2 条要求**令牌是唯一事实源**且每个颜色令牌携带**实测算出的对比度**。若采用自带调色板的库，我们的代码里就会出现"覆盖它主题"的 hex —— 直接撞上第 2.4 条。 |
| **是否承担原生行为** | 它是否提供系统级容器（Tab 栏、Header、Sheet、返回手势）？ | 本宪法第 4.3 条要求导航壳走原生容器，且**禁止自绘壳**。这部分**写不出来**，只能买。 |
| **写出来的代价 vs 买来的代价** | 自研的是"布局与样式"，还是"手势/动效/虚拟化/物理"？ | 前者是设计工作，可控；后者是**平台工程**，自研等于重造轮子且永远追不上系统版本。 |

### 1.2 本项目独有的一条硬约束

`scripts/design-debt-report.js` 会**在我们的 `src` 里数 `#hex` 与 `fontSize` 字面量并要求为 0**，`scripts/contrast-check.js` 与 `scripts/brand-ramp.js` 会**要求每个 `textSafe` 令牌的对比度达标**。

→ **推论【推断】**：任何"自带主题、我们需要覆盖它"的库，都会把它的色值/字号写进我们的代码（覆盖语句本身就是字面量），从而**把设计债从库里搬进我们自己的仓库**——这正是旧 App 的病。

---

## 2. A 组：完整设计系统 / UI kit 候选

### 2.1 一手实测（npm registry，2026-10-01）

```console
$ npm view <pkg> version license time.modified --json     # 逐包执行，汇总如下
```

| 包 | 版本 | 许可证 | 最后发布 | 分类（§2.2） |
|---|---|---|---|---|
| **`@expo/ui`** | **57.0.21** | **MIT** | 2026-10-01 | **原语库（非设计套件）** |
| `react-native-paper` | 5.15.3 | MIT | 2026-06-15 | 完整设计系统（默认 M3） |
| `tamagui` | 2.7.7 | **npm 元数据未声明**（GitHub: MIT） | 2026-09-27 | 样式引擎 + 可选 UI kit |
| `@gluestack-ui/themed` | 1.1.73 | ISC | **2025-09-10** | 组件库（自带 config 令牌） |
| `nativewind` | 4.2.7 | MIT | 2026-09-15 | 样式引擎 |
| `@shopify/restyle` | 2.4.5 | MIT | 2026-04-16 | 样式引擎 |
| `react-native-unistyles` | 3.3.0 | MIT | 2026-07-10 | 样式引擎 |
| `react-native-ui-lib` | 9.1.3 | MIT | 2026-09-06 | 完整组件库（Wix） |
| `@ui-kitten/components` | 6.1.3 | MIT | 2026-09-27 | 完整设计系统（Eva） |
| `dripsy` | 4.3.8 | MIT | **2024-10-22** | 样式引擎（≈2 年未更新） |
| `react-native-magnus` | 1.0.63 | MIT | **2022-09-22** | 组件库（≈4 年未更新，实质停更） |
| `@rneui/themed` | 5.0.0 | MIT | 2026-01-19 | 组件库 |

**维护信号读数**：`react-native-magnus`（2022）与 `dripsy`（2024-10）已不适合新项目；**`@gluestack-ui/themed` 距上次发布约 13 个月**，是唯一"曾活跃但当前停滞"的候选 —— 采用前必须确认维护状态。

### 2.2 分类：三种库，后果完全不同

| 类型 | 定义 | 代表 | 对本项目 |
|---|---|---|---|
| **① 原语库** | 只把**系统原生组件** 1:1 暴露给 JS，不含自己的设计语言 | **`@expo/ui`** | **采用**：它不带来第二套视觉，且正是第 4.3 条要的"原生容器" |
| **② 样式引擎** | 只管"样式怎么写"，**令牌由项目提供** | `nativewind`、`@shopify/restyle`、`react-native-unistyles`、`tamagui`（其 styling 部分） | **不冲突但不解决核心问题**：它不提供组件外观，只提供书写方式 |
| **③ 完整设计系统 / UI kit** | 自带调色板 + 字阶 + 主题，默认外观是它自己的设计语言 | `react-native-paper`、`@ui-kitten/components`、`react-native-ui-lib`、`@rneui/themed`、`@gluestack-ui/themed`、`tamagui`（其 UI kit 部分） | **不作为基座**：采用即接受它的色值与字阶（§1.2） |

### 2.3 两条决定性的官方原文

**【官方文档】** `https://docs.expo.dev/versions/latest/sdk/ui.md`（访问 2026-10-01）原文：

> "**How is Expo UI different from libraries like `react-native-paper` or `react-native-elements`?** Expo UI is **not "yet another" UI library and not an opinionated design kit**. Instead, it's a **primitives library**. It exposes native Jetpack Compose and SwiftUI components directly to JavaScript, **rather than re-implementing or simulating UI in JavaScript**."

→ **这是"有没有现成的"这个问题最直接的一手答案**：官方自己在文档里把 `@expo/ui` 与 `react-native-paper` 这类**有主见的设计套件**对立起来。本项目要的正是前者。

**【官方文档】** `https://raw.githubusercontent.com/callstack/react-native-paper/main/README.md`（访问 2026-10-01）原文：

> "React Native Paper is the cross-platform **UI kit** library containing a collection of customizable and production-ready components, **which by default are following and respecting the Google's Material Design guidelines**."
> "Follows material design guidelines"；"Full theming support"

→ `react-native-paper` 的**默认外观就是 M3**。这与本宪法第 1 条（"苹果的舒适感"是**质感标准**，Android 按 M3 语言实现，但整体是三种来源的混合）以及第 5 条（iOS 不得按 M3 做）不匹配；采用它等于接受一套"两端都是 M3"的默认视觉。

### 2.4 许可证的一处元数据缺口

**【一手实测 + 官方仓库】** `tamagui` 的 npm `license` 字段**为空**；其 GitHub 仓库 `license.spdx_id = "MIT"`（`https://api.github.com/repos/tamagui/tamagui`，访问 2026-10-01）。

→ **本条正是宪法第 3.4 条"依赖准入必须登记许可证"存在的理由**：npm 元数据不可全信，必须回源核实。本文按 **MIT** 记录（以仓库为准），并标注"npm 未声明"。

---

## 3. B 组：行为 / 结构原语

这些**不提供完整视觉身份**，是"必须买"的部分。许可证与维护信号（2026-10-01 实测）：

| 包 | 版本 | 许可证 | 最后发布 | 强加视觉身份？ | 含原生代码 |
|---|---|---|---|---|---|
| `react-native-screens` | 4.28.0 | MIT | 2026-09-30 | ❌ 纯容器 | ✅ |
| `react-native-safe-area-context` | 5.10.1 | MIT | 2026-09-29 | ❌ | ✅ |
| `react-native-gesture-handler` | 3.3.0 | MIT | 2026-09-30 | ❌ | ✅ |
| `react-native-reanimated` | 4.7.0 | MIT | 2026-09-30 | ❌ | ✅ |
| `@gorhom/bottom-sheet` | 5.2.14 | MIT | 2026-05-09 | ⚠️ 有默认外观 | ❌/推断 |
| `@shopify/flash-list` | 2.3.2 | MIT | 2026-06-10 | ❌ | **❌（R3 实测零原生）** |
| `@legendapp/list` | 3.6.0 | MIT | 2026-09-29 | ❌ | **❌（R3 实测零原生）** |
| `expo-image` | 57.0.5 | MIT | 2026-10-01 | ❌ | ✅ |
| `expo-haptics` | 57.0.3 | MIT | 2026-09-29 | ❌ 触感 | ✅ |
| `expo-symbols` | 57.0.3 | MIT | 2026-09-29 | ⚠️ 用系统图标即"原生" | ✅ |
| `expo-glass-effect` | 57.0.4 | MIT | 2026-09-29 | ⚠️ 系统材质 | ✅ |
| `react-native-svg` | 15.15.5 | MIT | 2026-05-20 | ❌ 绘图 | ✅ |
| `react-native-bottom-tabs` | 1.4.0 | MIT | 2026-07-09 | ⚠️ **用系统 Tab 栏** | ✅ |

⚠️ **`react-native-gesture-handler` 是版本陷阱**：npm `latest` = **3.3.0**，但 **SDK 57 官方模板锁 `~2.32.0`**，且其 peerDependencies 只写 `{"react":"*","react-native":"*"}`（**无上界保护**）→ 手装 3.x 到 SDK 57 **不会在安装期报错**。必须由 `npx expo install` 决定版本（宪法 3.1）。

---

## 4. 专项核实

### 4.1 Material 3 Expressive 有没有**官方** RN 实现？

**没有。【官方文档 + 已有核实】**

- 本项目已核实：**M3 动效物理（motion physics）在 React Native 上没有官方实现** —— M3 官方的"实现对照表"里 Compose=Available、Flutter=Unavailable，**RN 根本没有条目**（见 [调研-02 附录 B](../../06-Analyze/ui-research/App设计调研-02-Android与iOS平台规范.md)）。
- 本次补充：`@expo/ui/jetpack-compose` 提供 `Button` / `FloatingActionButton` / `NavigationBar` / `SegmentedButton` / `Chip` / `Card` / `SearchBar` 等标注为 **"native Material3"** 的组件。**但它们的来源是"Jetpack Compose 组件的 1:1 映射"，不是"M3 的 RN 实现"。** 这解释了为什么 **Android 侧能拿到 M3、iOS 侧拿到的是 SwiftUI 而不是 M3** —— 与宪法 5.2（双端各按各的平台规范）完全一致，**不需要**一个"跨端 M3 实现"。

### 4.2 存在 RN 的 Neo-Brutalism 组件库吗？需要吗？

**不主张采用。【推断】**

1. **不需要**：Neo-Brutalism 在本项目里**只是一个三类元素的样式配方**（2px 描边 + 硬偏移阴影 + 高对比色块 + 较重字重，见宪法第 1 条），属自研设计系统的几个组件变体，不构成引入一个库的理由。
2. **有冲突风险**：一个"全套 Neo-Brutalism"组件库的默认外观会**把白名单扩散成全局风格**，直接违反第 1.1 条的越界判定。
3. **Web 侧的 RetroUI 不可复用**：`shared/components/` 含 `.jsx` + `.css`，是 Web 专属（宪法 9.6）。

> **本文未逐一枚举**可能存在的 RN Neo-Brutalism 小组件库 —— 因为它们即使存在也不改变结论（不需要）。

### 4.3 `@expo/ui` 到底有什么（一手组件清单）

**【官方文档】** `https://docs.expo.dev/versions/latest/sdk/ui.md`（访问 2026-10-01），SDK 57 / `@expo/ui@57.0.21`：

| 入口 | 组件数 | 关键组件（择要） |
|---|---|---|
| `@expo/ui/jetpack-compose`（Android） | **49** | `NavigationBar`（**M3 bottom navigation**）、`Button` / `IconButton` / `FloatingActionButton`、`Card`、`Chip`、`SegmentedButton`、`SearchBar` / `DockedSearchBar`、`TextField`、`ModalBottomSheet`、`Snackbar`、`AlertDialog`、`Carousel`、`HorizontalPager`、`LazyColumn` / `LazyRow`、`ListItem`、`PullToRefreshBox`、`Badge` / `BadgedBox`、`Progress indicators`、`Host`、`RNHostView`、`Modifiers`、**`Material Colors`（可读 M3 Dynamic Colors）** |
| `@expo/ui/swift-ui`（iOS） | **43** | `TabView`、`List`、`Section`、`Form`、`SwipeActions`、`ContextMenu`、`DisclosureGroup`、`Menu`、`Popover`、`Picker`、`DatePicker`、`Gauge`、`ProgressView`、`SecureField`、`Link`、`HStack` / `VStack` / `ZStack` / `Group` / `Namespace` / `Overlay`、`Host`、`RNHostView`、`Modifiers`、`useNativeState` |
| `@expo/ui/universal`（Android/iOS/Web） | **18** | `Host` / `Row` / `Column` / `Spacer`、`Text` / `TextInput`、`Button`、`Switch` / `Checkbox` / `Slider` / `Picker`、`List`（虚拟化）+ `ListItem`、`FieldGroup`、`Collapsible`、`BottomSheet`、`ScrollView`、`Icon`（iOS=SF Symbol / Android=Material Symbol）、`RNHostView` |
| **Drop-in 替代**（替换常用社区库） | **8** | `BottomSheet`（兼容 `@gorhom/bottom-sheet`）、`DateTimePicker`、`MaskedView`、`Menu`、`PagerView`、`Picker`、`SegmentedControl`、`Slider` |

> 组件数为**按官方页面表格逐项计数**得出（2026-10-01）。官方页面会随 SDK 发版变化，**引用前应重数**。

**关键读数**：

1. **`@expo/ui` 已能覆盖本项目相当一部分"平台控件"需求**，且每个都是原生实现。
2. **`NavigationBar`（M3 bottom navigation）存在** → 与 [设计阶段计划 §7.3](../../05-Tasks/App设计阶段/设计阶段工作计划与验收门.md) 的"SDK 57 原生 Tab 三选一"相关，但**它只是一个组件，不是带返回栈的导航容器**，不能替代 Tab 导航器。
3. **`Drop-in replacements` 让若干社区依赖可以被官方实现取代**（如 `@gorhom/bottom-sheet`）→ 可减少第三方原生依赖数量，直接降低宪法 11.4 的 OTA 负担。
4. **`Material Colors` 暴露 M3 Dynamic Colors** → **可用，但本项目不应启用**：动态取色让表面/强调色由用户壁纸决定，**`contrastRatio` 就无法在构建期预先算定**，与第 2.3 条（令牌必须携带实测对比度）直接冲突。【推断】

**已知约束（原文）**：

> "Flexbox styles apply to the `Host` component itself. Once you are inside the native context, **Yoga is not available**. Define layouts with `Row` and `Column` on Android, or `HStack` and `VStack` on iOS."

> "`Host` is the bridge… **You must wrap every Expo UI component in one.**"

→ **`@expo/ui` 不能当"整个 App 的布局系统"**：它内部没有 Yoga，跨端一致的布局仍须用 RN 的 View/Flexbox。**它是"原生控件的逃生舱 + 平台控件库"，不是布局基座。**

---

## 5. 判定：三层策略（对"现成还是自己写"的回答）

### 第 1 层 —— 用现成（**不要自己写**）

**判据：它承担的是"平台行为"，不是"视觉决定"。**

| 类别 | 采用 | 说明 |
|---|---|---|
| 系统容器 | `react-native-screens`、原生 Tab 实现（见设计阶段计划 §7.3）、`expo-router` | 宪法 4.3 明令禁止自绘导航壳 |
| 手势 / 动效 | `react-native-gesture-handler`、`react-native-reanimated` + `worklets` | 手势驱动动画必须在 UI 线程（宪法 8.4） |
| 原生控件 | **优先 `@expo/ui`**（其 drop-in 替代优先于社区库）；确有缺口再考虑社区库 | 官方原语库，不带来第二套视觉 |
| 列表虚拟化 | `@shopify/flash-list` 或 `@legendapp/list`（**零原生、可 OTA**） | 二者择一即可 |
| 图片 / 触感 / 系统图标 | `expo-image`、`expo-haptics`、`expo-symbols` | |
| 安全区 / 绘图 | `react-native-safe-area-context`、`react-native-svg` | |

**并有两条纪律**：① **一律 `npx expo install`**（gesture-handler 的 3.3.0 vs `~2.32.0` 就是活证据）；② **按包登记"许可证 / 是否含原生 / OTA 影响"**（宪法 3.4／11.4）。**能换成 `@expo/ui` 官方实现的，优先换掉第三方原生依赖。**

### 第 2 层 —— 自己写（**不要买**）

**判据：它是"视觉决定"或"本项目独有的约束"，任何库给不了。**

**自研范围 = 设计系统层**：

```
tokens/（Foundation → Semantic，每个颜色令牌带 contrastRatio/textSafe）
  ↑
theme/（dark 先定义、light 派生）
  ↑
ui/ 原子（约 12 个）：Surface / Text / Stack / Pressable / Icon / Badge /
                      Divider / Avatar / Skeleton / Input / Sheet / Toast
  ↑
ui/ 组合（约 20 个）：Button(CTA) / ListItem / Card / SectionHeader / EmptyState /
                      ErrorState / FormField / SearchField / TabSegment / Chip ...
  ↑
原型层：8 核心 + 9 扩展（宪法 9.1）
```

**必须自研的四条理由（每条都可验证）**：

1. **两把尺子只有自研才过得了**：零 `#hex` / `fontSize` 字面量、令牌必须携带实测算出的对比度、装饰色与状态色色相间距 ≥25°。
2. **方向是三种来源的**特定混合**，没有库实现**：`react-native-paper` 默认是 M3（两端都 M3，违反宪法 5.2 与第 1 条的混合定义）；Neo-Brutalism 库会扩散越界（§4.2）。
3. **双端分叉是要求，不是妥协**（宪法 5.2）：导航壳、弹层形态、动效曲线、字阶取值都要分端生成，而 UI kit 的价值恰恰是"两端统一"。
4. **旧 App 的失败模式是"组件库写了 0 引用"**：自研组件库的风险不在"写得不好"，而在"没被用"。所以宪法 9.5 把"第一个纵向切片必须真正消费组件库与令牌"设成门 —— 这条**只对自研组件库有效**，对买来的库是自动满足的，也就失去了约束力。

> **规模控制**：自研只做"本项目独有的视觉与结构"，**不重造手势、动效、虚拟化、物理**。第 1 层已经把这部分买掉了。

### 第 3 层 —— 评估但不作基座（**可借不可依赖**）

`nativewind` / `@shopify/restyle` / `react-native-unistyles` / `tamagui`（styling 部分）属于**样式引擎**：它们不带来视觉身份，理论上不冲突。**但本项目默认不引入**，理由：

- RN 的 `StyleSheet` + 令牌层已经足够，且**引入即多一层构建期依赖**（NativeWind 需要 Metro/Babel 配置，tamagui 带编译器）；
- 它们解决的是"样式怎么写"，而本项目的问题从来不是"写得麻烦"，而是"**没有唯一的令牌来源**"—— 那是架构问题，不是语法问题。

→ **结论：不引入。** 若将来确有需要，必须按宪法 3.4 走依赖准入 + ADR。

---

## 6. 证据索引

| 证据 | URL | 访问日期 |
|---|---|---|
| `@expo/ui` 官方文档（组件清单 + "primitives library" 原文 + Host/Yoga 约束） | https://docs.expo.dev/versions/latest/sdk/ui.md | 2026-10-01 |
| `react-native-paper` 官方 README（"UI kit"、"by default following Material Design"） | https://raw.githubusercontent.com/callstack/react-native-paper/main/README.md | 2026-10-01 |
| `tamagui` 仓库许可证（`spdx_id = MIT`） | https://api.github.com/repos/tamagui/tamagui | 2026-10-01 |
| 各包版本/许可证/最后发布时间 | `npm view <pkg> version license time.modified --json` | 2026-10-01 |
| M3 动效物理在 RN 无官方实现 | [调研-02 附录 B](../../06-Analyze/ui-research/App设计调研-02-Android与iOS平台规范.md) | 2026-09-30 |
| FlashList / LegendList 零原生代码 | [基座调研 §6.2](../../06-Analyze/tech-research/App基座调研-Expo与原生iOS混编.md) | 2026-09-30 |
| gesture-handler 版本陷阱（模板 `~2.32.0` vs latest 3.3.0） | [基座调研 §6.5](../../06-Analyze/tech-research/App基座调研-Expo与原生iOS混编.md) | 2026-09-30 |
| `@expo/ui` 含原生代码（实测） | [基座调研 §6.5](../../06-Analyze/tech-research/App基座调研-Expo与原生iOS混编.md) | 2026-09-30 |

---

## 7. 未能证实的事项（**不得当事实引用**）

| # | 事项 | 为什么没证实 |
|---|---|---|
| V1 | 各包**在 RN 0.86 / React 19.2 上的实际兼容性** | 只核对了版本与许可证，**没有实机安装验证**。真实兼容性须在脚手架期由 `npx expo install` 逐个确认。 |
| V2 | `react-native-bottom-tabs` 的实现细节（是否 `UITabBarController` / `BottomNavigationView`） | 未读其源码。**须在脚手架首周真机验证**（设计阶段计划 §7.3）。 |
| V3 | `@gorhom/bottom-sheet` 是否含原生代码 | 本次未实测；R3 的实测表未覆盖该包。**采用前须补测**。 |
| V4 | `tamagui` / `tamagui` 各子包在 npm 上缺少 `license` 字段的范围 | 只发现主包缺失；未逐一核查其子包。 |
| V5 | `@expo/ui` 各组件在各平台的具体可用性与成熟度差异 | 官方文档列出了组件名与平台归属，**未逐组件读稳定性标注**（如 `expo-symbols` 明确标为 BETA）。 |
| V6 | 是否存在与"三类白名单"兼容的 RN Neo-Brutalism 库 | 未枚举。**该缺口不影响结论**（§4.2：不需要）。 |
| V7 | 各库的**周下载量 / 采用度** | 本次未取。**不以"流行度"作为选型判据**（本项目判据是许可 + 原生 + 是否强加视觉）。 |
