# App 基座调研 —— Expo / React Native 现状 + iOS 原生混编路径 + Android 优先发布链路

> **文档定位**：为即将编写的《App 设计宪法》技术栈条款提供**可复现的一手证据**。本文不是宪法，不产生约束力；它只回答"事实是什么"与"哪些是硬门槛"。
>
> **调研执行时间**：2026-09-30 23:35 – 23:55（+08:00 / Asia/Shanghai）
> **执行者**：App 技术基座调研 Agent
> **工作目录**：`D:\.pogget\user_storage\u_a02ec0\d5cdb\XMUMDorm-2.0.0-LYZZ`
> **本机工具链**：npm 11.12.1（`npm --version` 实测）

## 0. 证据等级约定

全文每条结论前标注等级，**读者可据此决定信任度**：

| 标记 | 含义 | 可复现方式 |
| --- | --- | --- |
| **【一手实测】** | 本机执行命令得到的输出，或直接读取 npm 发布包的文件清单 | 命令 / URL 已写出，可原样重跑 |
| **【官方文档】** | 官方站点/官方 CHANGELOG 页面原文（含访问时间与链接） | 链接可重新打开 |
| **【推断】** | 由上述两类证据推导，官方未直接表述 | 已写明推导链，可能被推翻 |

**未能证实的事项集中列在第 10 节**，不得当作结论引用。

证据抓取方式说明：Expo / Google 文档站为 JS 重渲染页面，直接 HTTP 抓取会截断。本文所用页面正文通过 Jina Reader 代理（`https://r.jina.ai/<完整URL>`）获取**页面自身文本**，属"读官方页面"，非二手转述。

---

## 1. 结论速览（TL;DR）

1. **核实后的版本三元组（2026-09-30 23:35 +08:00）**：
   - **Expo SDK 57**（`expo@57.0.26`，npm `latest`）
   - **React Native 0.86.3**
   - **React 19.2.3**
   - SDK 57 GA 发布日：**2026-06-30**（npm 发布时间戳 + 官方 changelog 双证）

2. **仓库内旧调研"2026-06-30 发布 SDK 57 为最新稳定"这一说法，独立核实后仍然成立**——但结论**不是照抄得来**，而是通过三条独立证据重新确认：npm `latest` 指向 `57.0.26`；官方 changelog 最新一条仍是 2026-09-15 的 **SDK 58 Beta**（无 GA 条目）；SDK 58 官方 beta 公告明确写"beta 期 3–4 周""SDK 58 将等 React Native 0.88 正式版发布后再发"。**SDK 58 处于 Beta，不是稳定版。**

3. **新架构在 SDK 57 上已是唯一选项**：SDK 55 起新架构强制开启、**无法关闭**；RN 0.82 起移除了关闭开关；旧架构已于 2025 年 6 月冻结。这意味着第三方库选型**必须**按新架构（Fabric/TurboModule/Bridgeless）筛。**【官方文档】**

4. **`expo-router` 的原生 Tab，在当前稳定版 SDK 57 上仍带 `unstable-` 前缀**：SDK 54–57 用 `expo-router/unstable-native-tabs`，**SDK 58 起才改为稳定的 `expo-router/native-tabs`**。这是本次调研发现的**最需要所有者拍板的时间点分歧**。**【官方文档】**

5. **列表虚拟化的原生依赖风险已被官方消除**：`@shopify/flash-list@2.3.2` 与 `@legendapp/list@3.6.0` 经发布包文件清单实测**均不含任何原生代码**（无 `android/`、无 `ios/`、无 `.podspec`），属纯 JS → **不阻塞 OTA**。**【一手实测】**

6. **Google Play 当前硬门槛（已于 2026-08-31 生效，非未来时）**：新应用与应用更新**必须 target Android 16（API level 36）或更高**；可申请延期至 2026-11-01。**Expo SDK 57 的 `targetSdkVersion` 就是 36**，开箱即合规。**【官方文档】**

7. **新个人开发者账号上架前置条件：封闭测试 ≥12 名测试者连续 opted-in ≥14 天**（不是曾经流传的 20 人）。**【官方文档】**

8. `expo-brownfield@57.0.24` 确实存在且为官方包，iOS"原生混编"在 Expo 体系内**有官方叙事**（integrated / isolated 两种）。**【一手实测】+【官方文档】**

---

## 2. 版本事实（全部一手证据）

### 2.1 实测命令与原始输出

执行时间：**2026-09-30 23:35 (+08:00)**

```console
$ Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
2026-09-30 23:35:03 +08:00

$ npm --version
11.12.1

$ npm view expo dist-tags --json
{
  "sdk-52": "52.0.49",
  "sdk-53": "53.0.27",
  "canary-sdk-55": "55.0.3-canary-20260429-a5e59cf",
  "canary-sdk-56": "56.0.6-canary-20260701-9100865",
  "sdk-54": "54.0.37",
  "sdk-55": "55.0.31",
  "canary": "58.0.0-canary-20260909-ea7a89a",
  "next": "58.0.0",
  "latest": "57.0.26",
  "sdk-57": "57.0.26",
  "sdk-56": "56.0.23"
}
```

> 注意两点：`expo` 的 `latest` = **57.0.26**；**dist-tags 中不存在 `beta` 标签**（这与 Expo 文档里"Beta 版本使用 npm 的 `beta` 标签"的通用说法不一致，见第 10 节）。

```console
$ npm view expo time --json | (选取)
"54.0.0"            : 2025-09-10T18:41:54.022Z
"55.0.0"            : 2026-02-25T01:35:26.891Z
"56.0.0"            : 2026-05-20T21:57:07.263Z
"57.0.0"            : 2026-06-30T18:14:37.522Z
"57.0.26"           : 2026-09-29T10:57:08.644Z
"58.0.0-preview.0"  : 2026-09-10T19:42:22.849Z
"58.0.0-preview.8"  : 2026-09-28T12:25:01.278Z
"58.0.0"            : 2026-09-29T15:17:26.858Z
```

**【一手实测】** 由此得两条关键事实：
- SDK 57 正式版（`57.0.0`）发布于 **2026-06-30T18:14:37Z**；
- `expo@58.0.0`（无预发布后缀）已于 **2026-09-29T15:17:26Z** 发布，但**只挂在 `next` 标签下**，`latest` 仍是 57.0.26。

```console
$ npm view react-native dist-tags --json | (节选)
"0.86-stable": "0.86.3"
"latest": "0.87.1"
"next": "0.88.0-rc.3"

$ npm view react dist-tags --json | (节选)
"latest": "19.3.0"
```

### 2.2 SDK ↔ RN ↔ React 对照（官方锁定的配对）

**【一手实测】** 读取 Expo 官方模板的 `dependencies`（模板版本号即 SDK 补丁号）：

```console
$ npm view expo-template-blank@sdk-57 dependencies --json
{ "expo": "~57.0.26", "react": "19.2.3", "react-native": "0.86.3", "expo-status-bar": "~57.0.1" }

$ npm view expo-template-default@latest dependencies --json
{ "expo": "~57.0.26", "react": "19.2.3", "react-dom": "19.2.3", "react-native": "0.86.3",
  "expo-router": "~57.0.24", "@expo/ui": "~57.0.21", "expo-image": "~57.0.5",
  "react-native-reanimated": "4.5.1", "react-native-worklets": "0.10.1",
  "react-native-gesture-handler": "~2.32.0", "react-native-screens": "~4.26.0",
  "react-native-safe-area-context": "~5.7.0", "typescript": "~6.0.3", ... }

$ npm view expo-template-default@next dependencies --json   # SDK 58 Beta
{ "expo": "~58.0.0", "react": "19.3.0", "react-native": "0.88.0-rc.3",
  "expo-router": "~58.0.10", "react-native-reanimated": "4.7.0", "react-native-worklets": "0.13.0",
  "react-native-gesture-handler": "~3.2.1", "react-native-screens": "~4.28.0",
  "react-native-safe-area-context": "~5.9.1", "expo-image": "~58.0.8", ... }
```

**【官方文档】** `https://docs.expo.dev/versions/latest/`（访问于 2026-09-30）表格原文：

| Expo SDK version | React Native version | React version | React Native Web | Minimum Node.js |
| --- | --- | --- | --- | --- |
| 57.0.0 | 0.86 | 19.2.3 | 0.21.0 | **22.13.x** |
| 56.0.0 | 0.85 | 19.2.3 | 0.21.0 | 20.19.x |
| 55.0.0 | 0.83 | 19.2.0 | 0.21.0 | 20.19.x |
| 54.0.0 | 0.81 | 19.1.0 | 0.21.0 | 20.19.x |

同页的 Android/iOS 支持表（对 Play 合规极其关键）：

| Expo SDK | Android | `compileSdkVersion` | `targetSdkVersion` | iOS | Xcode |
| --- | --- | --- | --- | --- | --- |
| **57.0.0** | 7+ | **36** | **36** | 16.4+ | 26.4+ |
| 56.0.0 | 7+ | 36 | 36 | 16.4+ | 26.4+ |
| 55.0.0 | 7+ | 36 | 36 | 15.1+ | 26.2+ |
| 54.0.0 | 7+ | 36 | 36 | 15.1+ | 16.1+ |

### 2.3 是否有更新版本处于 Beta / RC —— 有，且官方原文明确

**【官方文档】** `https://expo.dev/changelog`（访问于 2026-09-30 23:40 +08:00）最新条目：

```
September 15, 2026   →  Expo SDK 58 Beta is now available
...
June 30, 2026        →  Expo SDK 57
```

页面**没有任何 SDK 58 GA 条目**。

**【官方文档】** `https://expo.dev/changelog/sdk-58-beta`（2026-09-15 发布，访问于 2026-09-30）原文摘录：

> "**The SDK 58 beta period begins today and will last three to four weeks.** The beta is an opportunity for developers to test out the SDK…"

> "SDK 58 beta includes **React Native 0.88 (Release Candidate)**. React Native 0.88 has not been released yet, so the beta uses the release candidate. **We will move to the stable release when React Native 0.88 ships, and release SDK 58 shortly after.** The full release notes for SDK 58 won't be available until the stable release…"

> "SDK 58 beta upgrades React Native from 0.86 to the 0.88 release candidate, so it picks up the changes from both React Native 0.87 and the React Native 0.88 release candidate."

**推断**：Expo 官方**跳过了 RN 0.87 的 SDK 配对**（SDK 57 = RN 0.86，SDK 58 = RN 0.88）。若成立，则"用 SDK 拿到 RN 0.87"这条路不存在。以 SDK 57 为准，RN 0.87 的改进（如 Strict TypeScript API 默认化）**尚未**进入可选技术栈。

**关于 `expo@58.0.0` 挂在 `next` 的解读（推断）**：官方公告称 SDK 58 仍在 beta 且要等 RN 0.88 正式版，`latest` 也未切换，因此 **不能**把 npm 上存在的 `58.0.0` 视为 GA。任何以"npm 上已有 58.0.0"为由判断 SDK 58 已稳定，都与官方 changelog 冲突，应以官方为准。

### 2.4 对旧调研的独立核实结论

| 项 | 旧调研说法 | 本次独立核实（2026-09-30） | 判定 |
| --- | --- | --- | --- |
| 最新稳定 SDK | SDK 57 | SDK 57（`expo@57.0.26` 为 npm `latest`） | ✅ 仍成立 |
| SDK 57 发布日 | 2026-06-30 | 2026-06-30T18:14:37Z | ✅ 精确一致 |
| 是否有更新版 | 未提及 | **SDK 58 Beta**（公告 2026-09-15，配 RN 0.88 RC） | ➕ 需补充 |
| SDK 57 配对 RN/React | 旧记录仅写 `mobile/` 为 SDK 56 + RN 0.85.3 | SDK 57 = **RN 0.86.3 / React 19.2.3** | ➕ 需更新 |

> 补充一手证据：`docs/07-Implement/App端全盘废弃与归档清理记录.md` 第 25 行记录被废弃的旧 `mobile/` 为 "Expo SDK 56 + RN 0.85.3 + Expo Router"。本次核实 SDK 56 官方配对为 RN 0.85 / React 19.2.3，与归档记录一致 —— 说明该归档记录可信。

---

## 3. 新架构（Fabric / TurboModules / Bridgeless）在目标版本上的状态

**【官方文档】** `https://docs.expo.dev/guides/new-architecture/`（访问于 2026-09-30）关键原文：

> "**SDK 55 and later run entirely on the New Architecture. The New Architecture is always enabled and cannot be disabled.** If you need to use the legacy architecture, use SDK 54 or earlier."

> "Starting with React Native 0.82, the New Architecture is always enabled and cannot be disabled. SDK 55 uses React Native 0.83, which inherits this behavior. **The legacy architecture was frozen in June 2025**, meaning no new features or bugfixes are being developed for it."

> "As of SDK 53, all `expo-*` packages in the Expo SDK support the New Architecture (**including bridgeless**)."

> "Additionally, all modules written using the **Expo Modules API support the New Architecture by default**! So if you have built your own native modules using this API, no additional work is needed."

> "As of January 2026, approximately **83% of SDK 54 projects** built with EAS Build use the New Architecture."

> "Since React Native 0.74, there are various **Interop Layers enabled by default**. This allows many libraries built for the old architecture to work on the New Architecture without any changes. However, **the interop is not perfect** and some libraries will need to be updated. The libraries that are most likely to require updates are those that **ship or depend on third-party native code**."

> "Expo Go only supports the New Architecture."

**对 SDK 57 的含义（推断）**：SDK 57 = RN 0.86 ≥ 0.82，因此 **Fabric + TurboModules + Bridgeless 三者全部强制开启，`newArchEnabled: false` 已完全失效**。不存在"先上新架构试试、不行退回"的退路。

### 第三方库要求与常见坑

**【官方文档】** 同页给出的验证工具与已知问题：
- Expo Doctor 集成 React Native Directory 检查：SDK 52+ 默认开启；可用环境变量 `EXPO_DOCTOR_ENABLE_DIRECTORY_CHECK=0/1` 覆盖；缺库告警可用 `listUnknownPackages` 关闭。
- 官方点名的已知问题库（原文，可能已随时间变化，**引用前建议重新核对该页**）：
  - `react-native-maps`：1.20.x（SDK 53 默认）靠 interop 层支持新架构，"works well for most features"；1.21.0 的"新架构优先"版本"is still stabilizing"。
  - `@stripe/react-native`：**≥0.45.0 起**支持新架构。
- 官方建议：若某库不兼容，先移除该库跑通，再决定替换；或改用 React Native Directory 标注兼容的替代库。

**常见坑清单（推断，基于上述证据 + 原生依赖实测）**：
1. **"有 interop 层"不等于"能正常工作"**：interop 对自带第三方原生代码的库最不可靠 → 选库时应优先选"原生依赖极少/无"或"官方声明新架构优先"的库。
2. **原生依赖 = 编译期耦合**：只要库里有 C++/Swift/Kotlin，就必须重新构建原生包（详见第 7 节每库的"原生依赖"列）。
3. **`newArchEnabled` 是死配置**：模板/配置里残留该字段不会报错但也不起作用，容易被误认为"已关闭"。
4. **Expo Go 只能跑新架构**：用 Expo Go 做的快速验证不能代表旧架构行为（对 SDK 57 已无意义，但可解释历史误解）。

### SDK 58 Beta 带来的新架构相邻变化（供提前评估，**不可现在依赖**）

**【官方文档】** SDK 58 Beta 公告（同上链接）：
- "**Expo Modules 2.0 beta**"：iOS 宏在 SDK 57 以实验形式出现，SDK 58 beta 起 iOS + Android 双端 beta。官方微基准称 Expo Modules 2.0 **在所有 12 项微基准中都快于 Expo Modules 1.0，并且每一项都快于 TurboModule**（例："a call with no arguments takes 112 ns against 2,837 ns"）。
- **Android 构建提速**：预编译 `expo-modules-core`。
- **SwiftPM 铺路**：RN 0.87 引入实验性 Swift Package Manager 支持；Expo 的 iOS 源码已重构为独立 SwiftPM target；"**CocoaPods remains the default and supported path**"。
- **iOS 27 场景生命周期**：iOS 27 SDK 要求 UIScene 生命周期，`npx expo prebuild` 将生成 **SceneDelegate.swift** 与 `UIApplicationSceneManifest`；手工管理 `ios/` 目录者需看迁移指南 `https://expo.fyi/ios-scene-lifecycle`。
- **RN Strict TypeScript API 成为默认**（RN 0.87 起）：`react-native/Libraries/*` 深导入变为类型错误；ref 类型改为 `ViewInstance` / `TextInputInstance`。SDK 58 周期内可临时用 `"customConditions": ["react-native", "react-native-legacy-deep-imports"]` 延后迁移，**该逃生口在 RN 0.88 之后移除**。
- **RN API 删除**：`InteractionManager`、`Touchable` 根导出、`NativeMethods` 类型、`Modal` 的 `animated` prop、`StatusBar` 的 `backgroundColor`/`translucent`/`networkActivityIndicatorVisible`；`ImageBackground` 被弃用。

---

## 4. 路由与导航

### 4.1 版本

**【一手实测】**

```console
$ npm view expo-router dist-tags --json
{ "sdk-54": "6.0.24", "sdk-55": "55.0.18", "sdk-56": "56.2.21",
  "sdk-57": "57.0.24", "latest": "57.0.24", "next": "58.0.10",
  "canary": "58.0.0-canary-20260909-ea7a89a" }
```

- 与 **SDK 57** 配对：`expo-router@57.0.24`（许可证 **MIT**）
- SDK 58 Beta 配对：`58.0.10`

### 4.2 原生 Tab 支持情况 —— 当前仍在 `unstable-` 前缀下

**【官方文档】** `https://docs.expo.dev/router/advanced/native-tabs/`（访问于 2026-09-30）**原文**：

> "The examples use `expo-router/native-tabs`, **available in SDK 58 and later**. **In SDK 54 through 57, use `expo-router/unstable-native-tabs` instead.**"

> "Unlike the [other tabs layout], **native tabs use the native system tab bar**."

> "Native tabs render platform-specific tab bars on Android and iOS, but **there is no standard system tab bar on web**. On web, native tabs fall back to a basic implementation, loosely based on iPad design."

> "**Native tabs are not designed to be a drop-in replacement** for JavaScript tabs. The native tabs are constrained to the native platform behavior…"

**这是本次调研最重要的时间点分歧**：在**当前稳定版 SDK 57** 上使用原生 Tab，导入路径带 `unstable-`；稳定路径要等 **SDK 58 GA**。

### 4.3 原生 Tab 已具备的能力（官方文档，SDK 57/58 通用部分）

| 能力 | API | 备注 |
| --- | --- | --- |
| 系统 Tab 栏 | `<NativeTabs>` | iOS UITabBar / Android 原生 tab bar |
| 图标 | `<NativeTabs.Trigger.Icon sf md src xcasset>` | `sf`=SF Symbols(iOS)，`md`=Material Symbols(Android)，`src`=自定义图片 |
| 文字 | `<NativeTabs.Trigger.Label>` | 支持 `hidden` |
| 角标 | `<NativeTabs.Trigger.Badge>` | 支持无参（仅小圆点） |
| 搜索 Tab | `role="search"` | 单独渲染为搜索项 |
| 隐藏/禁用 | `hidden` / `disabled` | 两者语义不同（移除 vs 不可点） |
| 点按已激活 Tab | `disablePopToTop` / `disableScrollToTop` | 默认回根 + 滚到顶 |
| Tab 栏收起 | `minimizeBehavior="onScrollDown"` | |
| 底部悬浮配件 | `<NativeTabs.BottomAccessory>` | 对应 Apple `UITabBarController.bottomAccessory` |
| Android 键盘避让 | `tabBarRespectsIMEInsets` | 默认键盘覆盖 Tab 栏 |
| 安全区 | `disableAutomaticContentInsets` | iOS 自动 content inset |

**SDK 55 的破坏性变更（原文）**：

> "SDK 55 changes how you access tab bar item components. Instead of importing `Icon`, `Label`, and `Badge` separately, use the compound component API: `NativeTabs.Trigger.Icon`, `NativeTabs.Trigger.Label`, and `NativeTabs.Trigger.Badge`. For Android icons, the `md` prop is the new recommended way to use Material Symbols."

**重要性能约束（原文）**：

> "**All tab screens in native tabs render eagerly when the navigator mounts.** This behavior cannot be changed because the native tab bar needs each screen to be available for transitions."

→ **推断**：若 App 有重 Tab（如首页 Feed、通信），必须用 `useIsFocused` / `useFocusEffect` 手动延迟加载，否则启动即渲染全部 Tab 内容。这会直接进入设计宪法的"启动性能预算"条款。

### 4.4 与文件式路由 / 深链 / 返回栈的关系

**【官方文档】** 同页：
- Native tabs 仍是 **Expo Router 文件式路由**下的 layout：`app/(tabs)/_layout.tsx` 用 `<NativeTabs>`，**不会自动把路由加进 Tab 栏**——必须显式声明 `<NativeTabs.Trigger name="...">`（原文："In contrast to the Stack navigator, tabs are not automatically added to the tab bar. You need to explicitly add them in your layout file using the `NativeTabs.Trigger`."）。
- 每个 Tab 内部仍是 Stack（返回栈独立），默认点按已激活 Tab 回根 —— 这是原生 Tab 的标准返回栈行为。
- `expo-linking` 深链与文件路由天然配合（SDK 57 配对 `expo-linking@57.0.11`）。**【一手实测】**（来自模板依赖）
- Web 端无系统 Tab 栏，官方建议用 `expo-router/ui` 的 headless tabs（`Tabs`/`TabList`/`TabTrigger`/`TabSlot`）按平台分文件重写 Tab 层。

### 4.5 SDK 58 的 expo-router 变化（**不可现在依赖**）

**【官方文档】** SDK 58 Beta 公告原文：

> "**`expo-router`**: the navigation core changes make navigation states and route keys deterministic, defer navigation dispatch until after commit, and remove a large portion of the forked react-navigation API surface. **`@expo/ui` and `expo-symbols` are now optional peer dependencies.**"

→ 迁移指南：`https://docs.expo.dev/router/migrate/sdk-57-to-58/`

**推断**：SDK 58 会带来一次 expo-router 内部重构（"remove a large portion of the forked react-navigation API surface"），意味着**基于 SDK 57 写的路由代码在升 SDK 58 时需要按迁移指南改动**。设计宪法若把"路由核心不得依赖 react-navigation 私有 API"写成条款，可显著降低这次升级成本。

---

## 5. iOS 原生混编的现实路径

已确认存在 **4 条官方/半官方路径 + 1 条反向路径**。

### 路径 A：Expo Modules API（本地模块，Swift/Kotlin）

**【官方文档】** `https://docs.expo.dev/modules/overview/` 与 `https://docs.expo.dev/modules/module-api/`（访问于 2026-09-30）：

> "The native modules API is an abstraction layer on top of **JSI** and other low-level primitives that React Native is built upon. It is built with modern languages (**Swift and Kotlin**)…"

> "The Expo Modules API has **similar performance characteristics to React Native's Turbo Modules API**. Both APIs leverage React Native's JSI…"

**官方选型建议（原文，转述 RN 团队建议）**：
> - "If you intend to use **C++** in your native module, use **Turbo Modules** since it provides easier access to lower-level mechanisms."
> - "If you are looking for a **better developer experience** and you are willing to depend on the `expo` package in your module, then use the **Expo Modules API**."

**能力清单（官方文档）**：
- `AsyncFunction` / `Function`：最多 **8 个参数**（受 Swift/Kotlin 泛型限制）；Android 支持 `Coroutine` 挂起函数；`Function` 同步、`AsyncFunction` 推荐（官方建议优先用 `AsyncFunction`）。
- `View()` 定义原生视图组件，可含 `Prop`、`Events`、`GroupView`、`AsyncFunction`；视图 ref 上的 `AsyncFunction` 默认在 **UI 线程**执行（例：`AsyncFunction("focus") { (view: UITextView) in ... }`）。
- 类型桥：`Record`（带 `@Field` 的类型安全结构体）、`Convertible` 协议（自定义 Swift 类型转换）。
- **SwiftUI 现状（关键原文）**：
  > "> Support for rendering **SwiftUI views is planned**. For now, you can use `UIHostingController` and add its content view to your UIKit view."

  → **推断**：用 Expo Modules API 的 `View()` 写 SwiftUI，需要自己包一层 `UIHostingController`；**纯 SwiftUI 体验请走路径 B（`@expo/ui`）**。

- **OTA 影响**：本地模块是**原生代码**，进入 App 二进制 → 改动**必须**重新构建原生包并升 `runtimeVersion`。JS 侧调用签名变化也可能需要；但模块**内部**实现变化只要签名不变，可随原生包一起发布，**不能**通过 OTA 单独下发。
- **维护成本**：低—中。与 SDK 升级解耦较好（Expo 官方承诺所有 Expo Modules API 写的模块默认支持新架构，且 SDK 升级时 autolinking 自动处理）。**【官方文档】**

### 路径 B：`@expo/ui` —— 官方原生组件库（SwiftUI + Jetpack Compose）

这是"**官方原生 Material 组件方案**"的答案。

**【一手实测】**
```console
$ npm view @expo/ui version license description --json
{ "version": "57.0.21", "license": "MIT", "description": "A collection of UI components" }
```

**【官方文档】** `https://docs.expo.dev/versions/latest/sdk/ui/`（访问于 2026-09-30）：

> "A set of components that allow you to build UIs **directly with Jetpack Compose and SwiftUI** from React."

> "`@expo/ui` is a set of native input components… It aims to provide the commonly used features and components that a typical app will need."

> "**Native primitives**: Expo UI is not another UI library. It brings Jetpack Compose and SwiftUI primitives to React Native."
> "**1-to-1 mapping**: Components map one to one to their native counterparts."
> "**Full-app support**: … You can write an entire app with it, or adopt it **one screen at a time**."

三个入口：
- `@expo/ui/jetpack-compose`（Android，Jetpack Compose 组件）
- `@expo/ui/swift-ui`（iOS，SwiftUI 组件；**不能在 Android/Web 使用**）
- `@expo/ui/universal`（一套组件树跑 Android/iOS/Web）

**必须知道的约束（原文）**：
> "**Flexbox styles apply to the `Host` component itself. Once you are inside the native context, Yoga is not available.** Define layouts with `Row` and `Column` on Android, or `HStack` and `VStack` on iOS."

> "`Host` is the bridge between React Native and the native UI toolkit. **You must wrap every Expo UI component in one.**"

> "Yes, you can place React Native components as JSX children of Expo UI components. Expo UI automatically creates a `UIViewRepresentable` wrapper for you. However… **once you render React Native components, you're leaving the SwiftUI context. To add Expo UI components again, reintroduce a `Host` wrapper.**"

**成熟度证据（原文）**：文档引用示例仓库时称其为 "the **production-ready** Expo UI package **available in SDK 56 and later**"，且 SDK 57 官方默认模板已内置 `@expo/ui`。**【官方文档】+【一手实测】**

- **OTA 影响**：含原生代码（见第 7 节实测）→ 升级 `@expo/ui` 版本通常需要重新构建原生包。
- **维护成本**：低（官方维护，随 SDK 发版）。

### 路径 C：Nitro Modules（第三方，JSI）

**【一手实测】**
```console
$ npm view react-native-nitro-modules version license --json
{ "version": "0.37.1", "license": "MIT" }
```
发布包含 `android/`、`ios/`、`cpp/`、`NitroModules.podspec` → **原生依赖存在**。

**【官方文档】** GitHub `mrousavy/nitro` README（访问于 2026-09-30）：
> "**Nitro Modules** are fast, type-safe native modules for React Native with **statically compiled bindings to JSI**."
> "JS <-> C++ type converters are **statically generated ahead of time** - no more dynamic lookups or runtime parser errors!"
> "iOS native modules and view components can be written either in pure C++, or **pure Swift**. Thanks to Swift 5.9, Swift Nitro Modules **bridge directly to C++** instead of going through Objective-C message sends… **zero overhead** C++ → Swift calls."
> "Android native modules and view components can be written either in pure C++, or pure Kotlin/Java."

**成熟度判断（推断）**：包版本为 **0.37.1（< 1.0.0）**，官方 README 未出现 "production-ready"/"stable" 字样，且工具链依赖 `nitrogen` 代码生成。**推断为"可用但仍在快速演进"**，不宜作为新项目的**主**原生桥接方案；适合明确的性能敏感场景。

- **适用场景**：高频 JS↔Native 调用、零拷贝大数据（音视频帧、图像缓冲）、需要 C++ 复用已有库。
- **OTA 影响**：**有**（原生代码 + 代码生成产物）。
- **维护成本**：中—高（引入第二套原生模块体系，与 Expo Modules API 并存，SDK 升级需自行验证）。

### 路径 D：Fabric 原生组件（RN codegen）

**【官方文档】** Expo 新架构页确认库需自带 Fabric 组件实现；`react-native-screens`、`react-native-safe-area-context`、`react-native-svg` 均为实测含 `common/cpp/.../ShadowNode.cpp` 的 Fabric 组件样例（见第 7 节）。

- **适用场景**：需要自绘/极高性能的自定义 View（如画布、复杂图表、相机预览）。
- **OTA 影响**：有（原生 + codegen）。
- **维护成本**：高（需自行维护 Fabric 组件、codegen 配置、双端实现）。

### 路径 E（反向）：`expo-brownfield` —— 把 Expo 嵌进已有原生 App

**【一手实测】**
```console
$ npm view expo-brownfield version license description --json
{ "version": "57.0.24", "license": "MIT",
  "description": "Toolkit and APIs for adding brownfield setup to Expo projects" }
$ npm view expo-brownfield dist-tags --json
{ "sdk-56": "56.0.30", "sdk-57": "57.0.24", "latest": "57.0.24", "next": "58.0.9", ... }
```

**【官方文档】** `https://docs.expo.dev/brownfield/overview/`（访问于 2026-09-30）：

> "When you integrate React Native into an existing native app, you can choose between two main approaches: **integrated** and **isolated**."

> "### Integrated approach — In the integrated approach, your React Native code lives inside your existing native project… Choose this approach if: You need to frequently iterate on both native and React Native code together…"

> "### Isolated approach — … you package your React Native app as a **native library (using AAR for Android and XCFramework for iOS)**… Choose this approach if: You have separate teams… You prefer to treat the React Native part of your app as a self-contained module."

**推断（重要）**：`expo-brownfield` 解决的是**"原生 App 里塞 RN"**，而本项目是**"RN App 里塞原生"**，方向相反。因此：
- 现阶段**不需要** `expo-brownfield`；
- 但它的存在证明 Expo 官方**支持双向边界**。若未来 iOS 决定"原生为主、RN 为辅"（isolated 模式），这条路是官方支持的。

### 5.5 判据：什么情况下值得为 iOS 单独写原生

以下为**推断**（由上述官方能力与约束推导），作为宪法候选判据而非事实陈述：

**值得写原生（iOS 专属）**：
1. **系统能力的 Swift/SwiftUI 独占 API 且 RN 生态无等价物**：如 WidgetKit/Live Activity、App Intents/Siri、StoreKit 2 的复杂订阅态、HealthKit、SwiftUI 专属导航/动效。
2. **需要 Apple 原生组件的视觉/交互一致性**，且 `@expo/ui/swift-ui` 已覆盖该组件 → **优先用 `@expo/ui`，不要自己写**（零维护成本、官方随 SDK 升级）。
3. **性能瓶颈落在 JS↔Native 边界**且无法用 `@expo/ui` 或现成库解决（此时按路径顺序：Expo Module → Fabric 组件 → Nitro Modules）。
4. **需要复用已有 Swift/Objective-C 公司库/SDK**（如第三方认证、支付 SDK 的 iOS 版本）。

**不值得写原生**：
1. **双端都能做、只是"原生手感更好"**：优先 `@expo/ui/universal` 或平台分文件的 JS 实现 —— 原生代码会进入"每 SDK 升级都要验证"的维护税区。
2. **布局密集的页面**：Expo UI 内部**没有 Yoga/Flexbox**，用 SwiftUI 重写整页布局的收益通常低于成本。
3. **只为绕过 RN 的样式限制**：先试 Reanimated 4 + 新架构，多数动效不必下沉。
4. **希望通过 OTA 快速迭代的部分** —— 原生代码**永远不能** OTA，凡是"预计要频繁改"的界面都不该用原生写。

**决策记录要求（建议写入宪法）**：任何"为 iOS 单独写原生"的决定，必须落一份 ADR，写明：① 上面哪条判据命中；② 为何现成方案（`@expo/ui` / 现有库）不满足；③ 该模块是否需要 JS 侧调用（决定它是 Expo Module 还是纯 SwiftUI 页面）；④ 该模块是否随 SDK 升级需要额外验证。

---

## 6. 关键运行时库现状

**说明**：
- "**SDK 57 锁定**"列取自 Expo 官方模板 `expo-template-default@latest`（= SDK 57）的 `dependencies`，即 `npx expo install` 会装的版本 → **这是应写入宪法的版本，不是 npm latest**。
- "**原生依赖**"列由**发布包文件清单实测**判定（`https://unpkg.com/<pkg>@<ver>/?meta`，列出 tgz 内全部文件；判定规则：存在 `android/`、`ios/`、`.podspec`、`.kt`、`.swift`、`.cpp` 即视为含原生代码）。
- "**OTA 影响**"= 该库变化是否需要重新构建原生包（因而必须升 `runtimeVersion`）。

### 6.1 核心框架与路由

| 库 | SDK 57 锁定 | npm latest | 许可证 | 原生依赖 | OTA 影响 |
| --- | --- | --- | --- | --- | --- |
| `expo` | `~57.0.26` | 57.0.26 | MIT ✅ | 有（框架本体 + native runtime） | **有** |
| `expo-router` | `~57.0.24` | 57.0.24 | MIT ✅ | 有（依赖 `react-native-screens` 等原生栈） | **有** |
| `expo-modules-core` | `~57.0.20` | 57.0.20 | MIT ✅ | 有 | **有** |
| `expo-status-bar` | `~57.0.1` | 57.0.1 | MIT ✅ | 有（原生模块） | 有 |
| `expo-constants` | `~57.0.20` | — | MIT ✅ | 有 | 有 |
| `expo-splash-screen` | `~57.0.9` | — | MIT ✅ | 有 | 有 |
| `expo-system-ui` | `~57.0.4` | — | MIT ✅ | 有 | 有 |

> `expo-constants` / `expo-splash-screen` / `expo-system-ui` 的 npm latest 未逐一单独查询（模板版本即为 SDK 57 锁定版），许可证未单独查询 → 标注为**未能证实**（见第 10 节）。它们属 Expo 官方包，随 SDK 发版。

### 6.2 列表虚拟化（重点：均无原生依赖）

| 库 | SDK 57 说明 | npm latest | 许可证 | 原生依赖 | OTA 影响 |
| --- | --- | --- | --- | --- | --- |
| `@shopify/flash-list` | 模板未内置，需手动装 | **2.3.2** | **MIT** ✅ | **无（实测）** | **无** ✅ |
| `@legendapp/list` | 模板未内置，需手动装 | **3.6.0** | **MIT** ✅ | **无（实测）** | **无** ✅ |

**【一手实测】** 发布包文件清单：
```console
$ https://unpkg.com/@shopify/flash-list@2.3.2/?meta  → 300 files
  top-level: dist, jestSetup.js, LICENSE.md, package.json, README.md, src
  nativeMarkers(0): NONE

$ https://unpkg.com/@legendapp/list@3.6.0/?meta      → 29 files
  top-level: animated.*, keyboard.*, react.*, react-native.*, section-list.*, README.md, ...
  nativeMarkers(0): NONE
```

**【一手实测】** FlashList v2 README（发布包内 `README.md`）原文：
> "**FlashList v2 has been rebuilt from the ground up for RN's new architecture** and delivers fast performance… We've achieved all this while **moving to a JS-only solution!**"
> "> ⚠️ **IMPORTANT:** **FlashList v2.x has been designed to be new architecture only and will not run on old architecture.**"
> "- **JS-only solution in v2**: **No native dependencies**, making it easier to maintain while delivering fast performance."

**【一手实测】** LegendList README 原文：
> "**Legend List** is a high-performance list component for **React Native**, written **purely in Typescript with no native dependencies**. It is a **drop-in replacement** for `FlatList` and `FlashList` with better performance, especially when handling dynamically sized items."
> "- **100% JS:** No native module linking required, ensuring easy integration and compatibility across platforms."

**【一手实测】** peerDependencies：
```console
$ npm view @shopify/flash-list@2.3.2 peerDependencies --json
{ "@babel/runtime": "*", "react": "*", "react-native": "*" }
$ npm view @legendapp/list@3.6.0 peerDependencies --json
{ "react": "*" }
```

**推断**：两者都是 **OTA 友好**的纯 JS 库。**FlashList 2.x 强制要求新架构**（官方 README 明示），而 SDK 57 恰好只有新架构 → **兼容**。LegendList 对 architecture 无强制声明，但作为纯 JS 库在 SDK 57 上无风险。**列表方案可以不因 OTA 约束而受限**，这是本次调研对"双端体验各自最优"最有利的一条发现。

### 6.3 图片

| 库 | SDK 57 锁定 | npm latest | 许可证 | 原生依赖 | OTA 影响 |
| --- | --- | --- | --- | --- | --- |
| `expo-image` | `~57.0.5` | 57.0.5 | **MIT** ✅ | **有（实测）** | **有** |

**【一手实测】** 文件清单：`top: android, ios, build, plugin, prebuilds, local-maven-repo, expo-module.config.json, spm.config.json, src, …`，`nativeMarkers(92)`，例：`/android/src/main/java/expo/modules/image/dataurls/Base64DataFetcher.kt`。

**含义（推断）**：升级 `expo-image` **需要重新构建原生包**（属 SDK 升级范畴，不是 OTA 范畴）。注意其 `prebuilds` 与 `local-maven-repo` 说明提供预编译产物，对构建速度有利。

### 6.4 动效（Reanimated + Worklets）

| 库 | SDK 57 锁定 | npm latest | 许可证 | 原生依赖 | OTA 影响 |
| --- | --- | --- | --- | --- | --- |
| `react-native-reanimated` | **4.5.1** | 4.7.0 | **MIT** ✅ | **有（实测）** | **有** |
| `react-native-worklets` | **0.10.1** | 0.13.0 | **MIT** ✅ | **有（实测）** | **有** |

**【一手实测】** 文件清单与原生标记：
```console
reanimated@4.7.0 : 2435 files | top: android, apple, Common, include, lib, plugin, RNReanimated.podspec, ...
                   nativeMarkers(183) 例 /Common/cpp/reanimated/Fabric/updates/AnimatedPropsRegistry.cpp
worklets@0.13.0  :  555 files | top: android, apple, Common, plugin, RNWorklets.podspec, ...
                   nativeMarkers(89)  例 /Common/cpp/worklets/AnimationFrameQueue/AnimationFrameBatchinator.cpp
```

**【一手实测】** peerDependencies（**版本配对硬约束，极重要**）：
```console
$ npm view react-native-reanimated@4.7.0 peerDependencies --json
{ "react": "*", "react-native": "0.86 - 0.88", "react-native-worklets": "0.13.x" }

$ npm view react-native-reanimated@4.5.1 peerDependencies --json
{ "react": "*", "react-native": "0.83 - 0.86", "react-native-worklets": "0.10.x" }

$ npm view react-native-worklets@0.13.0 peerDependencies --json
{ "react": "*", "@babel/core": "*", "react-native": "0.86 - 0.88", "@react-native/metro-config": "*" }
```

**推断**：SDK 57（RN 0.86.3）处于两个 Reanimated 大版本的**交叠边界**：
- 官方锁定 `4.5.1` + `0.10.1`（支持 RN 0.83–0.86）；
- `4.7.0` 声明支持 RN 0.86–0.88，**理论上也能跑在 RN 0.86 上**，但**不是官方锁定组合**。
→ **建议宪法规定：Reanimated 与 Worklets 版本必须由 `npx expo install` 决定，禁止手工指定版本**，避免出现 `4.7.0 + 0.10.1` 这类 peer 冲突组合。

**【官方文档】** `https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started`（访问于 2026-09-30）原文：
> "**Reanimated 4.x works only with the React Native New Architecture (Fabric).** If your app still uses the old architecture, you can use Reanimated in version 3 (which is no longer actively maintained)."

> "This library requires an installation of the **`react-native-worklets` dependency. It was separated from `react-native-reanimated` for better modularity and must be installed separately.**"

> "When using React Native Community CLI, you also need to manually add the **`react-native-worklets/plugin`** plugin to your `babel.config.js`… `react-native-worklets/plugin` **has to be listed last**."

> "Since **Expo SDK 50**, the Expo starter template includes the Worklets Babel plugin by default."

**含义（推断）**：Reanimated 4 **不构成对 SDK 57 的阻碍**（SDK 57 只有新架构），但 **Worklets 是独立包，必须显式存在于依赖树**；Babel 插件顺序（必须最后）是易踩的坑。**Reanimated 属原生依赖 → 升级需重建，不能 OTA。**

### 6.5 手势 / 触感 / 原生组件

| 库 | SDK 57 锁定 | npm latest | 许可证 | 原生依赖 | OTA 影响 |
| --- | --- | --- | --- | --- | --- |
| `react-native-gesture-handler` | `~2.32.0` | 3.3.0 | **MIT** ✅ | **有（实测）** | **有** |
| `expo-haptics` | 模板未内置（`57.0.3`） | 57.0.3 | **MIT** ✅ | **有（实测）** | **有** |
| `@expo/ui` | `~57.0.21` | 57.0.21 | **MIT** ✅ | **有（实测）** | **有** |
| `react-native-screens` | `~4.26.0` | 4.28.0 | **MIT** ✅ | **有（实测）** | **有** |
| `react-native-safe-area-context` | `~5.7.0` | 5.10.1 | **MIT** ✅ | **有（实测）** | **有** |
| `react-native-svg` | 模板未内置 | 15.15.5 | **MIT** ✅ | **有（实测）** | **有** |

**【一手实测】** 原生标记计数与样例：
```console
gesture-handler@3.3.0        : 1368 files | nativeMarkers(81)  | /shared/shadowNodes/.../RNGestureHandlerDetectorShadowNode.cpp
expo-haptics@57.0.3          :   56 files | nativeMarkers(11)  | /android/src/main/java/expo/modules/haptics/HapticsModule.kt
@expo/ui@57.0.21             : 1250 files | nativeMarkers(233) | /android/src/main/java/expo/modules/ui/AlertDialogView.kt
screens@4.28.0               : 1835 files | nativeMarkers(591) | /android/src/main/cpp/jni-adapter.cpp
safe-area-context@5.10.1     :  183 files | nativeMarkers(62)  | /common/cpp/.../RNCSafeAreaViewShadowNode.cpp
react-native-svg@15.15.5     : 1480 files | nativeMarkers(287) | /android/gradlew, /windows/RNSVG/BrushView.cpp
```

**【推断】手势版本有跨大版本风险**：SDK 57 锁 `~2.32.0`，而 npm latest 已是 **3.3.0**（SDK 58 Beta 锁 `~3.2.1`）。**不要手装 3.x 到 SDK 57 项目**——这是典型的"npm latest ≠ 该装版本"陷阱，必须由 `npx expo install` 决定。

**【一手实测】** `react-native-gesture-handler` 2.32.0 与 3.3.0 的 peerDependencies 都只写 `{"react":"*","react-native":"*"}`（**无版本上界保护**）→ **推断**：装错版本 npm 不会拦截，只会在运行时/编译时炸。宪法应把"禁止手工指定原生库版本"写成硬约束。

### 6.6 状态 / 数据 / 存储 / 校验（对 `shared/` 复用有意义）

| 库 | 当前 | 许可证 | 原生依赖 | OTA 影响 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `@tanstack/react-query` | 5.104.0（Web 端在用 `^5.96.2`） | **MIT** ✅ | 纯 JS（**推断**，未实测包内容） | 无 | React 19 兼容，可跨 Web/App |
| `@react-native-async-storage/async-storage` | 3.1.1 | **MIT** ✅ | **有（实测：`android`, `apple`, `.podspec`, `windows`）** | **有** | 基础 KV 存储 |
| `react-native-mmkv` | 4.3.2 | **MIT** ✅ | 有（未实测，属原生 KV 库） | 有 | 更快的 KV，代价是原生依赖 |
| `expo-secure-store` | 57.0.4 | **MIT** ✅ | 有（Expo 原生模块） | 有 | 密钥/Token 安全存储 |
| `zod` | 4.6.5 | **MIT** ✅ | 无（纯 TS） | 无 | 可跨 Web/App 复用 |
| `typescript` | npm latest **7.0.2**（Apache-2.0 ✅） | SDK 57 模板锁 **`~6.0.3`** | — | — | **不要装 7.x** |

### 6.7 其他常见原生能力（Expo 官方，均为 MIT + 原生依赖 + 影响 OTA）

**【一手实测】**
```console
expo-notifications   57.0.21  MIT     (推送/本地通知)
expo-camera          57.0.6   MIT
expo-image-picker    57.0.20  MIT
expo-updates         57.0.24  MIT     (OTA 客户端本体)
expo-secure-store    57.0.4   MIT
eas-cli              24.8.0   MIT
```

---

## 7. 构建与发布链路（Android 优先）

### 7.1 EAS Build vs 本地 prebuild 的取舍

**【官方文档】** `https://docs.expo.dev/workflow/continuous-native-generation/`（访问于 2026-09-30）核心原文：

> "Instead of creating native projects a single time and maintaining customizations to those native projects for the lifetime of the codebase, **short-lived native projects are generated only when needed**… the developer is responsible for **only maintaining the definition of their customizations**, rather than all of the native project code."

> "If your project **does not contain `android` and `ios` directories, EAS Build will run Prebuild to generate these native directories before compilation.** This is the default behavior for any project created using `npx create-expo-app`."

> "For a project that **has `android` and `ios` directories, EAS Build will not run Prebuild** to avoid overwriting any changes you've made to the native directories."

> "If you modify the generated directories manually then you **risk losing your changes the next time you run `npx expo prebuild --clean`**. Instead, use **config plugins**…"

> "The `android` and `ios` directories are **automatically added to `.gitignore`** when you create a new project…"

> "`--clean` option deletes any existing native directories before generating. Re-running `npx expo prebuild` without the `--clean` option will layer changes on top of the existing files, which is faster, but **may not produce the same results**… some config plugins aren't idempotent."

> "When using the `--clean` option, you'll be warned if you have any uncommitted changes… This prompt is optional and will be **skipped when encountered in CI**. You can disable this check by enabling the environment variable `EXPO_NO_GIT_STATUS=1`."

> "Prebuild is **optional** and works seamlessly with all Expo tools and services… Everything offered by Expo including EAS, Expo CLI, and the libraries in the Expo SDK are built to fully support existing React Native projects… **The only exception is the Expo Go app**."

**取舍建议（推断）**：

| 维度 | CNG + EAS Build（推荐给本项目） | 提交原生目录 / 本地构建 |
| --- | --- | --- |
| iOS 原生混编友好度 | **好**：Swift 代码放进本地 Expo Module（有 `ios/` 目录时需保证不被 `--clean` 抹掉 → 用 config plugin 或在 prebuild 后由脚本注入） | 最好但代价大 |
| SDK 升级成本 | **低**（重跑 prebuild） | 高（手工 merge 模板） |
| 双端差异化（iOS 原生、Android 优先） | 支持：config plugin 按平台分支 | 支持 |
| CI 可复现性 | **高**（无原生目录即无状态漂移） | 中（原生目录成为需 review 的产物） |
| 首次接入成本 | 低 | 中 |

**关键决策点（推断）**：一旦 iOS 开始写原生 Swift，**必须**有一套明确规则回答"这段 Swift 放哪"：
- **推荐**：写成本地 Expo Module（`modules/<name>/ios/*.swift`），**不进 `ios/` 目录** → 与 CNG 完全兼容，`--clean` 不会伤到它。
- **避免**：直接改 prebuild 生成的 `ios/AppDelegate.swift` 等 → 下次 `--clean` 丢失。若确实必须改，走 config plugin（官方明确推荐）。

### 7.2 CI 可行性

**【官方文档】** `https://docs.expo.dev/submit/android/`（访问于 2026-09-30）原文：

> "**EAS Submit** is the recommended way to upload your Android app to the Google Play Store. The `eas submit` command **works the same way on your machine and inside CI/CD**."

> "You can run `eas submit` from **any CI/CD service, such as GitHub Actions, GitLab CI, and others**… This requires a **personal access token** to authenticate with your Expo account. **Set the `EXPO_TOKEN` environment variable in your CI service** so `eas submit` can run non-interactively."

> "**EAS Workflows** runs the same `eas submit` command on EAS infrastructure, triggered by a git push or run manually from CLI."

**【官方文档】** CNG 页确认 `--clean` 的交互提示"is skipped when encountered in CI"，且提供 `EXPO_NO_GIT_STATUS=1`。

**【推断】** CI 可行性：**高**。要点：
- 用 `EXPO_TOKEN`（personal access token）做非交互认证；
- `eas build --platform android` + `eas submit --platform android --profile production` 可在 GitHub Actions 跑；
- Node 版本**必须 ≥ 22.13.x**（SDK 57 最低要求，见 §2.2）；
- CI 中跑 `npx expo prebuild --clean` 安全（会跳过 git 状态提示）。

### 7.3 `runtimeVersion` / OTA 纪律

**【官方文档】** `https://docs.expo.dev/eas-update/runtime-versions/`（访问于 2026-09-30）原文：

> "Runtime versions are a property that **guarantees compatibility between a build's native code and an update**… the build will contain some native code that **cannot be changed with an update**. Therefore, an update must be compatible with a build's native code to run on the build."

> "Since updates must be compatible with a build's native code, **any time native code is updated, we're required to make a new build before publishing an update.**"

> "The `"appVersion"` policy will increment the runtime version whenever the app version is incremented, but **if you forget to bump the app version when changing the native runtime, then you'll have a runtime version mismatch**. If you want to make incompatible updates **extremely unlikely**, at the cost of making it necessary to **create builds more often**, then you can use the **`"fingerprint"` policy**. This will increment the runtime version whenever anything that may impact the native runtime changes."

> "Later on, imagine that we developed an update that relied on a newly installed native library, like the `expo-camera` library, and we did not update the `"runtimeVersion"` property… `expo-updates` may detect an error and **attempt to roll back** to the previously working update."

> "Use **rollouts** to publish the update to a small percentage of users and monitor the error rate… Alternatively, you can opt in certain users of your app to receive the update with **channel surfing**."

**【推断】OTA 纪律建议**：
1. **policy 选型**：`fingerprint` 最安全（不会漏 bump），代价是构建次数增加。对本项目"双端各自最优 + iOS 混原生"的形态，**fingerprint 更契合**——因为 iOS 原生代码变更很容易被遗忘。
2. **硬规则**：任何新增/升级含原生代码的依赖（本文 §6 中标注"原生依赖=有"的每一行）**必须**触发新构建 + `runtimeVersion` 变化。
3. **两条铁轨**：原生变更 → 走商店审核（天级）；纯 JS/资源变更 → 走 OTA（分钟级）。团队需在宪法里划清"什么算原生变更"（用 §6 的表格作为白名单依据）。
4. **渐进发布**：用 rollouts + 错误率监控；准备好 rollback。
5. **不用 OTA 绕过审核**：本文档不评估 Apple/Google 对 OTA 内容的政策边界（**未能证实**，见 §10）。

### 7.4 签名密钥管理（Android）

**【官方文档】** `https://support.google.com/googleplay/android-developer/answer/9842756?hl=en`（Use Play App Signing，访问于 2026-09-30）原文：

> "With Play App Signing, **Google manages and protects your app's signing key** on the same secure infrastructure that Google uses to store its own keys. These keys are protected by Google's Key Management Service (KMS)."

> "**Upload key** — You (**Keep this secure!**)。Format: Stored in a Java keystore (`.jks` or `.keystore`)。Purpose: You use this key to sign your app bundle before uploading it to the Play Console. Google uses it to verify your identity. **If compromised or lost, Google can reset this key for you.**"

> "* **Format**: Stored in a Java keystore… **Purpose:** Google uses this key to sign the final APKs delivered to users' devices. You can have Google generate this, or you can provide your own. **This key cannot be reset if you manage it yourself** (without Play App Signing) and lose it."

> "**Note**: For maximum security, your **upload key and app signing key should be different**."

> "Because Google signs the final APK, **you must register the Google-held app signing key fingerprint with your API providers**, not just your local upload key."

> "3. Copy the required fingerprints (**SHA-1 or SHA-256**)…"

**【官方文档】** Android 开发者站 `https://developer.android.com/guide/app-bundle`（访问于 2026-09-30）原文：

> "**Important:** From **August 2021**, new apps are **required to publish with the Android App Bundle** on Google Play. New apps larger than 200 MB are now supported by either Play Feature Delivery or Play Asset Delivery. From June 2023, new and existing TV apps are required to be published as App Bundles."

> "Publishing with Android App Bundles helps your users to install your app with the smallest downloads possible… the total size of the compressed APKs required to install your app… **must be no more than 4 GB**."

**【官方文档】** EAS Submit Android 页（同上）原文：
> "If this is your app's first submission, the default `eas submit` command works out of the box and **creates your app's first release on the internal testing track**. Before running it, complete the prerequisites so that your app exists on Google Play Console and **EAS has a Google Service Account key** to submit on your behalf. The app stays in **draft** status in Play Console until you complete the store listing and setup tasks, which are required before a release can be promoted to production."

> "Want to upload without rolling out? Set **`releaseStatus` to `draft`** in the submission profile in `eas.json`, and complete the release in Play Console."

> "Prefer doing the first upload yourself? Follow the manual submission guide…"

**【推断】密钥管理建议**：
- 采用 **Play App Signing**（Google 托管 app signing key）；本地只持有 **upload key**（可被 Google 重置）。
- **upload key 不得进仓库**：用 EAS credentials（`eas credentials`）或 CI secret 管理；`.gitignore` 覆盖 `*.jks` / `*.keystore` / `credentials.json`。
- 因最终签名由 Google 完成，**所有依赖签名指纹的服务端/第三方配置，必须登记 Google 侧 SHA-1/SHA-256**（如微信/Google 登录/OAuth 回调）→ 建议宪法要求"新增指纹相关第三方集成时，同时登记本地上传密钥与 Google app signing key 两套指纹"。
- 首次上架先走 **internal testing track + `releaseStatus: draft`**，人工完成商店资料后再提升到 production。

---

## 8. 商店合规硬要求（Android 优先，逐条给官方来源）

> **本节全部为"能否上架"的前置条件。** 所有日期与数字均来自官方页面原文，抓取时间 2026-09-30。

### 8.1 Target API level（**已生效，不是未来要求**）

**【官方文档】** `https://developer.android.com/google/play/requirements/target-sdk`（访问于 2026-09-30）原文：

> "**Starting August 31 2026:**
> * **New apps and app updates must target Android 16 (API level 36) or higher** to be submitted to Google Play; except for Wear OS and Android Automotive OS apps, which must target Android 15 (API level 35) or higher, and Android TV and Android XR apps, which must target Android 14 (API level 34) or higher.
> * Existing apps must target Android 15 (API level 35) or higher to remain available to new users on devices running Android OS higher than your app's target API level…
>
> If you need more time to update your app, you'll be able to request an **extension to November 1, 2026**. You'll be able to access your app's extension forms in Play Console later this year."

**【官方文档】** 对应政策页 `https://support.google.com/googleplay/android-developer/answer/11926878?hl=en`（访问于 2026-09-30）原文补充：
> "When you publish a new app, you must target **Android 16 (API level 36) or higher**."
> "When you update your app, you must target **Android 16 (API level 36) or higher**."
> 时间线表：`Android 16 (API level 36)` → 要求日期 **August 31, 2026**；上一年为 `Android 15 (API level 35)` → August 31, 2025。

**✅ 对本项目的直接结论**：
- **当前已生效要求 = targetSdk 36**。今天是 2026-09-30，**已经过了 2026-08-31 门槛一个月**。
- **Expo SDK 57 的 `targetSdkVersion` = 36、`compileSdkVersion` = 36**（见 §2.2 官方表）→ **开箱即满足，无需任何额外配置**。这是"Android 优先 + Expo"路线的一个实质优势。
- 无需申请 extension（延期至 2026-11-01 的通道本项目用不上）。

**【未能证实】** **下一个周期（预计 2027-08-31）的具体要求**：截至 2026-09-30，上述两个官方页面**均未出现 2027 年或 Android 17 的 target API 要求**。Google 的惯例是每年 8 月 31 日（连续两年同一日期），**推断** 2027-08-31 会要求当时的最新 API level，但**具体数字官方未公布，不得引用**。

### 8.2 新个人开发者账号的封闭测试门槛

**【官方文档】** `https://support.google.com/googleplay/android-developer/answer/14151465?hl=en`（App testing requirements for new personal developer accounts，访问于 2026-09-30）原文：

> "Google Play requires **personal developer accounts created after November 13, 2023**, to test their apps before those apps are eligible for distribution on Google Play. Certain features in Play Console, such as **Production** and **Pre-registration**, remain disabled until developers meet these testing requirements."

> "Developers with personal accounts created after November 13, 2023, must **run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days.** When you meet these criteria, you can **apply for production access** on the Dashboard in Play Console to distribute your app on Google Play. When you apply, you answer questions to help clarify your app design, testing process, and production readiness."

> "**Closed testing:** … **At least 12 testers must be opted in to your closed test when you apply for production access, and they must have been opted in continuously for the preceding 14 days.** You can start a closed test after completing your app setup."

> "**Important:** Inform your testers that they need to **remain opted in to your closed test continuously for at least 14 days**."

> "After you submit your application for production access, Google reviews your submission… **Review usually takes seven days or less**, but can occasionally take longer."

> "If your app requires additional testing, you may need to continue running your closed test. **Reasons for required continued testing include having fewer than 12 opted-in testers or insufficient tester engagement** during the testing period."

> "**You must summarize your testing feedback when applying for production access.**"

**⚠️ 硬性结论**：
- **门槛是 12 名测试者 / 连续 14 天**（**不是**坊间常见说法"20 人/14 天"或"12 人/14 天可选"）。
- **"opted in continuously"是硬条件**：中途退出会重置计时，因此**必须提前招募 ≥12 名愿意连续两周不掉线的人**。这是**日历时间上的关键路径**（14 天 + 最多 7 天审核 ≈ 最短 3 周才能上生产轨）。
- **仅适用于 2023-11-13 之后创建的个人账号**；组织账号（organization account）不受此条约束。→ **这直接影响"用个人账号还是组织账号注册"的决策**（见 §10 待拍板项）。
- 申请生产权限时**必须提交测试反馈总结** → 需要在封闭测试期间有意识地收集与记录反馈。

### 8.3 UGC 应用必须提供的功能（本项目属社区内容型产品，**条条命中**）

**【官方文档】** `https://support.google.com/googleplay/android-developer/answer/9876937?hl=en`（User Generated Content，访问于 2026-09-30）原文：

> "Apps that contain or feature UGC, **including apps which are specialized browsers or clients to direct users to a UGC platform**, must implement robust, effective, and ongoing UGC moderation that:
> * **Requires users accept the app's terms of use and/or user policy before users can create or upload UGC**;
> * **Defines objectionable content and behaviors** (in a way that complies with Google Play Developer Program Policies), and **prohibits them in the app's terms of use or user policies**;
> * **Conducts UGC moderation**, as is reasonable and consistent with the type of UGC hosted by the app. This includes **providing an in-app system for reporting and blocking objectionable UGC and users, and taking action against UGC or users where appropriate.** …
>   * Apps featuring UGC that identify a specified set of users through means such as user verification or offline registration (for example, apps exclusively used within a specific school or company, etc.) **must provide in-app functionality to report content and users.**
>   * UGC features that enable **1:1 user interaction** with specific users (for example, direct messaging, tagging, mentioning, etc.) **must provide an in-app functionality for blocking users.**
>   * Apps that provide access to **publicly accessible UGC, such as social networking apps** and blogger apps, **must implement in-app functionality to report users and content, and to block users.**
> * **Provides safeguards to prevent in-app monetization from encouraging objectionable user behavior.**"

> "**Incidental Sexual Content** … UGC apps may contain incidental sexual content if **all** of the following requirements are met:
> * Such content is **hidden by default behind filters that require at least two user actions in order to completely disable**…
> * **Children… are explicitly prohibited from accessing your app** using age screening systems such as a neutral age screen…
> * Your app provides **accurate responses to the content rating questionnaire** regarding UGC…"

> "Apps whose primary purpose is featuring objectionable UGC will be removed from Google Play."

**⚠️ 逐条落到功能需求（这对设计宪法是直接输入）**：

| 政策要求 | 必需功能 | 本项目现状提示 |
| --- | --- | --- |
| 接受条款才能发 UGC | **首次发布内容前强制接受 ToS/用户协议**（不是注册时一次性弹窗即可） | 需设计"发帖/评论前门禁" |
| 定义并禁止不当内容 | 用户协议中明确列举禁止行为 | 需法务/文案条款 |
| 举报内容 + 举报用户 | **应用内举报入口，且必须能举报"用户"而不只是"内容"** | 后端已有 `reports.js`，**需核实是否支持举报用户对象** |
| 屏蔽用户 | **应用内拉黑/屏蔽用户功能**（社交网络类必备；1:1 交互必备） | 需新增能力（旧端是否有待核实） |
| 对 UGC/用户采取行动 | 有可执行的处置链路（下架/封禁/警告） | 后端已有 `checkSanction`、`adminAuth`，方向对 |
| 不得用变现鼓励不当行为 | 变现设计需过审 | 无广告/打赏时风险低 |
| 偶发色情内容 | 默认过滤（**需 ≥2 步才能完全关闭**）+ 年龄筛查 | 若无此内容可声明无 |

**推断（关键路径风险）**：**"屏蔽用户"与"举报用户"**是本项目最可能缺失、且**没有它们无法过审**的两项。建议在宪法/需求阶段就把它们列为**首发必做（P0）**，而非"后续迭代"。

### 8.4 应用内账号注销 + 网页注销入口（**两条都要**）

**【官方文档】** `https://support.google.com/googleplay/android-developer/answer/13327111?hl=en`（Understanding Google Play's app account deletion requirements，访问于 2026-09-30）原文：

> "If your app allows users to **create an account from within your app**, our User data policy requires that it **must also allow users to request for their account to be deleted**."

> "1. **All developers must complete new Data deletion questions in the Data safety form** on the App content page in Play Console.
> 2. **If your app enables account creation, you must:**
>    * **provide users with an in-app path to delete their app accounts and associated data; and**
>    * **provide a web link resource where users can request app account deletion and associated data deletion.**"

> "The **weblink must be functional** (for example, loads without error), **relevant in scope** (for example, the pathway to request account deletion should be **prominently featured and easily discoverable** on the page) and **reference the app or developer name** (that is, as it appears on your store listing in Google Play). The user **must be able to request deletion of their account through the pathway**. You can offer this in many ways, like an additional link that initiates account deletion, a customer service email or a form they can submit a request through."

> "The requirements for your **in-app path to deletion** should be intuitive for the user. Meaning, the pathway should be **prominent** (for example, **within the account settings** or a similar section)."

> "When you delete an app account based on a user's request, you **must also delete the user data associated with that app account**. It is possible that your app may need to retain certain data for legitimate reasons such as security, fraud prevention or regulatory compliance."

> "Some users may have already uninstalled your app… your web resource **should give users a way to request that their data be deleted without sending the user back to the app** and requiring them to re-download it."

> "Permanently private and enterprise device management apps are **exempt**… accounts that are created and operated offline are not app accounts and do not fall within policy scope."

**⚠️ 硬性结论**：**"应用内注销" + "网页注销入口"是两条独立要求，缺一不可**。网页入口必须：
- 能**加载无错**；
- 注销路径**显著可发现**；
- **引用应用名或开发者名**（与商店 listing 一致）；
- 用户能在**不回到 App** 的前提下提交删除请求。
且注销必须**级联删除关联数据**（保留需有正当理由并披露）。

### 8.5 数据安全表单（Data safety）

**【官方文档】** `https://support.google.com/googleplay/android-developer/answer/10787469?hl=en`（访问于 2026-09-30）原文：

> "**All developers must declare how they collect and handle user data** for the apps they publish on Google Play, and provide details about how they protect this data through security practices like encryption. **This includes data collected and handled through any third-party libraries or SDKs used in their apps.**"

> "All developers that have an app published on Google Play **must complete the Data safety form, including apps on closed, open, or production testing tracks**. … Apps that are active on **internal testing tracks are exempt**."

> "You alone are responsible for making **complete and accurate declarations**… When Google becomes aware of a **discrepancy** between your app behavior and your declaration, **we may take appropriate action, including enforcement action**."

> "Ensure that you've **added a privacy policy**; **this is required to complete the Data safety form** and have your data safety information shown to users."

> "You must reflect data collection or sharing carried out by such **third-party code** in the Data safety form for your app."

> "**After July 20, 2022, all apps will be required to have completed an accurate Data safety form** that discloses their data collection and sharing practices (**including apps that do not collect any user data**)."

> "**Google Play has one global Data safety form**… per package name that is **agnostic to usage, app version, region, and user age**… if any of the collection, uses, or linkages are present in **any version** of the app presently distributed on Google Play, anywhere in the world, **you must indicate such on the form**."

必填项包括（原文列举）：是否收集/共享各类用户数据；**"Whether or not all of the user data collected by your app is encrypted in transit"**；数据用途；数据是否可选/必需；是否提供**删除请求机制**。

**⚠️ 硬性结论（对本项目的具体影响）**：
- **封闭测试轨也要填** Data safety（仅 internal testing 豁免）→ 在第 8.2 的 14 天封闭测试期间就必须已填完。
- 表单是**全局唯一**的（每个 package name 一份），必须覆盖所有版本、所有地区、所有 SDK/第三方库采集的数据 → **意味着引入任何分析/推送/崩溃上报 SDK 都要回来更新表单**。建议宪法要求"新增任何采集数据的 SDK 必须同步更新 Data safety 声明"。
- 需要**隐私政策 URL**（表单前置条件）。
- **"数据是否全程加密传输"**必须如实声明 → 后端为 HTTP 则无法声明加密；需确认全链路 HTTPS。

### 8.6 其他可能构成上架阻断的项

**【官方文档】** 由上述页面附带提及：
- **AAB 强制**（§7.4）：2021 年 8 月起新应用必须用 Android App Bundle；压缩下载总大小 ≤ 4 GB。
- **64 位架构支持**：`https://developer.android.com/google/play/requirements/64-bit`（在 App Bundle 页的"Play requirements"侧栏中列出；**本文档未展开核实其当前文本** → 标注为**未能证实细节**，但该项确实存在）。
- **Families 政策 / 年龄筛查**：若 App 可能被未成年人使用，需按 §8.3 的 incidental sexual content 要求做年龄门禁；UGC 内容分级问卷必须如实填写。
- **敏感权限**：`support.google.com/googleplay/android-developer/answer/13316080`（User data 政策，在被引页面中作为账号删除要求的政策依据）——**本文档未逐个核实 SMS/Call Log/后台定位的申报细节**，标注为**未能证实**。

---

## 9. 技术栈候选与硬约束建议（可直接被宪法引用的候选条款）

> 以下是**候选条款**，供《App 设计宪法》技术栈章节摘用。每条都可就近找到上文证据。**第 10 节列出了不得写入的未证实项。**

### 9.1 版本基线（候选条款）

| 编号 | 候选条款 | 依据 |
| --- | --- | --- |
| V1 | App 基座锁定 **Expo SDK 57**（`expo@57.0.26`）+ **React Native 0.86.3** + **React 19.2.3**，三者版本由 `npx expo install` 统一决定，**禁止手工指定** | §2.1–2.2【一手实测】 |
| V2 | **禁止**使用 `expo@next` / `next` 标签 / `canary` 版本；SDK 58 当前为 **Beta**，在官方发布 GA changelog 之前**不得**进入生产分支 | §2.3【官方文档】 |
| V3 | CI 与开发机 **Node.js ≥ 22.13.x** | §2.2【官方文档】 |
| V4 | TypeScript 锁定 SDK 模板版本（`~6.0.3`）；**禁止**使用 npm latest（7.x） | §6.6【一手实测】 |
| V5 | 任何原生库版本变更，**必须**通过 `npx expo install` 并提交 lockfile diff | §6.5 手势 2.32 vs 3.3 的陷阱【一手实测】+【推断】 |
| V6 | Reanimated 与 Worklets **成对升级**，版本组合以 `npx expo install` 结果为准（SDK 57 基线：`reanimated 4.5.1` + `worklets 0.10.1`） | §6.4【一手实测】 |
| V7 | 升级到 SDK 58 的前置条件：官方 changelog 出现 SDK 58 GA 条目，且 `expo-router` 完成 `sdk-57-to-58` 迁移评估 | §2.3、§4.5【官方文档】 |

### 9.2 架构与运行约束（候选条款）

| 编号 | 候选条款 | 依据 |
| --- | --- | --- |
| A1 | 全项目**只考虑新架构**（Fabric/TurboModules/Bridgeless）；选库前置条件为"官方声明支持新架构或有明确 interop 支持"，interop 仅作过渡手段 | §3【官方文档】 |
| A2 | **禁止**在配置中保留 `newArchEnabled`（SDK 57 已无效果，会造成误判） | §3【官方文档】 |
| A3 | 引入任何第三方原生库前，**必须**在 PR 中给出：许可证、是否含原生代码、OTA 影响判定 | §6 判定方法可复现 |
| A4 | 新项目模板选 `expo-router` 文件式路由；**返回栈、深链、Tab 语义以原生行为为准**，不追求双端 1:1 | §4【官方文档】+ 已定方向 |
| A5 | 原生 Tab 的采用**推迟到 SDK 58 GA**；SDK 57 期间 Tab 层使用 JS tabs（或明确接受 `unstable-native-tabs` 并记录风险） | §4.2【官方文档】 |

### 9.3 原生混编（候选条款）

| 编号 | 候选条款 | 依据 |
| --- | --- | --- |
| N1 | **凡 `@expo/ui` 已提供的原生组件，不允许自写原生实现**（iOS 用 `@expo/ui/swift-ui`，Android 用 `@expo/ui/jetpack-compose`，跨端用 `@expo/ui/universal`） | §5 路径 B【官方文档】 |
| N2 | 原生代码**优先**写成 **本地 Expo Module**（放在 `modules/`，**不放在 `ios/` 或 `android/`**），以保证与 CNG/`prebuild --clean` 兼容 | §5 路径 A + §7.1【官方文档】 |
| N3 | **禁止**直接修改 prebuild 生成的 `ios/`、`android/` 内容；必须改则写成 **config plugin** | §7.1【官方文档】 |
| N4 | Nitro Modules **仅在有明确性能测量证据时**引入，且不得作为主力桥接层（当前 0.37.x，<1.0） | §5 路径 C【一手实测】+【推断】 |
| N5 | 任何"为 iOS 单独写原生"的决定**必须**附 ADR，命中 §5.5 判据之一，并说明为何 `@expo/ui` 不可用 | §5.5【推断】 |
| N6 | `@expo/ui` 内部**无 Yoga/Flexbox**：原生组件内布局必须用 `HStack`/`VStack`（iOS）或 `Row`/`Column`（Android），且每个组件必须包在 `Host` 内 | §5 路径 B【官方文档】 |
| N7 | 原生 Tab 的数量与内容需按"**全部 eager 渲染**"评估启动成本；重内容页必须 `useIsFocused` 延迟加载 | §4.3【官方文档】 |

### 9.4 构建 / OTA / 发布（候选条款）

| 编号 | 候选条款 | 依据 |
| --- | --- | --- |
| B1 | 采用 **CNG + `npx expo prebuild`**；`android/` 与 `ios/` 保持 gitignored，不提交 | §7.1【官方文档】 |
| B2 | 构建与提交统一走 **EAS Build / EAS Submit**；CI 用 `EXPO_TOKEN` 非交互认证 | §7.2【官方文档】 |
| B3 | `runtimeVersion` 策略采用 **`fingerprint`**（优先保证不会漏 bump 原生变更） | §7.3【官方文档】+【推断】 |
| B4 | 依赖清单中标注"原生依赖=有"的任何变更 → **必须**重新构建 + 走商店审核；纯 JS/资源变更才可走 OTA | §6 全表 + §7.3 |
| B5 | OTA 发布**必须**支持渐进（rollout）与回滚；生产前先在 preview channel 验证 | §7.3【官方文档】 |
| B6 | 签名铁律：**upload key 与 app signing key 分离**，upload key 不入库，交由 EAS credentials / CI secret 管理 | §7.4【官方文档】 |
| B7 | 使用 **Play App Signing**；所有依赖签名指纹的第三方集成**必须**同时登记 Google 侧 app signing key 指纹 | §7.4【官方文档】 |
| B8 | 首发流程固定为 **internal testing（draft）→ 人工补全商店资料 → 生产轨** | §7.4【官方文档】 |

### 9.5 上架合规（候选人宪法条款，全部是 P0 前置条件）

| 编号 | 候选条款 | 官方来源 |
| --- | --- | --- |
| C1 | **targetSdkVersion 必须 ≥ 36**（SDK 57 默认已满足）；SDK 升级时**必须**重新核对 Google 当年的 target API 要求 | §8.1 |
| C2 | **个人开发者账号**（2023-11-13 后创建）上架前必须完成 **≥12 名测试者连续 opted-in ≥14 天**的封闭测试，并留存反馈总结 | §8.2 |
| C3 | 发布 UGC 前**必须**已接受 ToS/用户协议（发帖前门禁，非注册弹窗） | §8.3 |
| C4 | **必须**提供应用内**举报内容**功能 | §8.3 |
| C5 | **必须**提供应用内**举报用户**功能 | §8.3 |
| C6 | **必须**提供应用内**屏蔽用户**功能 | §8.3 |
| C7 | **必须**提供应用内**账号注销**入口（位于账号设置等显著位置）**且**级联删除关联数据 | §8.4 |
| C8 | **必须**提供**网页版注销入口**：可无错加载、显著可发现、引用应用/开发者名、**无需回到 App** 即可提交 | §8.4 |
| C9 | **必须**填写 Data safety 表单（**封闭测试阶段即需完成**，仅 internal 轨豁免），且具备可用**隐私政策 URL** | §8.5 |
| C10 | 全链路传输**必须** HTTPS（因表单需声明"是否全程加密传输"） | §8.5 |
| C11 | 新增任何采集用户数据的 SDK（分析/推送/崩溃上报）**必须**同步更新 Data safety 声明 | §8.5 |
| C12 | 发布格式为 **AAB**，压缩下载总量 ≤ 4 GB | §8.1/§7.4 |

### 9.6 `shared/` 复用（候选条款）

| 编号 | 候选条款 | 依据 |
| --- | --- | --- |
| S1 | `shared/` 中**纯逻辑**子集（`api/`、`constants/`、`utils/`、`config/`）可作为 App 与 Web 的共同真相源 | 目录实测（`shared/{api,components,config,constants,query,utils}`） |
| S2 | `shared/components/` 当前为 **Web 专属**（含 `.jsx` 与 `.css`），**不得**直接导入 RN；RN 组件必须在 App 侧独立实现 | 【一手实测】`shared/components/AdvertisementDetailView.css` 等 |
| S3 | `shared/query/` 使用 `@tanstack/react-query`（MIT）→ 可跨端复用，但需核实各文件是否引入 Web 专属依赖 | 【一手实测】+【推断】 |
| S4 | 建议把 `shared/` 重划为 `shared/core/`（跨端纯逻辑）与 `shared/web/`（Web 专属），避免误用 | 【推断】 |

### 9.7 建议的"首发必做 vs 可延后"划分（推断，供宪法排期用）

**P0（没有就不能上架）**：C3–C11（条款接受门禁、举报内容、举报用户、屏蔽用户、应用内注销、网页注销、Data safety、隐私政策、HTTPS）。
**P0（没有就不能发版）**：B1–B4、C1、C12。
**P1（强烈建议）**：A1–A3、N1、N2、N7、B5–B8。
**P2（可延后）**：A5（原生 Tab，等 SDK 58 GA）、N4（Nitro）、路径 E（brownfield）。

---

## 10. 未能证实的事项（**不得在宪法中当作事实引用**）

以下均为本次调研**主动核查后仍无法用一手证据确认**的项。列表中每项都写明"缺什么证据"。

| # | 未能证实的事项 | 缺什么 |
| --- | --- | --- |
| U1 | **2027 年（预计 2027-08-31）的 Google Play target API level 要求** | Google 官方两个页面截至 2026-09-30 均无 2027/Android 17 条款。Google 惯例是每年 8 月 31 日，但**具体 API level 数字未公布** |
| U2 | **Android 17 的 API level 编号与发布时间表** | 抓取 `developer.android.com/about/versions/17` 失败，未确认该版本是否已公布 |
| U3 | **EAS Build 的 2026 年定价与免费额度** | 未访问 `expo.dev/pricing` 页面；免费构建分钟数/并发数**未知**。若预算敏感需单独核实 |
| U4 | **EAS Build 的排队时长、构建并发上限、缓存命中率** | 官方文档未给出可引用的量化承诺 |
| U5 | **`expo` 包在 dist-tags 中不存在 `beta` 标签的原因** | 官方文档 (`docs.expo.dev/versions/latest`) 称"Beta releases use the `beta` tag on npm"，但实测 `expo` 无 `beta` 标签、SDK 58 Beta 走 `next`。文档与 registry 状态**不一致**，原因未知 |
| U6 | **`expo@58.0.0`（无预发布后缀）为何出现在 `next` 而 `latest` 未切换** | **推断**为"beta 期的版本号策略 + 尚未 GA"，但 Expo 未公开解释 |
| U7 | **SDK 58 的确切 GA 日期** | 公告仅称"beta 期 3–4 周"（自 2026-09-15 起），**推断**落在 2026-10 上中旬，无官方日期 |
| U8 | **`react-native` 0.87 是否会被任何 Expo SDK 稳定版采用** | SDK 57=0.86、SDK 58 Beta=0.88 RC。官方未表态 0.87 是否被跳过 |
| U9 | **Nitro Modules 是否"生产就绪"** | README 无明确 production/stable 声明，版本 0.37.1（<1.0）。**"可用但演进中"是推断** |
| U10 | **`expo-constants` / `expo-splash-screen` / `expo-system-ui` / `expo-linking` / `expo-symbols` / `expo-glass-effect` / `expo-device` / `expo-font` / `expo-web-browser` 的许可证与原生依赖** | 仅从模板取得版本号，未逐一实测包内容。**推断**均为 MIT + 含原生模块（Expo 官方包惯例），但**未验证** |
| U11 | **`@tanstack/react-query` 是否确为纯 JS（无原生代码）** | 未实测其发布包文件清单。**推断**为纯 JS |
| U12 | **`react-native-mmkv` 的原生依赖细节** | 仅取版本/许可证，未实测包内容。**推断**含原生代码 |
| U13 | **Google Play 64 位架构支持要求的当前文本** | 未展开核实 `developer.android.com/google/play/requirements/64-bit` |
| U14 | **SMS/Call Log/后台定位等敏感权限的申报细节** | 未逐个核实 User data 政策 (`answer/13316080`) 全文 |
| U15 | **Apple App Store 侧的对应硬要求**（iOS target SDK/Xcode 版本、UGC 政策、账号删除） | 本次**只在 Android 优先范围**内取证。但 §2.2 已显示 SDK 57 要求 **Xcode 26.4+ / iOS 16.4+**，这是 iOS 侧唯一已确认的硬事实 |
| U16 | **OTA 内容是否触及 Apple/Google 审核红线** | 未核实两个商店对 expo-updates 下发的 JS 变更的政策边界 |
| U17 | **`expo-brownfield` 是否被官方标注为 stable / experimental** | 仅有 MIT + 描述文本；未找到成熟度声明 |
| U18 | **旧 `mobile/` 端历史崩溃率/性能基线** | 本次未查（属另一份调研 `App设计调研-00-旧App设计债实测基线.md` 的范围） |
| U19 | **`shared/query/` 各文件是否真的跨端可用** | 仅凭目录与 Web 端依赖推断，未逐文件读取 |
| U20 | **Expo Doctor / React Native Directory 对本文 §6 所列库的新架构兼容性判定** | 未运行 `npx expo-doctor`（任务限制：不得安装依赖） |

---

## 11. 需要所有者拍板的技术分歧点

按"影响面 × 不可逆性"排序。每条都给出选项与代价。

### 分歧 1（最高优先）：**Tab 层用 JS tabs 还是等 SDK 58 用原生 Tab**

- **事实**：原生 Tab 的稳定导入路径 `expo-router/native-tabs` **只在 SDK 58+ 可用**；SDK 57 上只有 `expo-router/unstable-native-tabs`。SDK 58 当前为 Beta（2026-09-15 起，官方称 beta 期 3–4 周）。【官方文档】
- **选项 A**：SDK 57 + **JS tabs** 起步，SDK 58 GA 后迁到原生 Tab。
  - 代价：Tab 层要改一次；但**一开始就用稳定 API**。
- **选项 B**：SDK 57 + `unstable-native-tabs`（接受不稳定）。
  - 代价：API 可能变化（SDK 55 已发生过一次 compound component 破坏性变更），且有 `unstable-` 前缀意味着官方不保证。
- **选项 C**：**等 SDK 58 GA** 再开工。
  - 代价：阻塞整个设计阶段；且 SDK 58 会引入 iOS 27 scene lifecycle、RN Strict TypeScript API、expo-router 核心重构等**额外升级工作量**。
- **建议（推断）**：**A**。理由：① 设计宪法阶段不应被 beta 阻塞；② JS tabs 也能做出良好体验（原生 Tab 官方明示"不是 drop-in replacement"，其价值主要在系统级动效与 iOS Liquid Glass）；③ 保留"SDK 58 GA 后再评估迁移"的条款即可。

### 分歧 2：**iOS 原生混编的边界如何定义**（什么必须用 `@expo/ui`、什么允许自写 Swift）

- **事实**：`@expo/ui` 是官方原生组件方案（Jetpack Compose + SwiftUI，1:1 映射，SDK 56+ 起 production-ready）；本地 Expo Module 可写 Swift，但**SwiftUI 视图渲染"is planned"**，当前需自包 `UIHostingController`。【官方文档】
- **选项 A**：**"`@expo/ui` 优先"硬约束** —— 任何 `@expo/ui` 已有的组件禁止自写原生（候选条款 N1）。
- **选项 B**：**"页面级自由"** —— 允许整屏用 SwiftUI 写，与 RN 页面混排。
  - 代价：原生页面无法 OTA；每 SDK 升级都要验证；团队需同时维护两套设计语言。
- **选项 C**：**暂不用 `@expo/ui`**，只用 RN 组件 + 少量本地 Module。
  - 代价：放弃"双端体验各自最优"中最直接的官方路径。
- **建议（推断）**：**A + 有限的 B**（仅限 §5.5 判据命中的场景，且必须走 ADR）。

### 分歧 3：**`runtimeVersion` 用 `fingerprint` 还是 `appVersion`**

- **事实**：`appVersion` 便宜但会漏 bump；`fingerprint` 安全但"necessary to create builds more often"。【官方文档】
- **选项 A `fingerprint`**：安全性最高，构建次数多。
- **选项 B `appVersion`**：构建次数少，依赖人工纪律。
- **选项 C 手工递增**：完全可控，最易出错。
- **建议（推断）**：**A**。本项目有 iOS 原生（Swift）代码，人工 bump 最容易漏。

### 分歧 4：**开发者账号类型：个人 vs 组织**

- **事实**：**2023-11-13 之后创建的个人账号**必须完成 **12 名测试者 / 连续 14 天**封闭测试才能申请生产权限；组织账号不在该条约束内。【官方文档】
- **选项 A 个人账号**：注册简单；但**上架关键路径被拉长 ≥3 周**（14 天测试 + ≤7 天审核），且需要持续维持 12 人 opted-in，还要提交反馈总结。
- **选项 B 组织账号**：绕开 12/14 门槛；但需要组织资质材料（一般需 D-U-N-S 等），注册周期与审核另算。
- **建议（推断）**：若本项目以**校方/社团/公司实体**名义发布，**优先组织账号**；否则必须**在开发早期就启动 12 人测试者招募**（这是日历时间上的关键路径，不能等到发版前才想起来）。

### 分歧 5：**是否接受"原生依赖库"进入依赖树**（OTA 灵活性 vs 能力）

- **事实**：本文 §6 已逐个实测。**列表虚拟化（FlashList 2 / LegendList）是纯 JS、OTA 友好**；而图片（`expo-image`）、动效（Reanimated + Worklets）、手势（gesture-handler）、原生组件（`@expo/ui`）、屏幕（screens）、安全区、SVG **全部含原生代码**。
- **含义**：核心体验栈**几乎不可能"纯 JS 化"**——OTA 只能覆盖业务逻辑与文案，不能覆盖 UI 基座升级。
- **拍板点**：接受"UI 基座变更必须走商店审核（天级）"这一事实，并据此设计**发布节奏**（而不是试图用 OTA 绕过）。
- **建议（推断）**：接受。并在宪法中明确"OTA 适用范围 = 业务 JS/文案/配置；UI 基座与原生能力 = 商店发版"。

### 分歧 6：**`shared/` 是否需要重构为跨端/Web 两层**

- **事实**：`shared/components/` 内含 `.jsx` + `.css`（Web 专属），若 App 直接导入会失败。【一手实测】
- **选项 A**：保持现状，靠"文件级约定"约束（候选条款 S2）。
- **选项 B**：物理拆分为 `shared/core/` 与 `shared/web/`（候选条款 S4 的建议）。
- **建议（推断）**：**B**，越早越好 —— 物理边界比约定可靠，尤其在多人/多 Agent 协作下。

---

## 12. 证据索引（URL + 抓取时间）

**抓取时间统一为 2026-09-30 23:35 – 23:55（+08:00）。** 除 npm 命令外，均通过 Jina Reader 读取官方页面正文。

### 12.1 一手实测命令清单（可原样重跑）

```console
npm --version
npm view expo dist-tags --json
npm view expo time --json
npm view expo-template-blank@sdk-57 dependencies --json
npm view expo-template-default@latest dependencies --json
npm view expo-template-default@next dependencies --json
npm view react-native dist-tags --json
npm view react dist-tags --json
npm view expo-router dist-tags --json
npm view expo-updates dist-tags --json
npm view @expo/ui dist-tags --json
npm view expo-brownfield dist-tags --json
npm view <pkg> version license --json            # 全部 §6 库
npm view react-native-reanimated@4.5.1 peerDependencies --json
npm view react-native-reanimated@4.7.0 peerDependencies --json
npm view react-native-worklets@0.13.0 peerDependencies --json
# 原生依赖判定（发布包文件清单）：
#   https://unpkg.com/<pkg>@<version>/?meta
```

### 12.2 npm registry（一手）

| 包 | 用途 |
| --- | --- |
| `expo` / `expo-router` / `expo-updates` / `@expo/ui` / `expo-brownfield` | dist-tags 与发布时间 |
| `expo-template-blank` / `expo-template-default` | SDK ↔ RN ↔ React 官方配对 |
| `react-native` / `react` | 上游最新稳定 |
| `@shopify/flash-list` / `@legendapp/list` | 版本 + 原生依赖实测 |
| `react-native-reanimated` / `react-native-worklets` | 版本 + peer 配对硬约束 |
| `react-native-gesture-handler` / `react-native-screens` / `react-native-safe-area-context` / `react-native-svg` | 版本 + 原生依赖实测 |
| `expo-image` / `expo-haptics` / `expo-secure-store` / `expo-notifications` / `expo-camera` / `expo-image-picker` | 版本 + 原生依赖实测 |
| `react-native-nitro-modules` | 版本 + 原生依赖实测 |
| `eas-cli` | 版本 |

### 12.3 官方文档与政策页

| # | URL | 用于 |
| --- | --- | --- |
| D1 | https://expo.dev/changelog | SDK 58 Beta（2026-09-15）为最新条目；SDK 57 GA（2026-06-30） |
| D2 | https://expo.dev/changelog/sdk-58-beta | SDK 58 Beta 原文：beta 期 3–4 周、RN 0.88 RC、Expo Modules 2.0、SceneDelegate、Strict TS、expo-router 重构 |
| D3 | https://docs.expo.dev/versions/latest/ | SDK↔RN↔React↔Node 对照表；compileSdk/targetSdk = 36；Xcode 26.4+ / iOS 16.4+ |
| D4 | https://docs.expo.dev/guides/new-architecture/ | SDK 55+ 新架构强制；RN 0.82 移除开关；旧架构 2025-06 冻结；interop 层；已知问题库 |
| D5 | https://docs.expo.dev/router/advanced/native-tabs/ | `expo-router/native-tabs`（SDK 58+）vs `unstable-native-tabs`（SDK 54–57）；全部 Tab API；eager 渲染 |
| D6 | https://docs.expo.dev/modules/overview/ | Expo Modules API 定位、与 TurboModules 取舍、JSI |
| D7 | https://docs.expo.dev/modules/module-api/ | AsyncFunction/View/Record/Convertible；**SwiftUI "is planned"** 原文 |
| D8 | https://docs.expo.dev/versions/latest/sdk/ui/ | `@expo/ui` 官方原生组件（Compose/SwiftUI）、Host、无 Yoga |
| D9 | https://docs.expo.dev/workflow/continuous-native-generation/ | CNG/prebuild 规则；EAS Build 是否跑 prebuild；gitignore；`--clean` |
| D10 | https://docs.expo.dev/eas-update/runtime-versions/ | runtimeVersion 语义、appVersion vs fingerprint、rollout/rollback |
| D11 | https://docs.expo.dev/submit/android/ | `eas submit`、Google Service Account、`EXPO_TOKEN`、CI、internal track、draft |
| D12 | https://docs.expo.dev/brownfield/overview/ | integrated vs isolated（AAR/XCFramework） |
| D13 | https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started | Reanimated 4 仅新架构；Worklets 独立包；Babel 插件顺序 |
| D14 | https://nitro.margelo.com/docs/introduction（正文经 GitHub README 取得） | Nitro = 静态编译 JSI 绑定、Swift 5.9 C++ interop |
| D15 | https://github.com/mrousavy/nitro | Nitro README 原文 |
| D16 | https://developer.android.com/google/play/requirements/target-sdk | 2026-08-31 起 target API 36；延期至 2026-11-01 |
| D17 | https://support.google.com/googleplay/android-developer/answer/11926878?hl=en | target API 政策；时间线表 |
| D18 | https://support.google.com/googleplay/android-developer/answer/14151465?hl=en | **12 测试者 / 连续 14 天**；生产权限申请；审核 ≤7 天 |
| D19 | https://support.google.com/googleplay/android-developer/answer/9876937?hl=en | UGC 政策全文：条款门禁、举报内容、举报用户、屏蔽用户、incidental sexual content |
| D20 | https://support.google.com/googleplay/android-developer/answer/13327111?hl=en | 账号注销：**应用内 + 网页**双要求；级联删除；网页入口细则 |
| D21 | https://support.google.com/googleplay/android-developer/answer/10787469?hl=en | Data safety 表单必填项；封闭测试轨也需填；加密传输声明 |
| D22 | https://support.google.com/googleplay/android-developer/answer/9842756?hl=en | Play App Signing：upload key vs app signing key；指纹登记 |
| D23 | https://developer.android.com/guide/app-bundle | AAB 强制（2021-08 起）；4 GB 限制 |

### 12.4 仓库内既有文档（用于交叉印证）

| 文件 | 用途 |
| --- | --- |
| [App端全盘废弃与归档清理记录.md](../../07-Implement/App端全盘废弃与归档清理记录.md) | 旧 `mobile/` = SDK 56 + RN 0.85.3，与官方配对一致 |
| [设计阶段工作计划与验收门.md](../task/设计阶段工作计划与验收门.md) | 已定方向（真原生 / RN 为主 / iOS 可混原生 / Android 优先） |
| [06-Analyze/README.md](../../06-Analyze/README.md) | 已预留 `tech-research/` 目录位置 |
| `shared/`（实测目录：`api/ components/ config/ constants/ query/ utils/`） | S1–S4 候选条款依据（`shared/components/` 含 `.jsx`+`.css`） |

---

## 13. 一句话交接

> **版本基线明确、可上架、但有两个时间点必须由所有者拍板：**
> ① **Tab 层**要不要为了稳定的原生 Tab 而等 SDK 58 GA（否则 SDK 57 上只能吃 `unstable-native-tabs`）；
> ② **开发者账号类型**决定是否必须做 12 人 × 连续 14 天的封闭测试 —— 这是唯一一条"卡日历"的硬门槛，越早决定越省时间。
>
> 其余全部证据表明：**Expo SDK 57 + RN 0.86.3 + React 19.2.3 这套基座，在「真原生、Android 优先、iOS 可混原生」的方向上是成立的、开箱满足 Play 的 targetSdk 36、且列表虚拟化这一最影响性能的环节恰好是纯 JS（OTA 友好）。**
