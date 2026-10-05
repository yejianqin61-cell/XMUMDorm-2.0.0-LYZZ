# App 依赖准入登记（Phase 0 首批 + Phase 1 第二批）

**日期**：2026-10-02　**版本**：v1.0
**性质**：**evaluation 层**（判定记录）。承接 [生产开发计划 §Phase 0](../task/phase-0/P0-01-工程脚手架与依赖准入.md) 与 **P0-11**。
**判据来源**：App 设计宪法 **3.4**（准入五项）· **9.13**（最后发布时间必须读**该版本自己的时间戳**，⛔ 不用 `time.modified`）· **11.4**（含原生代码的变更**必须重建**，不能 OTA）· **9.11**（⛔ 自带调色板/样式引擎不得作基座）· **16.2**（⛔ 不得引入第二套图标库）

> **采集方式（可复现）**：版本取自 `app/node_modules/<pkg>/package.json`；发布时间取自 `https://registry.npmjs.org/<pkg>` 的 `time[<该版本>]`；原生代码判定＝包内是否存在 `android/` / `ios/` / `cpp/` / `*.podspec` / `build.gradle*`（脚本：`.scratch/collect-deps.js`，采集于 2026-10-02）。

---

## 1. 直接依赖准入表

**OTA 影响**一列的判读规则（宪法 11.4）：**含原生代码 = 有** → 该依赖的任何变更**必须重建**并走审核；**无** → 纯 JS/资源，可走 OTA。

| 包 | 版本 | 许可证 | 含原生代码 | OTA 影响 | 该版本发布时间 | 是否强加视觉身份 |
|---|---|---|---|---|---|---|
| `expo` | 57.0.26 | MIT | **有**（android/ ios/ podspec） | 有 | 2026-09-29 | 否 |
| `expo-constants` | 57.0.20 | MIT | **有** | 有 | 2026-09-29 | 否 |
| `expo-font` | 57.0.4 | MIT | **有** | 有 | 2026-09-11 | 否（**注意**：本项目只用系统字体，见宪法 2.5；它是 `expo-symbols` 的 peer，不是用来加载自定义字体） |
| `expo-linking` | 57.0.11 | MIT | **有** | 有 | 2026-09-24 | 否 |
| `expo-localization` | 57.0.2 | MIT | **有** | 有 | 2026-09-11 | 否 |
| `expo-router` | 57.0.24 | MIT | **有** | 有 | 2026-09-29 | 否 |
| `expo-secure-store` | 57.0.4 | MIT | **有** | 有 | 2026-09-11 | 否 |
| `expo-status-bar` | 57.0.1 | MIT | **有**（android/） | 有 | 2026-07-15 | 否 |
| `expo-symbols` | 57.0.3 | MIT | **有**（android/ ios/） | 有 | 2026-09-11 | 否（提供**平台原生**图标，即宪法第 16 条第 2 层） |
| `expo-system-ui` | 57.0.4 | MIT | **有**（android/ ios/） | 有 | 2026-09-11 | 否（**补齐登记**：Phase 0 为解决 `prebuild` 的 `userInterfaceStyle` 警告而安装，当时漏登；由 P1-02 的准入门禁测出来） |
| `expo-image` | **~57.0.5** | MIT | **有**（android/ ios/） | **有**（变更须重建） | 2026-09-11 | 否（宪法 **9.9 第①层采用清单**里点名的图片加载器，⛔ 不重造）。P1-04 的 `A07 Avatar` 是它的首个消费者；`npx expo install` 同时往 `app.json` 的 `plugins` 里加了 `expo-image` |
| `expo-asset` | **~57.0.18** | MIT | **有**（android/ ios/） | **有**（变更须重建） | 2026-09-18 | 否（**补齐登记**：P1-14 的用例触发 `expo-router` 的 `Tabs` 路径时崩在 `Cannot find module 'expo-asset' from expo-font/build/FontLoader.js` —— `expo-font` **顶层** `import { Asset } from 'expo-asset'`，却既没把它写进 `dependencies` 也没写进 `peerDependencies`。P0-01 的用例已经要求"`expo-font` 必须直接安装（否则非 Expo Go 构建可能崩）"，**同一条理由适用于它这个运行时依赖**） |
| `lucide-react-native` | 1.52.0 | **ISC ＋ 部分 MIT**（Feather 派生图标 © Cole Bemis；`npm view` 只报 ISC，**不完整**，宪法 16.5-3） | **无**（实测 0 原生文件） | **无** → 可 OTA | 2026-10-04 | 否（但它是**我们选定的**第 1 层图标体系，见 16.1） |
| `react` | 19.2.3 | MIT | 无 | 无 | 2025-12-11 | 否 |
| `react-dom` | 19.2.3 | MIT | 无 | 无 | 2025-12-11 | 否（仅 Web/工具链需要；本项目双端为原生） |
| `react-native` | 0.86.3 | MIT | **有** | 有 | 2026-08-24 | 否 |
| `react-native-safe-area-context` | 5.7.0 | MIT | **有**（android/ ios/ cpp/） | 有 | 2026-02-24 | 否（**宪法第 17 条的指定实现**，我们不用 RN 内置 `SafeAreaView`） |
| `react-native-reanimated` | **4.5.1** | MIT | **有** | 有 | 2026-07-02 | 否（`expo-router` 的依赖；**版本曾被 npm 拉到 4.7.1，已钉回**，见 §3 问题 6） |
| `react-native-worklets` | **0.10.1** | MIT | **有** | 有 | 2026-07-01 | 否（reanimated 的运行时；**曾被拉到 0.13.0 与 `expo-modules-core` 的 peer 上界冲突**，见 §3 问题 6） |
| `react-native-screens` | 4.26.2 | MIT | **有**（android/ ios/ cpp/） | 有 | 2026-07-16 | 否（原生容器地基，宪法 4.3） |
| `react-native-svg` | 15.15.4 | MIT | **有** | 有 | 2026-03-18 | 否（`lucide-react-native` 的 peer） |
| `react-native-webview` | **13.16.1** | MIT | **有**（android/ ios/ podspec） | **有** | 2026-02-27 | 否（R3 内嵌校方系统的载体；**版本由 Expo SDK 57 的 `bundledNativeModules.json` 钉死**） |

**Phase 1 第二批（P1-02：依赖准入与数据层，采集于 2026-10-02）**

| 包 | 版本 | 许可证 | 含原生代码 | OTA 影响 | 该版本发布时间 | 是否强加视觉身份 |
|---|---|---|---|---|---|---|
| `@tanstack/react-query` | **5.96.2** | MIT | **无**（实测 0 原生文件） | **无** → 可 OTA | 2026-04-03 | 否（**版本刻意与 Web 的 lock 对齐**，见 §3 问题 9） |
| `@shopify/flash-list` | **2.0.2** | MIT | **无**（实测 0 原生文件） | **无** → 可 OTA | 2025-08-05 | 否（渲染样式全部由我们传入）。**版本由 SDK 57 的 `bundledNativeModules.json` 钉死**；宪法 9.9 的"列表虚拟化二者择一"选它（另一候选 `LegendList` 不在 SDK 钉版表里） |
| `@react-native-async-storage/async-storage` | **2.2.0** | MIT | **有**（android/ ios/ `RNCAsyncStorage.podspec`） | **有**（变更须重建） | 2025-06-05 | 否（只做落盘）。⛔ **凭据禁止入内**（宪法 4.1.2-2），由 `app/src/shared/storage.ts` 的护栏 + 单测守着 |
| `@react-native-community/netinfo` | **12.0.1** | MIT | **有**（android/ ios/ `react-native-netinfo.podspec`） | **有** | 2026-02-14 | 否（只提供连通性布尔，用来驱动 TanStack 的 `onlineManager`）。**版本由 SDK 57 钉死** |
| `@ronradtke/react-native-markdown-display` | **9.0.3** | MIT | **无**（实测 0 原生文件） | **无** → 可 OTA | 2026-06-29 | 否（样式全由 props 传入）；⚠️ **必须显式覆盖它的默认主题**，否则等于引入第二套排版（宪法 1.4 / 2.5）。选它而非原版 `react-native-markdown-display@7.0.2`（后者 2023-12-11 起停更） |

### 1.2 开发依赖（不进 App 包）

| 包 | 版本 | 许可证 | 含原生代码 | 该版本发布时间 | 用途 |
|---|---|---|---|---|---|
| `@testing-library/react-native` | 14.0.1 | MIT | 无 | 2026-06-23 | 组件渲染测 |
| `@types/jest` | 29.5.14 | MIT | 无 | 2024-10-23 | 类型 |
| `@types/node` | 26.6.4 | MIT | 无 | 2026-10-01 | 类型（测试里读文件） |
| `@types/react` | 19.2.18 | MIT | 无 | 2026-07-30 | 类型 |
| `babel-preset-expo` | **57.0.13** | MIT | 无 | 2026-09-24 | **必须显式安装**（SDK 57 模板不含它；jest-expo 需要一个可解析的 babel 配置，见 §3 问题 1） |
| `jest` | 29.7.0 | MIT | 无 | **2023-09-12** | 测试运行器（版本由 `jest-expo@57.0.5` 的 peer 决定；⚠️ 早于仓库根 Web/后端的 Jest 30，**两套并存是刻意的**：App 必须跟 `jest-expo` 走） |
| `jest-expo` | 57.0.5 | MIT | **有** | 2026-08-26 | App 测试 preset |
| `react-test-renderer` | 19.2.3 | MIT | 无 | 2025-12-11 | RNTL 的 peer；**必须与 `react` 同版本**（⛔ 装 `*` 会拉到 19.3 与 react 19.2.3 冲突） |
| `typescript` | 6.0.3 | Apache-2.0 | 无 | 2026-04-16 | 类型检查（SDK 模板钉版，⛔ 不用 npm latest） |

---

## 2. ⛔ 明确未引入的依赖（准入被拒，留档以免后人重复讨论）

| 包 | 拒绝理由 | 依据 |
|---|---|---|
| `react-native-paper` | 自带完整 M3 调色板与字阶（实测 1072 处色值 / 99 处 `fontSize` 字面量） | 宪法 9.11-1 |
| `tamagui` / `react-native-ui-lib` / `@ui-kitten/components` / `react-native-magnus` / `react-native-elements` / `@rneui/themed` | 同上（第③层 UI kit 不作基座） | 宪法 9.11-1 |
| `nativewind` / `@shopify/restyle` / `react-native-unistyles` | 样式引擎；本项目的问题是"没有唯一令牌源"，不是"样式写得麻烦" | 宪法 9.11-2 |
| `expo-linear-gradient` / `react-native-linear-gradient` | ⛔ 渐变背景是红线 | 宪法 1.3.5 |
| `@expo/vector-icons` / `react-native-vector-icons` | ⛔ 不得为单个图标引入第二套图标库 | 宪法 16.2-2 |
| `react-native-bottom-tabs` / `@bottom-tabs/react-navigation` | **Plan B**：仅当 R2 在真机上判定 (a) `unstable-native-tabs` 不可用时才引入（见 [P0-05 §4.8](../task/phase-0/P0-05-五格底栏导航壳.md)）；当前**不引入** | 宪法 4.3 / 生产计划 §6.3 降级 B |
| M3 Dynamic Colors / Material You 动态取色 | 运行期取色 → 对比度无法在构建期算定 | 宪法 9.12 |

---

## 3. 依赖层面踩到并已解决的问题（**留给后人，别再踩**）

| # | 问题 | 现象 | 解法 |
|---|---|---|---|
| 1 | SDK 57 模板**没有 `babel.config.js`**，也不装 `babel-preset-expo` 到顶层 | `npx jest` 直接崩：`SyntaxError: Unexpected token, expected ","` 指向 `@react-native/jest-preset/jest/setup.js` 的 Flow 语法 | 显式装 `babel-preset-expo@57.0.13`（与 `expo/node_modules` 里那份**同版本**）+ 建 `app/babel.config.js` |
| 2 | `react-test-renderer` 用 `*` | npm 拉到 19.3.0，peer 要 `react@^19.3.0` → `ERESOLVE` 装不上 | 钉 `react-test-renderer@19.2.3`（与 `react` 同版本）；同时把 `react-dom` 也钉 19.2.3 |
| 3 | TypeScript 6 弃用 `baseUrl` | `tsc --noEmit` 报 `TS5101` | 去掉 `baseUrl`，`paths` 直接写相对路径 `./src/*` |
| 4 | `@types/jest` / `@types/node` 未被自动纳入 | 测试文件里 `describe`/`expect`/`fs` 全报 `TS2304/TS2591` | tsconfig 显式 `"types": ["jest", "node"]` |
| 5 | `expo-symbols` 的 peer `expo-font` 未装 | `npx expo-doctor` 1/21 失败（"may crash outside of Expo Go"） | `npx expo install expo-font`（**与"只用系统字体"不冲突**：它是 peer 依赖，不是用来加载字体） |
| 6 | **`react-native-reanimated` / `react-native-worklets` 被 npm 拉到超出 SDK 57 钉版** | `npm ls` 报 `react-native-worklets@0.13.0 invalid: "^0.7.4 \|\| … \|\| ^0.10.0" from expo-modules-core`；实际装成 reanimated **4.7.1** / worklets **0.13.0**（宪法 9.9 记的 SDK 57 钉版是 **4.5.1 / 0.10.1**）。`expo-doctor` **没抓到**（它不查传递依赖）——是**渲染测试**把它暴露出来的（worklets 原生模块在 Jest 里加载失败） | `npx expo install react-native-reanimated react-native-worklets` → 回到 4.5.1 / 0.10.1。**教训：`npx expo install` 只保证你点名的包，传递依赖要自己按 `bundledNativeModules.json` 核** |
| 7 | `lucide-react-native` 在 Jest 下解析到 ESM | `SyntaxError: Cannot use import statement outside a module`（指向 `icons/mail`） | `moduleNameMapper` 显式指向包内 CJS 产物 `dist/cjs/icons/*.js` |
| 8 | `react-native-worklets` 的 `.native.ts` 在 Jest 里拿不到 TurboModule | `TypeError: Cannot read properties of undefined (reading 'loadUnpackers')` | `app/jest/resolver.js`：**先做 worklets 的 `.native.*` 剥离，再交给 RN 官方解析器**（worklets 自带的 resolver 会丢掉 RN 解析器，不能直接用） |
| 9 | **`@tanstack/react-query` 的版本在两端漂移**（P1-02） | `npx expo install @tanstack/react-query` 装到 **5.104.1**（当天发布），而 Web 的 lock 解析为 **5.96.2** → 同一份 `shared/query/queryKeys.js` 契约会被**两个版本**解释；这类差异只在行为上显现（缓存/重试语义），排查成本极高 | **把 App 钉到 `5.96.2`**（与 Web 完全一致）：`npx expo install @tanstack/react-query@5.96.2`。**升级时两端一起升** —— 这条对任何"shared 契约 + 宿主各自装包"的组合都适用 |
| 10 | P1-02 引入的两个含原生代码依赖需要 **Jest 官方 mock** | 不 mock 则在 Jest 里加载原生模块失败 | `app/jest.setup.js` 里用**包自带**的 mock（`.../jest/async-storage-mock`、`.../jest/netinfo-mock`）；⚠️ `jest.config.js` 的 `setupFiles` **必须展开 preset 的值**，否则会把 jest-expo 自己的 setup 丢掉 |
| 11 | **`@ronradtke/react-native-markdown-display` 的 `dist/` 带着未编译的 JSX**（P1-08） | `SyntaxError: Unexpected token '<'`，指向 `dist/index.js` 的行内 JSX。Metro 会编它，**Jest 不会**（`node_modules` 默认不进 `transform`） | 在 `jest.config.js` 的 `transformIgnorePatterns` 里给它开例外：**展开 preset 自己的正则、只追加一项**（`…|@ronradtke/react-native-markdown-display))`）。⛔ 不要手写一份完整名单 —— 那会随 `jest-expo` 升级静默过期。**教训：准入时"0 原生文件"只说明能 OTA，不代表测试工具链开箱可用** |
| 12 | **`expo-secure-store` 没有自带 jest mock**（P1-13） | 它的方法全走原生桥，Jest 里直接崩 | ⚠️ 这是**唯一**一个我们自写替身的依赖（实测 `57.0.4` 目录下无任何 `*mock*` 文件）→ 在 `app/jest.setup.js` 里给一个**内存实现**，并写明与原生语义一致的边界（读不到返回 `null`、删不存在的 key 不抛）。将来该包若补上官方 mock，应换回官方的 |

---

## 4. 未闭合项

| # | 项 | 影响 |
|---|---|---|
| 1 | `app/LICENSE` 是 Expo 模板自带的 MIT（© 650 Industries） | 仓库根无 LICENSE；`app/LICENSE` 会被误读为"本 App 由 Expo 授权"。**建议所有者决定**：删除 / 换成项目自己的许可证 / 保留并注明来源（登记为待所有者） |
| 2 | `app/assets/*.png` 仍是模板占位图标（含模板的浅蓝 `adaptiveIcon.backgroundColor`） | 与品牌无关；**启动页与图标属品牌资产**，Phase 3 前替换（不阻塞 Phase 0） |
| 3 | `runtimeVersion` 策略（`fingerprint` vs `appVersion`）**未写进 `eas.json`** | ⚠️ **2026-10-02 复检修正**：`expo-updates` **未安装** → 本项目**没有 OTA 层**，而 `runtimeVersion` 的语义是"构建的**原生层** ↔ **update** 的兼容性" → **当前没有消费者，不阻塞首次构建**。改为"**采纳 OTA 时再定**"（宪法 11.3 的倾向仍是 `fingerprint`） |
| 4 | `jest@29.7.0` 发布于 2023-09-12（明显老旧） | 由 `jest-expo@57.0.5` 的 peer 决定；⛔ 不自行升到 30（会把 `jest-expo` 的 transform 搞坏）。风险：与仓库根 Jest 30 并存的认知成本，已在 §1.2 注明 |

---

## 5. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立。17 个直接依赖 + 9 个开发依赖逐条登记五项判据；登记 7 项被拒依赖、5 项已解决问题的排障记录、4 项未闭合 |
| **v1.1** | **2026-10-02** | **Phase 1 第二批 5 个直接依赖**（P1-02）：`@tanstack/react-query@5.96.2` · `@shopify/flash-list@2.0.2` · `@react-native-async-storage/async-storage@2.2.0` · `@react-native-community/netinfo@12.0.1` · `@ronradtke/react-native-markdown-display@9.0.3`，逐条登记五项判据（采集方式不变，`.scratch/collect-deps.js`）。新增排障记录 **#9**（react-query 两端版本漂移 → 钉到与 Web 一致）与 **#10**（原生依赖的官方 Jest mock + `setupFiles` 必须展开 preset）。修正 §4-3：`runtimeVersion` 经复检**当前无消费者**（`expo-updates` 未安装 → 无 OTA 层），不再写"阻塞首次构建" |
