# App 图标方案：Lucide 与平台原生图标

**调研人**：图标体系子代理（授权独立核实，不采信仓库内既有结论）
**调研时间**：**2026-10-01（+08:00）**
**性质**：本文是《App 设计宪法》**第 16 条（图标体系）**的事实依据与**细则落地**。宪法 §16.1 已定两层归属与判据，§16.3 明确把「具体档位与 stroke 值」列为【提案】待脚手架期定稿——**本文供给该提案所需的全部一手事实**。
**本文要回答的问题**：**「一层用 Lucide、二层用平台原生」这条裁决，具体到包、版本、图标名、尺寸与无障碍，分别是什么？**

**范围声明**：本文**只**处理图标（icon）。mascot / 启动页 / App 图标的图形资产不在本文范围（宪法 §1.3.x 另行规定）。

---

## 0. 证据等级标注约定

| 标注 | 含义 |
|---|---|
| 【一手实测】 | 本机跑命令 / 解包读源码得到的原始结果，附命令与原始输出 |
| 【官方文档】 | 官方文档、官方仓库、npm registry 元数据等一手来源 |
| 【推断】 | 笔者据上述证据的推论，**明确标注为推断** |
| 【未能证实】 | 查不到一手来源，**不采信、不猜** |

**方法学说明（决定本文结论的强度）**：

1. **【一手实测】本文所有 Lucide 图标名，都是从 npm tarball 解包后的图标数据里逐条提取的权威名单里精确匹配出来的，不是从文档或记忆里抄的。** 提取口径与命令见 §5.1。
2. **【一手实测】本文所有 Material Symbols 名称，都是从 `@expo/material-symbols` 解包后的 3849 个 XML 资产文件名里精确匹配出来的。**
3. **⚠️ 一条会影响排期的实测**：`lucide-react-native` 从 **0.x 升到 1.49.0**（v1 线）后**大量图标被重命名或移除**。仓库里任何按 Lucide 0.x 记忆写下的图标名，**相当一部分今天不存在**。实测 243 个候选中 **20 个已不存在**（完整名单见 §6）。
4. **数据读取日**：2026-10-01。npm registry / tarball / 官方文档均为当日读取。

---

## 1. 结论速览（TL;DR）

均为**事实**，不含选型建议：

- **【一手实测】`lucide-react-native@1.49.0` 的 license 是「ISC + MIT 双许可」，不是单一 ISC。** `npm view` 只报 `"license": "ISC"`，**这是不完整的**：包里 `LICENSE` 文件共 3208 字节，第二部分明确写 *"The MIT License (MIT) (for the icons listed above)"*，覆盖 **约 140 个源自 Feather 项目的图标**（`alert-circle`、`arrow-left`、`check`、`search`、`upload`、`x`、`trash`、`more-horizontal` … 全文名单在文件内）。**结论：两者都是宽松许可，商用无碍，但许可证清单必须同时披露 ISC 与 MIT(Feather/Cole Bemis)。** 官方 license 页同文（`https://lucide.dev/license`）。
- **【一手实测】`lucide-react-native@1.49.0` 是纯 JS 包 —— 零原生代码。** 对 9619 个文件做原生扩展名与 `android/` `ios/` 目录扫描，**`.podspec` / `.swift` / `.kt` / `.java` / `.mm` / `.h` / `.cpp` 命中数 = 0**。包内只有 `dist/cjs`、`dist/esm`、`dist/types` 三个目录。
  → **直接后果（宪法 §11 判据）：它升级只需发 JS bundle，可走 OTA，不占原生发版窗口。** 这与 `@expo/ui`（231 个原生源文件）形成鲜明对照。
- **【一手实测】Lucide 的 tree-shaking 是「逐图标独立模块」结构，可以做到只打包用到的图标；但官方明确说 barrel 导入在 Web 导出上「不可靠地」不生效，必须走子路径导入。** 包内 `dist/esm/icons/` 有 **1858 个 `.mjs`**（1857 个图标 + 1 个 barrel），每个图标一个文件、只 import 一个 `createLucideIcon`。官方 RN 文档原文：*"On **web exports** it can be a problem, because the Metro bundler is currently not very good at tree-shaking barrel imports and may include **all** icons… In practice this tree-shaking does **not** currently work reliably for `lucide-react-native` barrel imports."* 官方推荐写法：
  ```jsx
  import Camera from 'lucide-react-native/icons/camera';
  ```
  **这是本文给出的唯一合规导入形态**（详见 §4.1）。
- **【一手实测】SDK 57 的 `react-native-svg` 钉在 `15.15.4`，落在 Lucide 声明的 peer 范围内，满足。** Lucide peer 为 `react-native-svg: ^12.0.0 || ^13.0.0 || ^14.0.0 || ^15.0.0`；`^15.0.0` 覆盖 `15.15.4`。**且 `lucide-react-native` 的 `dependencies` 为空 —— 它是纯 peer 依赖，不会偷偷装第二个 svg。**
- **【一手实测 + 官方文档】`expo-symbols` 在 SDK 57 已经不是 iOS-only 库，而是跨平台原生符号库：iOS/tvOS 用 SF Symbols，Android/web 用 Material Symbols。** 文档原文：*"On iOS and tvOS, it uses SF Symbols. On Android and web, it uses Material Symbols."* `docs.expo.dev/versions/latest/sdk/symbols` 的 front-matter `platforms: ['android','ios','tvos','web','expo-go']`。**这一条推翻了仓库内「`expo-symbols` 仅 iOS 侧」的旧表述**（《App组件层调研》§3 表注写的是「含原生代码（仅 iOS/macOS 侧）」，指的是原生代码分布，不是平台可用性——两者不要混读）。
- **【官方文档】`@expo/ui` 的 `Icon` 是「iOS 用 SF Symbol、Android 用 Material Symbol」的通用图标，但官方明确：`Icon` 不在 Web 上渲染。** 原文：*"A platform-native icon… On Android, it renders a Material Symbol XML vector drawable… On iOS, it renders an SF Symbol."* 与 *"**Note:** `Icon` does not render on web."* → **Web 端第 2 层必须有 fallback（见 §4.4）。**
- **【官方文档】`@expo/ui` 的 `Icon` 有一个会直接影响无障碍验收的缺口：`accessibilityLabel` 只在 Android 生效。** 原文：*"Accessibility label for screen readers. On Android, maps to `contentDescription`. **iOS accessibility is not yet wired up.**"* → **宪法 §16.4 的「TalkBack / VoiceOver 逐个核对」在 iOS 上不能依赖 `@expo/ui/Icon` 自身，必须在包装层用 RN 的可访问性属性补齐**（见 §4.3）。
- **【一手实测】Lucide 的描边体系是「全局唯一」，没有任何一个图标自带例外。** 对全部 1857 个图标模块扫描：**含 `strokeWidth` 覆盖的模块 = 0，含 `strokeLinecap` 覆盖的模块 = 0**；全局默认写死在一处 `defaultReactAttributes`：`{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }`。官方分节文档印证：*"All icons are designed with SVG elements using strokes. These have a default stroke width of `2px`."* / *"By default, the size of all icons is `24px` by `24px`."*
  → **「同一层内描边风格必须一致」（宪法 §16.2.3）在 Lucide 侧是天然成立的，只要你不逐处改 `strokeWidth`。**
- **【一手实测】Lucide 提供一个官方全局样式入口 `LucideProvider`（`size` / `color` / `strokeWidth` / `absoluteStrokeWidth` / `nonScalingStroke` / `className`），这是「全局统一描边」的机制性保障。** 官方文档：*"To style all icons globally, you can use a context provider."* → **本文据此要求：`<Icon>` 原子内部必须**不**透传 `strokeWidth`，全局只在 `LucideProvider` 设一次。**
- **【一手实测】`@expo/material-symbols@0.1.1` 是 MIT，含 3849 个 Material Symbols XML 资产，7,703 个文件，解包 4.29 MB。** 它是 `@expo/ui` 的 `Icon` 在 Android 侧的**推荐资产来源**（官方文档点名），且**不在 `bundledNativeModules.json` 里**（见 §2.4）。
- **【一手实测】宪法 §16.1 把「原生 Tab 栏」划入第 2 层，这产生一个必须解决的冲突：一级导航四个 Tab 的图标不能用 Lucide。** §4.3 又规定「Tab 栏一律使用平台原生实现」「不得退回自绘 Tab 栏」。两者合起来只有一种自洽读法：**Tab 图标是平台资产（SF Symbols + Material Symbols），不是 Lucide**。→ 本文 §3.2 给出四个 Tab 的**两套平台图标名**（均已在资产里逐个核实存在）。

---

## 2. 事实表（A 部分）

### 2.1 `lucide-react-native@1.49.0` 主表

数据来源：`npm view`（版本级元数据）+ 对 tarball 的完整解包扫描。读取日 **2026-10-01**。

| 项目 | 实测值 | 证据等级 | 来源 |
|---|---|---|---|
| 版本 | **1.49.0**（`dist-tags.latest = 1.49.0`；`next = 1.3.0`） | 【一手实测】 | `https://registry.npmjs.org/lucide-react-native` |
| 发布时刻 | **2026-09-29T22:27:09.286Z** | 【一手实测】 | 同上 `time['1.49.0']` |
| `license` 字段 | `ISC` | 【一手实测】 | 同上 |
| **实际许可（读 LICENSE 全文）** | **ISC（包本体）+ MIT（约 140 个 Feather 派生图标）** —— 双许可 | 【一手实测】 | tarball 内 `package/LICENSE`（3208 B）；同文见 `https://lucide.dev/license` |
| **是否含原生代码** | **否。零原生文件**（`.podspec/.swift/.kt/.java/.mm/.h/.cpp` 命中 0） | 【一手实测】 | 对 9619 个解包文件扫描 |
| 包内目录 | 仅 `dist/cjs`、`dist/esm`、`dist/types` | 【一手实测】 | 同上 |
| `dependencies` | **无**（空） | 【一手实测】 | `npm view lucide-react-native@1.49.0 dependencies` |
| `peerDependencies` | `react: ^16.5.1 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0`；**`react-native-svg: ^12.0.0 \|\| ^13.0.0 \|\| ^14.0.0 \|\| ^15.0.0`**；`react-native: *`；`@types/react: *`（`optional`） | 【一手实测】 | `package/package.json` |
| `react@19.2.3` 是否满足 peer | **是**（`^19.0.0` 覆盖 19.2.3） | 【推断】 | 同上 + 宪法 §3.2 的 react 版本 |
| **`react-native-svg@15.15.4` 是否满足 peer** | **是**（`^15.0.0` 覆盖 15.15.4） | 【一手实测 + 推断】 | peer 声明见上；pin 见 §2.3 |
| `dist.unpackedSize` | **29,617,598 B ≈ 29.6 MB** | 【一手实测】 | `npm view` |
| `dist.fileCount` | **9619** | 【一手实测】 | `npm view` |
| tarball 大小 | **2,280,914 B ≈ 2.28 MB** | 【一手实测】 | `Invoke-WebRequest` 实测下载字节数 |
| 文件类型分布 | `.map` 3746 / `.ts` 2124 / `.mjs` 1873 / `.js` 1873 / `.json` 1 / `.md` 1 | 【一手实测】 | 按扩展名分组统计 |
| **图标模块数** | **`dist/esm/icons/*.mjs` = 1858**（1857 个图标 + `index.mjs` barrel） | 【一手实测】 | 文件计数 |
| **权威图标名总数** | **1857**（从每个模块的 `__iconData.name` 提取后去重） | 【一手实测】 | §5.1 提取命令 |
| `sideEffects` | **`false`** | 【一手实测】 | `package.json` |
| `exports` 子路径 | `.`、`./icons`、**`./icons/*`**（支持逐图标导入） | 【一手实测】 | `package.json` |
| 全部图标原始 JS 体积 | **1,465,346 B ≈ 1.40 MB**（1857 个 ESM 模块未压缩之和，不含 barrel） | 【一手实测】 | 文件长度求和 |
| barrel 体积 | `dist/esm/icons/index.mjs` = **110,928 B**；`dist/esm/lucide-react-native.mjs` = **248,828 B** | 【一手实测】 | 文件长度 |
| **默认尺寸** | **24**（`icon.size = 24`，context 默认 `size = 24`） | 【一手实测 + 官方文档】 | `dist/esm/Icon.mjs`；`https://lucide.dev/guide/react-native/basics/sizing` |
| **默认描边** | **strokeWidth 2**，`fill: 'none'`，`stroke: 'currentColor'`，`strokeLinecap: 'round'`，`strokeLinejoin: 'round'` | 【一手实测 + 官方文档】 | `defaultReactAttributes.mjs`；`https://lucide.dev/guide/react-native/basics/stroke-width` |
| 逐图标描边例外 | **0 处**（1857 个模块无一覆盖 strokeWidth/strokeLinecap） | 【一手实测】 | 全量正则扫描 |
| 默认颜色 | `currentColor`（跟随父级文字色） | 【一手实测】 | `context.mjs` |
| 额外特性 | `absoluteStrokeWidth`、`nonScalingStroke`（尺寸变大时描边**物理宽度不变**）、`LucideProvider` 全局样式、别名（aliased names） | 【一手实测 + 官方文档】 | `Icon.mjs` / `context.mjs`；官方 Global Styling 与 Stroke width 页 |

**许可结论（可据以填宪法 §3.4 的许可证登记项）**：

> `lucide-react-native` 采用 **ISC（包本体）**；其中约 140 个图标派生自 Feather 项目，**以 MIT 授权，版权归 Cole Bemis（2013-present）**。两份许可全文均在包内 `LICENSE` 中，**分发时须原样保留**（ISC 与 MIT 都要求保留版权声明与许可声明）。**两者均为宽松许可，无 copyleft，无商用限制，无署名以外的义务。**

### 2.2 逐图标导入与 tree-shaking（决定 1000+ 图标是否拖累 bundle）

**【一手实测】结构事实**：每个图标是独立 ESM 模块，只依赖一个共享工厂：

```js
// dist/esm/icons/a-arrow-down.mjs（原文，仅注释略）
import createLucideIcon from '../createLucideIcon.mjs';
const __iconData = { name: "a-arrow-down", size: 24, node: [ ['path',{d:"m14 12 4 4 4-4",key:"buelq4"}], ... ] };
__iconData.node;
const AArrowDown = createLucideIcon(__iconData);
export { __iconData, AArrowDown as default };
```

**结论（分档，必须区分，否则会误判）**：

| 场景 | 是否只打包用到的图标 | 依据 |
|---|---|---|
| **逐图标导入**（`lucide-react-native/icons/<kebab-name>`） | ✅ **保证**（结构上不可能打进别的图标） | 【一手实测】每个图标一个文件、无相互 import |
| **barrel 导入 + native**（`import { Camera } from 'lucide-react-native'`） | ⚠️ 官方称 *"On native platforms this is usually fine"* | 【官方文档】 |
| **barrel 导入 + Web 导出** | ❌ **不保证，可能打进全部图标** | 【官方文档】原文见 §1 |

**官方原文（`https://lucide.dev/guide/react-native/advanced/optimizations`）**：

> *"By default you import icons from the `lucide-react-native` entry point… This is convenient, but it relies on the bundler to tree-shake the entry point (a **"barrel" file** that re-exports every icon)… On **web exports** it can be a problem, because the Metro bundler is currently not very good at tree-shaking barrel imports and may include **all** icons in your final bundle."*
> *"In practice this tree-shaking does **not** currently work reliably for `lucide-react-native` barrel imports, so the unused icons are not removed from web exports."*
> *"**Recommended: import icons individually** … Because each icon lives in its own file, the bundler only ever includes the icons you explicitly import."*
> *"The icon module name is the **kebab-case** version of the icon name… the `ArrowRight` icon is imported from `lucide-react-native/icons/arrow-right`."*

**Expo 侧的对应官方立场（`https://docs.expo.dev/guides/tree-shaking`，该页 `modificationDate: October 01, 2026`）**：

- `experimentalImportSupport`：*"**Enabled by default in SDK 54 and later.**"* → SDK 57 已默认开启，无需配置。
- **自动删除未使用的 import/export（即跨模块 tree-shaking）**：*"Experimentally available in SDK 52 and later"*，且**需要显式打开两个环境变量**才生效：
  ```sh
  EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1
  EXPO_UNSTABLE_TREE_SHAKING=1
  ```
- Expo 文档**点名**了 Lucide：*"You can use this strategy with libraries like `lucide-react` to remove all icons that are not used in your app."*
- 前提条件（会静默失效的坑）：*"Tree-shaking only runs in **production** bundles and can only run on modules that use `import`/`export` syntax. Files that use `module.exports` and `require` will **not** be tree-shaken."* / *"Avoid adding Babel plugins such as `@babel/plugin-transform-modules-commonjs`… This will **break** tree-shaking across your project."* / *"Modules that are marked as **side-effects will not be removed** from the graph."*

**【推断】因此本项目的最优解是「不依赖任何实验特性」**：使用逐图标导入后，**Native 与 Web 两端都只打包用到的图标**，既不依赖 `EXPO_UNSTABLE_TREE_SHAKING`，也不依赖 Metro 对 barrel 的处理能力。**这条不依赖宪法 §16.3 的待定档位，可以现在就定死。**

**量化（【推测】但基于实测体积）**：全部 1857 个图标的 ESM 源码合计 1.40 MB（未压缩）。若某次 Web 导出误把 barrel 全量打进，**量级参考就是这个 1.40 MB 的源码体积**（实际打包后体积取决于压缩与 minify，**本文不给出未实测的 minify 后数字**）。按应用实际用量（本文清单约 60 个图标）估算，逐图标导入后的量级是 **数十 KB 级**。**⚠️ 该估算未经导出实测，须在脚手架期用 `expo export --platform web` + Expo Atlas 复核（见 §7）。**

### 2.3 SDK 57 pin 关系（对 `bundledNativeModules.json` 的实测）

来源：**【一手实测】**下载并解包 `expo@57.0.26`（`dist-tags.latest`），读 `package/bundledNativeModules.json`。读取日 2026-10-01。

| 包 | `bundledNativeModules.json` 中的值 | npm `latest` | 是否一致 |
|---|---|---|---|
| **`react-native-svg`** | **`15.15.4`**（精确钉死） | `15.15.4` | ✅ 一致 |
| **`expo-symbols`** | **`~57.0.3`** | `57.0.3` | ✅ 一致 |
| **`@expo/ui`** | **`~57.0.21`** | `57.0.21` | ✅ 一致 |
| **`@expo/material-symbols`** | **（不存在此键）** | `0.1.1` | ⚠️ **不在 Expo 兼容矩阵内** |
| `expo-router` | `~57.0.24` | `57.0.24` | ✅ 一致 |
| `react-native` | `0.86.3` | — | 与任务书一致 |
| `react` | `19.2.3` | — | 与任务书一致 |

**peer 满足性判定（问题 3 的答案）**：

> `lucide-react-native@1.49.0` 声明 `react-native-svg: ^12.0.0 || ^13.0.0 || ^14.0.0 || ^15.0.0`。
> SDK 57 把 `react-native-svg` 钉在 **`15.15.4`**。
> **`^15.0.0` 覆盖 `15.15.4` → peer 满足，且 `npx expo install` 装出来的版本可直接用，无需 `--legacy-peer-deps` 或任何 override。** 【一手实测 + 推断】
> **且 Lucide 的 `dependencies` 为空**，所以它不会引入第二个 `react-native-svg` 实例 —— 这是 RN 上 `react-native-svg` 类库最常见的炸点，此处天然规避。

**⚠️ `@expo/material-symbols` 的版本纪律例外（必须记录）**：它**不在** `bundledNativeModules.json` 里，所以 `npx expo install @expo/material-symbols` **不会**被 Expo 的兼容矩阵约束（`expo install` 对它退化为普通 `npm install`）。**【推断】风险等级：低**——它是纯资产包（3849 个 XML），不含原生代码；但**它也因此不受 SDK 升级自动校验**，须自行登记版本。**依据**：`bundledNativeModules.json` 中查无此键【一手实测】。

### 2.4 平台原生图标选项（问题 4 的答案）

| 方案 | 平台覆盖 | 图标来源 | License | 实测/文档要点 | 来源 |
|---|---|---|---|---|---|
| **`expo-symbols`**（`SymbolView`） | **Android / iOS / tvOS / Web / Expo Go** | iOS+tvOS：**SF Symbols**；**Android + Web：Material Symbols** | **MIT** | **beta**（官方标注 *"currently in beta and subject to breaking changes"*）；跨平台写法是给 `name` 传对象 `{ ios, android, web }`；只传字符串则**仅 iOS 渲染**，Android/Web 需要 `fallback`；提供 `Symbol.unstable_getMaterialSymbolSourceAsync(symbol,size,color)` → `Promise<ImageSourcePropType>`（**专为 tab bar 图标这类需要 ImageSource 的 API 准备**） | 【官方文档】`https://docs.expo.dev/versions/latest/sdk/symbols` + 【一手实测】`npm view expo-symbols@57.0.3 license`=MIT |
| **`@expo/ui` 的 `Icon`** | **Android / iOS**（**Web 不渲染**） | Android：Material Symbol **XML vector drawable**；iOS：**SF Symbol** | **MIT** | 官方自述 *"A platform-native icon — SF Symbol on iOS, Material Symbol on Android"*；`Icon.select({ ios, android })` 跨平台选源 + `@expo/ui/babel-plugin`（`babel-preset-expo` 自动加载）按平台剔除未用一侧；**`accessibilityLabel` 仅 Android 生效**；`size` 单位 Android=dp、iOS=pt | 【官方文档】`https://docs.expo.dev/versions/latest/sdk/ui/universal/icon` + 【一手实测】`npm view @expo/ui@57.0.21 license`=MIT |
| **`@expo/material-symbols`** | Android（资产源） | **3849 个 Material Symbols XML** | **MIT** | 【一手实测】v0.1.1，7,703 文件，解包 4,287,284 B；`xml count = 3849`；官方文档点名它是 Android 侧推荐来源 | 【一手实测】解包 + 【官方文档】同上 |
| **原生容器自带** | 各平台 | Tab bar / nav bar / menu / date picker / share sheet **由系统提供，不可替换** | 系统 | 宪法 §4.3：*"Tab 栏、Header、Sheet、返回手势一律使用平台原生实现"* | 【官方文档】宪法 §4.3 |

**⚠️ 两处「不能想当然」的实测结论**：

1. **`expo-symbols` 不是 iOS-only**。文档 front-matter `platforms: ['android','ios','tvos','web','expo-go']`，正文明确 Android/web 走 Material Symbols。**仓库内旧表述「`expo-symbols` 仅 iOS 侧」若被读成「平台可用性」，是错的**——它说的是原生代码（`ios/`）的分布位置。
2. **`@expo/ui` 的 `Icon` 在 Web 上什么都不渲染**。官方加粗原文 *"Note: `Icon` does not render on web."* → **Web 端第 2 层必须走 `expo-symbols`（它支持 web）或用第 1 层资产兜底**（见 §4.4）。

---

## 3. 第 1 层清单：品牌位 / 自绘位置 → Lucide（B-1）

### 3.1 命名与导入规则（先立规矩，再看清单）

**【一手实测】子路径 = 图标名的 kebab-case**（官方文档明说，且包内 `exports` 里确有 `./icons/*`）。本文清单同时给出 **Lucide 名（kebab-case，用于导入路径）** 与 **PascalCase 组件名（用于 JSX）**。

```tsx
// ✅ 唯一合规形态（Native 与 Web 一致，不依赖实验性 tree-shaking）
import Utensils from 'lucide-react-native/icons/utensils';
import CircleAlert from 'lucide-react-native/icons/circle-alert';

// ❌ 禁止：barrel 导入（Web 导出可能打进全部 1857 个图标）
import { Utensils, CircleAlert } from 'lucide-react-native';
```

> **【推断】为什么把 barrel 导入写成硬禁而不是「native 可以、web 不行」**：本文 §4.1 要求同一份 `Icon` 原子代码在两端通吃。若允许 barrel，**同一行代码在 native 上合规、在 web 上造成 MB 级膨胀**，这种「平台条件性的性能缺陷」在 code review 里不可能被稳定拦住。**一条规则两端都安全，胜过一个需要逐平台判断的规则。**

### 3.2 一级导航四个 Tab（**归属：第 2 层**，⚠️ 注意这里有冲突）

**⚠️ 冲突与裁决依据（必须先说清）**：任务书与常识会把 Tab 图标放进「品牌位」，但 **宪法 §16.1 明确把「原生 Tab 栏」划入第 2 层**，§4.3 又规定 **Tab 栏一律平台原生、不得自绘**。两条合起来只有一种自洽读法：

> **Tab 图标是平台资产，不是 Lucide。** 因为 Tab 栏由系统容器绘制，图标必须与容器的字体/填充/选中态/最小化行为协同，塞 Lucide 进去等于部分自绘。

**因此本文把四个 Tab 放在第 2 层，并给出两套平台图标名（已在资产内逐个核实存在）。**

| Tab | iOS（SF Symbols）【提案】 | Android / Web（Material Symbols）✅ 已核实 |
|---|---|---|
| **广场** | `square.grid.2x2` | **`grid_view`** |
| **工具** | `wrench.and.screwdriver` | **`construction`**（备选 `build`、`home_repair_service`） |
| **校园里** | `building.columns` | **`school`** |
| **我的** | `person.crop.circle` | **`account_circle`**（备选 `person`） |

**核实口径**：Material Symbols 一侧以上 4 个名字均在 `@expo/material-symbols@0.1.1` 的 3849 个 XML 文件名中**精确命中**【一手实测】。
**iOS 一侧标【提案】**：SF Symbols 名单**不在包内**、无法离线核实，本文**不为其背书**；须在脚手架期用 Apple 的 SF Symbols app 核对（见 §7）。
**已排除的名字（反例，勿用）**：`tools` ❌ 不存在；`person_filled` ❌ 不存在（二者在 `@expo/material-symbols@0.1.1` 中均未命中）【一手实测】。

**⚠️ 一个真实风险（须脚手架期实测）**：`expo-symbols` 官方仅提供 **`Symbol.unstable_getMaterialSymbolSourceAsync()`** 这一条「取 ImageSource」的路径给 tab bar 用，且名字里带 **`unstable_`**；`@expo/ui` 官方**没有**为 tab bar 提供取图 API。**宪法 §4.3 已把「SDK 57 上的原生 Tab 实现路径」列为脚手架首周必须定案的事项**——本文只提供图标名，不宣称该路径已通。

### 3.3 广场 · 五个服务入口

| 概念 | Lucide 名 | PascalCase | 为什么合适 | 中文 App 惯例冲突 |
|---|---|---|---|---|
| **食堂** | `utensils` | `Utensils` | 刀叉＝就餐的通用符号 | 无 |
| **社团** | `users` | `Users` | 群体＝组织成员 | ⚠️ **轻微**：中文 App 常用「旗帜」（`flag`）或「奖章」（`medal`）表社团/活动。**但 `flag` 在本清单已被「举报」占用**（见 §3.6），§16.3 要求「同一含义全局只能有一个图标」，故社团让位给 `users` |
| **二手市场** | `shopping-bag` | `ShoppingBag` | 购物袋＝交易 | 无（中文 App 亦常用购物袋） |
| **跑腿** | `bike` | `Bike` | 校园跑腿以电动车/自行车为主 | ⚠️ **有**：`bike` 读作「骑车」而非「代取快递」。**更贴合 `package`（包裹）或 `truck`（配送）**。本文取 `bike`，**备选 `package`**——最终须按产品实际形态（人跑 vs 货送）二选一，见 §7 |
| **新生指南** | `compass` | `Compass` | 指南/导航＝初来者的方向感 | ⚠️ **有**：字面「指南」会让人预期「书」；`book-open` 更直白但更泛。本文取 `compass`（语义更贴「新生」），**备选 `book-open` / `graduation-cap`** |

### 3.4 工具 · 四类能力

| 概念 | Lucide 名 | PascalCase | 为什么合适 | 中文 App 惯例冲突 |
|---|---|---|---|---|
| **课程表** | `calendar-days` | `CalendarDays` | 日历＝按日排布的课 | 无（中文 App 课表图标几乎都是日历） |
| **待办** | `list-checks` | `ListChecks` | 带勾选清单＝可勾掉的条目 | 无 |
| **放假日** | `calendar-heart` | `CalendarHeart` | 日历＋休憩感 | ⚠️ **有**：字面不直白，且中文 App 常用 `party-popper`（假期喜庆）。本文取 `calendar-heart`（与「课程表」同族，保持日历语族），**备选 `party-popper` / `plane` / `tent-tree`** |
| **校方系统快速打开** | `external-link` | `ExternalLink` | 「跳到外部系统」的标准符号 | 无；⚠️ **但宪法 §4.1.2 警告不得让工具 Tab「在感知上等同于浏览器」**——`external-link` 会强化「跳出去」的观感，**建议仅在子项上使用，不在 Tab 层级放大** |

**校方系统三个具体入口**（宪法 §4.1.2 点名 AC 系统 / Moodle / 签到）：

| 概念 | Lucide 名 | PascalCase | 依据 |
|---|---|---|---|
| **AC 系统 / 一般校方 Web 系统** | `app-window` | `AppWindow` | 一个「系统窗口」的中性表达，不冒充外部链接 |
| **Moodle（课程/教学平台）** | `graduation-cap` | `GraduationCap` | 学位帽＝教学平台 |
| **签到** | `qr-code` | `QrCode` | 校园签到以扫码为主；**备选 `scan-line`**（更泛的「扫」） |

### 3.5 校园里 · 两个匿名内容区

| 概念 | Lucide 名 | PascalCase | 为什么合适 | 中文 App 惯例冲突 |
|---|---|---|---|---|
| **树洞** | `tree-pine` | `TreePine` | 字面即「树」，「洞」在匿名语境中是约定俗成的意象 | ⚠️ **有（但方向一致）**：中文 App 的树洞图标普遍取「树/树林/树洞」意象，**`tree-pine` 契合**。风险在于「树」也可能被读成环保/自然。**备选 `ghost`**（匿名感强，语义更贴近「不愿具名」）。**本文取 `tree-pine`，理由：`ghost` 已在语义上靠近「万能墙」的匿名基调，两者需要有区分度** |
| **万能墙** | `brick-wall` | `BrickWall` | 字面即「墙」，`wall` 的合法存在形式 | 无（字面直译，理解成本最低）。**备选 `layout-panel-top`**（面板感，但不直观） |

> **⚠️ 命名陷阱（实测）**：Lucide 1.x **没有 `wall`**。本文实测 `wall`【未能证实】不存在，近似名是 `brick-wall` / `brick-wall-fire` / `brick-wall-shield`。**`brick-wall` 已核实存在**【一手实测】。

### 3.6 全局动作与状态位

| 概念 | Lucide 名 | PascalCase | 为什么合适 | 中文 App 惯例冲突 |
|---|---|---|---|---|
| **信箱**（顶栏右上角） | `mail` | `Mail` | 邮件＝私人信件 | ⚠️ **有**：中文 App 的「信箱」多用**信封**（`mail` ✅）而非美式**立式信箱**（`inbox` ❌ 会读成「收件箱/仓库」）。**本文取 `mail`**（宪法 §4.7 的信箱是私信入口） |
| **发布的条目图标**（发布中心内） | `square-pen` | `SquarePen` | 「写一条」＝方块内笔 | 无 |
| **第 5 格「＋ 发布」本身** | ⛔ **不用 Lucide** | — | 它长在**原生 Tab 栏**里 → 属**第 2 层**，用平台图标名（Android `add` / iOS `plus`） | — |

> ⚠️ **2026-10-02 更新（第三轮裁决）**：发布入口已由 **FAB 改为底栏第 5 格**（[骨架规范 §3](../design/App页面骨架与布局规范.md)）。因此**承载发布入口的图标不再是 Lucide `square-pen`**，而是**平台 `add` / `plus`**（宪法 4.9.6）；`square-pen` 仍然有效，但只用于**发布中心内的条目**或内容位。这是**最容易顺手写错的一处**（"发布是我们的功能"很容易让人用品牌位图标）。
| **搜索** | `search` | `Search` | 放大镜 | 无 |
| **筛选** | `list-filter` | `ListFilter` | 漏斗＋列表 | ⚠️ **有（实测陷阱）**：Lucide 1.x **没有 `filter`**！`filter`【未能证实】。**合法名是 `list-filter`**（另有 `list-filter-plus`） |
| **返回** | `arrow-left` | `ArrowLeft` | 通用返回 | 无。⚠️ **但系统导航栏的返回属于第 2 层，不得用这个**（见 §4.2） |
| **更多** | `ellipsis` | `Ellipsis` | 横向三点 | ⚠️ **有（实测陷阱）**：Lucide 1.x **没有 `more-horizontal` / `more-vertical`**（两者均【未能证实】）。**合法名是 `ellipsis`（横向）与 `ellipsis-vertical`（纵向）** |
| **分享** | `share` | `Share` | 分享节点 | 无 |
| **举报** | `flag` | `Flag` | 举报旗 | 无（中文 App 举报亦常用旗/警示） |
| **屏蔽** | `shield-ban` | `ShieldBan` | 盾＋禁止＝拉黑挡开 | ⚠️ **有**：中文 App 「屏蔽」多用**用户＋叉**（`user-x`）。`shield-ban` 更偏「安全防护」而非「拉黑某人」。**本文同时列出 `user-x`（备选）**；若产品语义是「拉黑该用户」→ 用 `user-x`；若是「屏蔽此类内容」→ 用 `shield-ban`。**二者语义不同，不可互替** |
| **设置** | `settings` | `Settings` | 齿轮 | 无 |
| **通知** | `bell` | `Bell` | 铃铛 | 无 |
| **收藏** | `star` | `Star` | 星标 | 无（中文 App 收藏亦以星为主） |
| **点赞** | `thumbs-up` | `ThumbsUp` | 竖拇指 | ⚠️ **有**：中文社区 App（小红书/微博）**双击是爱心**（`heart`），`thumbs-up` 更贴「赞」按钮本身。**本文取 `thumbs-up`，备选 `heart`**。⚠️ **注意 `heart` 还需与「收藏」区分**，故不建议二义复用 |
| **评论** | `message-circle` | `MessageCircle` | 圆形气泡 | 无 |
| **图片** | `image` | `Image` | 单图 | 无 |
| **上传** | `upload` | `Upload` | 向上箭头＋托盘 | 无 |
| **空态** | `package-open` | `PackageOpen` | 空盒子＝此处无内容 | 无（比 `inbox` 更中性，且避开 `inbox` 与「信箱」抢语义） |
| **错误** | `circle-alert` | `CircleAlert` | 圆形叹号 | ⚠️ **有（实测陷阱）**：Lucide 1.x **没有 `alert-circle`**！`alert-circle`【未能证实】。**合法名是 `circle-alert`**（`triangle-alert` 是三角形警告，语义偏「警告」非「错误」） |
| **加载** | `loader-circle` | `LoaderCircle` | 环形加载 | 无。⚠️ **`loader` 亦存在但语义偏「加载具」**；环形旋转用 `loader-circle` 更准确 |

### 3.7 清单自洽性检查（宪法 §16.3「同一含义全局只能有一个图标」）

**✅ 本文清单内无一图标被两个不同含义复用。** 已主动避开的四处争用：

| 争用 | 处置 |
|---|---|
| 社团 vs 举报（都想用 `flag`） | 举报取 `flag`（语义更专），社团改 `users` |
| 收藏 vs 点赞（都想用 `heart`） | 收藏取 `star`，点赞取 `thumbs-up`；`heart` 仅作备选且**不与收藏复用** |
| 信箱 vs 空态（都想用 `inbox`） | 信箱取 `mail`，空态取 `package-open`，**`inbox` 全程不用** |
| 树洞 vs 万能墙（都需要「匿名」感） | 树洞取 `tree-pine`（意象），万能墙取 `brick-wall`（字面）——**用不同意象族保证区分度** |

**⚠️ 一处需要所有者裁决的语义分叉（本文不替产品做决定）**：**屏蔽**（`shield-ban` 指内容/类型 vs `user-x` 指具体用户）。二者**不是同一含义的两种画法，而是两种功能**。若产品两者都有，**必须补一个图标**，不能复用一个。

---

## 4. 第 2 层规则：系统控件位 → 平台原生（B-2）

### 4.1 判据（唯一，来自宪法 §16.1 + §4.3）

> ## **这个图标是我们画在内容里的，还是系统容器自己提供的？**
> **前者 → Lucide（第 1 层）。后者 → 平台原生（第 2 层）。**

**可操作的判定流程（本文把它落成三步，用于 code review）**：

1. **这个位置的空间，是不是由系统容器（tab bar / nav bar / menu / picker / share sheet / dialog）分配的？**
   - 是 → **第 2 层**。你只能提供「一个名字或一个 ImageSource」，**无法控制它的尺寸、描边、颜色细节**。
   - 否 → 进第 2 步。
2. **这个图标有没有随系统主题、系统外观（亮/暗）、Reduce Transparency、Dynamic Type 自动变化的要求或能力？**
   - 有 → **第 2 层**（材质与外观行为绑定在系统组件上，宪法 §4.3 明令不得自绘替代）。
   - 否 → 进第 3 步。
3. **它是我们自己的内容语义吗？**（列表行、卡片、功能区、空态、错误态、FAB、顶栏自定义动作）
   - 是 → **第 1 层**（Lucide）。

**两个反例（用来校准，避免误判）**：

| 位置 | 误判 | 正解 | 理由 |
|---|---|---|---|
| **顶栏右上角信箱** | 「在顶栏 → 系统位 → 用 SF Symbol」 | **第 1 层 → Lucide `mail`** | 我们自己放进顶栏的一个动作按钮，**不是系统分配的 nav bar item**。宪法 §16.1 明确把「顶栏动作（信箱）」列进第 1 层 |
| **返回按钮** | 「就是个箭头 → Lucide `arrow-left`」 | **第 2 层 → 原生** | 由导航容器提供，且必须参与**返回手势**与系统返回动画。宪法 §4.3 明令返回手势用原生 |

### 4.2 第 2 层位置清单与供图 API

| 位置 | 供图方式 | 实测/文档要点 |
|---|---|---|
| **原生 Tab 栏** | **iOS/SF**：`expo-symbols`；**Android/Web**：Material Symbols（`expo-symbols` 的 `name={{android,web}}`，或 `@expo/ui` 的 `Icon`——但 **`Icon` Web 不渲染**） | `expo-symbols` 提供 `Symbol.unstable_getMaterialSymbolSourceAsync()` 取 `ImageSourcePropType`，**专为 tab bar 图标这类 API 准备**【官方文档】 |
| **原生导航栏的返回 / 设置项** | **导航容器自带**（`expo-router` / 原生 stack） | 宪法 §4.3：Header 一律原生 |
| **原生菜单** | **容器自带**；`@expo/ui` 有 `@react-native-menu/menu` 的 **drop-in 替代** | 组件层调研 §4.4 |
| **ActionSheet / BottomSheet** | **容器自带**；`@expo/ui` 有 `@gorhom/bottom-sheet` 的 **drop-in 替代** | 同上 |
| **日期选择器** | `@expo/ui` 有 `@react-native-community/datetimepicker` 的 **drop-in 替代** | 同上 |
| **分享面板** | **系统分享面板**（`expo-sharing` / 系统 API）——图标与文案**完全由系统绘制，我们不可提供** | 【推断】基于系统面板的性质 |
| **系统对话框 / Alert** | **系统绘制，我们不可提供图标** | 同上 |
| **开关 / 分段控件 / 滑块 / 步进器** | **容器自带**（`@expo/ui` 亦有对应 universal 组件） | 【官方文档】`@expo/ui` universal 页 |

### 4.3 无障碍（第 2 层特有的坑）

- **【官方文档】`@expo/ui` 的 `Icon`：`accessibilityLabel` 仅 Android 生效，iOS 未接线。** 原文：*"On Android, maps to `contentDescription`. **iOS accessibility is not yet wired up.**"*
  → **后果**：只依赖 `@expo/ui/Icon` 的 `accessibilityLabel`，**iOS 上 VoiceOver 会读不出标签**，宪法 §16.4 的 VoiceOver 验收会直接失败。
  → **对策（本文要求）**：第 2 层图标**必须由包装层补齐无障碍**——用 RN 的 `accessible` + `accessibilityRole` + `accessibilityLabel` 包在外层容器上，而不是寄望于图标组件自身的 prop。
- **【官方文档】`expo-symbols` 的 `SymbolView` 不接受 `accessibilityLabel`**（其 props 表里只有 `animationSpec` / `colors` / `fallback` / `name` / `resizeMode` / `scale` / `size` / `tintColor` / `type` / `weight` + 继承的 `ViewProps`）。
  → **对策同上**：标签放在**可聚焦的父级**（Tab 触发器或按钮）上。

### 4.4 Web 端的第 2 层缺口（必须显式记录）

- **【官方文档】`@expo/ui` 的 `Icon` 不在 Web 渲染**（原文见 §2.4）。
- **【官方文档】`expo-symbols` 在 Web 上渲染 Material Symbols**（front-matter 含 `web`）。
- **【推断】因此 Web 端的第 2 层供图一律走 `expo-symbols` 的 `name={{ web: '<material_symbol>' }}`**；Web 上**不得**依赖 `@expo/ui/Icon`。
- **【推断】若 Web 端需要第 2 层造型与移动端完全对齐**，可考虑在 Web 上退回第 1 层 Lucide 资产——**但这会违反 §16.2 的「禁止任意混用」**。**本文不建议此退路**；正确做法是用 `expo-symbols` 的 web 槽位。**此条须在脚手架期实机确认**（见 §7）。

---

## 5. 尺寸 / 描边 / 无障碍规则（C 部分）

### 5.1 尺寸（宪法 §16.3：从字阶派生，不得写魔法数字）

**已成立的事实（可直接依赖）**：

- Lucide 默认 `size = 24`、默认 `strokeWidth = 2`，且 **1857 个图标无一例外**（§2.1）【一手实测】。
- `react-native-svg` 是纯 peer，尺寸由 `size` 或 `width`/`height` 控制【官方文档】。
- **应用的字阶是语义角色，不是绝对 pt**：`display / title / headline / body / label / caption`，两端取值分端生成（《App前端风格体系》§3.2）。
- **【一手实测】Web 侧现存字阶参考**（`frontend/src/styles/tokens.css`）：`display-xl 56 / display-lg 40 / h1 32 / h2 24 / h3 20 / body-lg 16 / body-md 14 / caption 12`（px）。**⚠️ 这是 Web 的尺子，App 字阶将重新生成，不可直接搬运。**

**规格（【提案】——宪法 §16.3 明确要求档位须真机定稿，故以下全部标【提案】）**：

| 档位名 | 尺寸 | 对应语义角色 | 典型落点 |
|---|---|---|---|
| `icon-inline` | **16** | 与 `caption`/`label` 同行 | 列表行内联、标签旁 |
| `icon-body` | **20** | 与 `body` 同行 | 列表行前导、输入框内 |
| **`icon-default`** | **24** | 与 `title`/`headline` 同级 | **默认档**（＝Lucide 原生设计尺寸，**无需缩放，光学最优**）；顶栏动作、Tab 邻位、FAB 内容 |
| `icon-large` | **32** | 与 `display` 同级 | 空态、错误态、功能区磁贴 |
| `icon-hero` | **48** | 独立视觉位 | 全屏空态主图 |

**【推断】为什么以 24 为默认档**：Lucide 的图标**是在 24×24 网格上设计的**（`__iconData.size = 24`，全部 1857 个一致）【一手实测】。**在非设计尺寸上缩放会引入非整数像素对齐，描边会轻微发虚**。所以「默认档 = 24」不是偏好，而是**唯一能让描边落在设计网格上的档位**。

**⚠️ 档位数量与取值均未经真机验证**，必须按 §7 定稿。

### 5.2 描边（stroke）

**规则（可直接定死，依据充分）**：

1. **`strokeWidth` 全局只设一次，禁止在任何调用点传。** 依据：① 官方默认 2 且**全部 1857 个图标无一例外**【一手实测】；② 宪法 §16.3「stroke 宽度全局统一，不逐处调整」；③ §16.2.3「同一层内必须一致」。
2. **实现方式：`<Icon>` 原子内部不透传 `strokeWidth`；若需全局调整，只用 `LucideProvider`**——官方提供的唯一全局样式入口（【官方文档】*"To style all icons globally, you can use a context provider."*）。
3. **`strokeWidth` 取 2（保持官方默认）** —— 理由：这是设计师定的光学平衡点，**改它等于重画整套图标的光学重量**。
4. **⚠️ 尺寸放大时的描边陷阱（【一手实测 + 官方文档】）**：默认 SVG 行为下，**描边宽度随图标尺寸等比放大**——`size=48` 时描边物理宽度变成 4，**光学上明显比 `size=24` 的图标粗**。官方为此提供 `nonScalingStroke`：*"when `nonScalingStroke` is enabled and the `size` of the icons is set to `48px` the `strokeWidth` will still be `2px` on the screen."*
   → **【提案】`icon-large` / `icon-hero` 两档应启用 `nonScalingStroke`**，否则「同一层内描边一致」（§16.2.3）在大尺寸位必然破功。**此条须真机目视确认**（缩放后的视觉重量是主观判断，本文不替设计定论）。
5. **⛔ 禁止用 `absoluteStrokeWidth` 与 `nonScalingStroke` 之外的手段「补描边」**（如叠两层图标）——会产生非设计网格的边界。

### 5.3 光学重量跨层一致性（宪法 §16.2.3）

- **【推断】第 1 层（Lucide，2px 圆头描边）与第 2 层（SF Symbols / Material Symbols，实心或变重描边）天生不同重。** 两者**允许不同**（§16.2.3 原文：「两层之间允许不同」），但**同一层内必须一致**。
- **可操作的判定**：因为两层从不在同一视觉单元内混排（§4.1 判据保证），**「打架」风险点只有一个 —— Tab 栏**。若 Tab 图标（第 2 层）旁边出现 Lucide 图标（第 1 层），就会同框对比。**→ 规则：Tab 栏内不得出现任何 Lucide 图标。**
- **【提案】第 2 层的重量档**：`expo-symbols` 的 `weight` 支持 `ultraLight/thin/light/regular/medium/semibold/bold/heavy/black`（iOS 传字符串，Android/Web 从 `expo-symbols/androidWeights/*` 导入）。**建议 iOS `regular`（或 `medium`）对齐 Lucide 的 2px**——**具体值须真机目视比对后定稿**。

### 5.4 无障碍（宪法 §16.4）

**事实基础**：

| 事实 | 来源 |
|---|---|
| Lucide 的 a11y 判定：只要传入 `aria-*` / `role` / `title` 任一属性，就认为图标**承载语义**（`hasA11yProp`：`prop.startsWith('aria-') \|\| prop === 'role' \|\| prop === 'title'`） | 【一手实测】`shared/src/utils/hasA11yProp.mjs` |
| `@expo/ui` 的 `Icon`：`accessibilityLabel` **仅 Android**，iOS 未接线 | 【官方文档】 |
| `expo-symbols` 的 `SymbolView` props 表**不含** `accessibilityLabel`（仅有继承的 `ViewProps`） | 【官方文档】 |
| 宪法 §7.2 / §16.2.4：**纯图标按钮必须有可读标签**；§16.4：**装饰图标必须从无障碍树隐藏** | 【官方文档】宪法 |
| 平台触控目标：iOS ≥ 44pt / Android ≥ 48dp（宪法 §5.4.3 / §7.1） | 【官方文档】宪法 |

**规则（本文要求）**：

1. **区分两类，无中间态**：
   - **承载语义**（ic. 独立可点击的图标按钮、列表行的唯一标识）→ **必须有可读标签**。
   - **纯装饰**（ic. 文字旁的辅助图形、与文字重复表达的图标）→ **必须从无障碍树隐藏**。
2. **标签的落点取决于层**：
   - **第 1 层**：`<Icon>` 原子接受 `label?: string`。传了 → 走 `accessible` + `accessibilityRole`（按钮时 `"button"`）+ `accessibilityLabel`；没传 → **设为装饰并从无障碍树隐藏**（`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`，或 `aria-hidden`）。
     - ⚠️ **【一手实测】不要用「给 Lucide 传 `aria-hidden`」来当隐藏手段**——`hasA11yProp` 把 `aria-*` 一律判为「有语义」。
   - **第 2 层**：标签放在**可聚焦的父级**（Tab 触发器 / 原生 item），**因为两个平台原生图标组件都不提供可用的跨端标签能力**。
3. **⛔ 图标不得承担唯一语义**（宪法 §16.2.4）。**独立图标按钮一律配可见文字标签或 `accessibilityLabel`；不允许「只有一个图标且无标签」的可交互元素。**
4. **触控目标与图标尺寸解耦**：图标视觉尺寸取 §5.1 档位，**可点击区域由外层容器撑到 iOS ≥44pt / Android ≥48dp**。**不得靠放大图标来满足触控**。
5. **动态字号**：字阶随系统放大时，图标**不跟随放大**（避免布局崩坏），但**必须不遮挡、不裁切**。**须真机在最大字号下核对**（见 §7）。

### 5.5 禁止项（合并宪法 §16.2 与本文实测）

1. **⛔ Emoji 与 Unicode 符号字符**（`✅` `⚠️` `🔥` `★` `✓` `▸`）——宪法 §1.3.6 / §16.2.1。依据：Web 侧 346 个 JSX 文件 **emoji 0 次**，本条是恢复既有纪律。
2. **⛔ 为单个图标引入第二个图标库**（宪法 §16.2.2）。**推论：`lucide-react-native` 是第 1 层的唯一来源**；`@expo/ui` 的 `Icon` / `expo-symbols` **只准出现在第 2 层**，不得当作第 1 层的备用图标源。
3. **⛔ 第 1 层用 SF Symbols / Material Symbols；第 2 层塞 Lucide**（宪法 §16.2）。
4. **⛔ barrel 导入**（`import { X } from 'lucide-react-native'`）——依据 §2.2 的官方实测结论，**这是性能红线不是风格偏好**。
5. **⛔ 在任何调用点传 `strokeWidth` / `absoluteStrokeWidth` / `nonScalingStroke`** —— 只能在 `LucideProvider` 或 `<Icon>` 原子内部设。
6. **⛔ 屏内写图标尺寸魔法数字**（宪法 §16.3）——只能引用字阶派生的档位令牌。
7. **⛔ 同一含义用两个图标**（宪法 §16.3）。
8. **⛔ 图标承担唯一语义 / 无标签的独立图标按钮**（宪法 §16.2.4）。
9. **⛔ 用 `hasA11yProp` 的判定盲区当隐藏手段**（见 §5.4.2 的 ⚠️）。

### 5.6 建议的落地形态（【推断】，供脚手架期参考）

**必须经由一个自研 `<Icon>` 原子**（《App前端风格体系》§12.3 的 12 个原子之一**已包含 `Icon`**，本文与该清单一致）：

```tsx
// 形态示意（【推断】，非已批准实现）
// 职责：① 锁定第 1 层来源为 lucide-react-native，杜绝混用
//       ② 只接受尺寸档位令牌，杜绝魔法数字
//       ③ 不出售 strokeWidth，保证全局描边唯一
//       ④ 用 label 的有无强制 a11y 二选一
<Icon name="utensils" size="icon-body" label="食堂" />
<Icon name="image" size="icon-inline" />        // 无 label → 装饰 → 隐藏
```

**⛔ 该原子必须拒绝的入参**：`strokeWidth`、裸数字尺寸、图标库选择、`aria-hidden`。

---

## 6. 缺口清单（gap list）

### 6.1 【未能证实】的 Lucide 图标名（**实测不存在于 1.49.0**）

对 `lucide-react-native@1.49.0` 的 **1857 个权威图标名**做精确匹配后的**落空名单**。**⛔ 这些名字一律不得写进代码**——v1 线已重命名或移除：

| 候选名（按 0.x 记忆/惯例常见） | 状态 | **合法替代（已核实存在）** |
|---|---|---|
| `alert-circle` | 【未能证实】 | **`circle-alert`**（圆形叹号）；`triangle-alert`（三角警告，语义不同） |
| **`filter`** | 【未能证实】 | **`list-filter`**（另有 `list-filter-plus`） |
| **`more-horizontal`** | 【未能证实】 | **`ellipsis`** |
| **`more-vertical`** | 【未能证实】 | **`ellipsis-vertical`** |
| **`wall`** | 【未能证实】 | **`brick-wall`**（另有 `brick-wall-fire` / `brick-wall-shield`） |
| `book-marked` | 【未能证实】 | `bookmark`、`bookmark-check`（语义已不同） |
| `building-2` | 【未能证实】 | **`building`** |
| `file-question` | 【未能证实】 | **`file-question-mark`** |
| `file-warning` | 【未能证实】 | `triangle-alert` / `file-x`（**无「文件警告」直译**） |
| `circle-help` | 【未能证实】 | **`circle-question-mark`**（`help` 语族在 1.x 已改 `question-mark`） |
| `badge-help` | 【未能证实】 | **`circle-question-mark`** / `life-buoy` |
| `school-2` | 【未能证实】 | **`school`** / `university` |
| `square-pencil` | 【未能证实】 | **`square-pen`** |
| `square-message-square` | 【未能证实】 | `message-square-text` |
| `trash-2` | 【未能证实】 | **`trash`** |
| `palmtree` | 【未能证实】 | `tree-pine` / `tent-tree` / `plane` |
| `waves` | 【未能证实】 | `waves-horizontal` / `waves-vertical` / `waves-arrow-up` / `waves-arrow-down` |
| `announcement` | 【未能证实】 | **`megaphone`** / `radio-tower` / `speaker` |
| `mask` | 【未能证实】 | **`venetian-mask`** |
| `beach` | 【未能证实】 | `umbrella` / `sun` / `tent-tree` |

**统计**：实测候选 **243** 个（去重后）；**精确命中 223 个**；**落空 20 个**（上表）。

> ### ⚠️ 落空名单里有一条会立刻造成事故的
> **`filter`、`more-horizontal`、`alert-circle`、`trash-2` 这四个是几乎所有 RN 项目的肌肉记忆**，且**都已在 Lucide 1.x 中不存在**。若照记忆写入，**编译期就会失败**（`./icons/filter` 路径不存在），**但失败信息是模块解析错误，不会告诉你「已重命名」**。**上表即为对照表。**

### 6.2 本文未能证实的其他事项（**不猜**）

| 事项 | 状态 | 说明 |
|---|---|---|
| **SF Symbols 具体名称是否存在** | 【未能证实】 | SF Symbols 名单**不在任何 npm 包里**，本文**无法离线核实**。§3.2 的四个 iOS Tab 名标【提案】，**须用 Apple SF Symbols app 核对**。**本文不为任何 SF Symbol 名背书。**（GitHub 上的 `sf-symbols-typescript` 类型包本次**未能取到**——`api.github.com` 对本次请求返回 **HTTP 403**，见 §6.3） |
| **`lucide-react-native` 的 GitHub 仓库元数据 / star / issue 数** | 【未能证实】 | `api.github.com` 返回 **403（速率限制/被拒）**；本次**未取到** GitHub 侧数据。本文**不使用任何 GitHub 活跃度数据**。 |
| **打包后（minify）的真实 bundle 增量** | 【未能证实】 | 本文只实测了**源码体积**（1.40 MB 全部图标未压缩），**未做 `expo export` 实测**。**不给出 minify 后的数字。** |
| **`expo-symbols` 的 `weight` 取值与 Lucide 2px 的视觉等价点** | 【未能证实】 | 属主观光学判断，**须真机目视**。本文只给候选值【提案】。 |
| **`unstable-native-tabs` 的图标链路是否已通** | 【未能证实】 | 宪法 §4.3 已把它列为脚手架首周必须定案项；本文只提供图标名，**不宣称链路可用**。 |
| **Web 端第 2 层用 `expo-symbols` 的 `web` 槽位是否与移动端视觉一致** | 【未能证实】 | 【推断】可行（front-matter 含 `web`），**未实测**。 |
| **`@expo/material-symbols` 的长期维护承诺** | 【未能证实】 | 实测 v0.1.1、MIT、3849 资产；**不在 `bundledNativeModules.json` 内**，无 Expo 兼容矩阵背书。**本文不评估其路线图。** |

### 6.3 本次不可达的渠道（如实记录）

- **`api.github.com`**：本次所有请求返回 **HTTP 403**（`远程服务器返回错误: (403) 已禁止`）。**受影响的核实项**：Lucide 仓库的 license API、`packages/lucide-react-native` 目录列表、star/issue/commit 活跃度、`sf-symbols-typescript` 的类型名单。
  **影响评估（【推断】）：低。** 因为许可证与包内容均已从 **npm tarball 直接解包**取得（比 GitHub API 更接近「实际分发物」，且是本文的一手来源）；GitHub 侧数据本就不是本文论断的必要条件。
- 其余所有来源（`registry.npmjs.org`、`docs.expo.dev`、`lucide.dev`、两个 tarball 下载）**均可达**，HTTP 200。

---

## 7. 第 1 周必须在真机验证的事项（交付给脚手架期）

**按宪法 §16.3「具体档位与 stroke 值须在脚手架期用真机定稿」组织。每条给出验证方法与失败判据。**

| # | 验证项 | 方法 | 失败判据（出现即须改方案） |
|---|---|---|---|
| 1 | **原生 Tab 栏图标链路** | 在 SDK 57 上跑通 `unstable-native-tabs`，iOS 传 SF Symbol、Android 传 Material Symbol（`grid_view` / `construction` / `school` / `account_circle`） | `Symbol.unstable_getMaterialSymbolSourceAsync()` 拿不到 ImageSource，或 Android Tab 图标不显示 |
| 2 | **SF Symbols 名称核对** | 用 Apple **SF Symbols app** 逐个核对 §3.2 的四个 iOS 名（及任何新增） | 名字不存在（**本文不为 SF Symbol 名背书**） |
| 3 | **Web 端第 2 层渲染** | 在 Web 上渲染 `expo-symbols` 的 `name={{ web: '<material_symbol>' }}` | 空白 / 报错（**注意 `@expo/ui` 的 `Icon` 在 Web 必然不渲染**） |
| 4 | **Web 导出体积（tree-shaking 有效性）** | `npx expo export --platform web` + **Expo Atlas** 查 bundle 构成 | 出现大量未使用的 Lucide 图标 → barrel 导入漏网 |
| 5 | **§5.1 五个尺寸档位** | 真机（Android 优先）目视：16/20/24/32/48 | 描边发虚、网格不对齐、与相邻文字不协调 |
| 6 | **`nonScalingStroke` 在大尺寸档的必要性** | 并排渲染 `size=48` 开启/关闭 `nonScalingStroke` | 关闭时描边明显过粗 → 大尺寸档必须开启 |
| 7 | **跨层光学重量** | Tab 栏（第 2 层）与相邻内容（第 1 层）同屏目视比对；调 `expo-symbols` 的 `weight` | 两层「打架」（§16.2.3） |
| 8 | **TalkBack 逐个核对** | Android：第 1 层有 `label` 的可读、无 `label` 的被跳过；第 2 层父级标签可读 | 图标被读成乱码、装饰图标被读出、图标按钮无标签 |
| 9 | **VoiceOver 逐个核对** | **iOS：重点验证 `@expo/ui/Icon` 的 `accessibilityLabel` 已知缺口**（§4.3）是否已被包装层绕过 | VoiceOver 读不出第 2 层图标语义 |
| 10 | **触控目标** | iOS ≥44pt / Android ≥48dp（宪法 §5.4.3） | 图标按钮实际可点区域不足（**不得靠放大图标解决**） |
| 11 | **最大系统字号下的布局** | 把系统字号调到最大，看图标与文字同框 | 遮挡、裁切、重叠 |
| 12 | **`@expo/material-symbols` 版本登记** | 记入宪法 §3.4 的「许可证 / 是否含原生 / OTA 影响」登记表（**它不在 `bundledNativeModules.json`**） | 未登记即视为未完成 |
| 13 | **屏蔽语义分叉裁决** | 所有者裁决 `shield-ban`（内容/类型）vs `user-x`（具体用户）是否都需要 | 若两者都有却复用一个图标 → 违反 §16.3 |
| 14 | **三处 §3.3/§3.4 的备选二选一** | 跑腿（`bike` vs `package`）、新生指南（`compass` vs `book-open`）、放假日（`calendar-heart` vs `party-popper`） | 图标与产品实际形态不符 |

---

## 8. 给宪法 §16.3 的【提案】汇总（供定稿引用）

以下全部为 **【提案】**，宪法 §16.3 已声明其「不得当已验证规格使用」：

1. **`strokeWidth` 全局取 2**（保持 Lucide 官方默认；全部 1857 个图标均无例外）。
2. **尺寸五档**：`icon-inline 16` / `icon-body 20` / **`icon-default 24`** / `icon-large 32` / `icon-hero 48`；**默认档固定 24，因为图标在 24×24 网格上设计**。
3. **`icon-large` / `icon-hero` 两档启用 `nonScalingStroke`**，避免描边随尺寸等比变粗。
4. **第 2 层 `weight` 取 `regular`（或 `medium`）**，与 Lucide 2px 目视对齐。
5. **❌ 已确定为「禁止」而非提案的三条**（依据充分，可直接进宪法）：
   - **barrel 导入禁止**（§2.2 官方实测结论）；
   - **调用点传 `strokeWidth` 禁止**（全局唯一）；
   - **第 2 层图标必须由包装层补无障碍**（§4.3 官方缺口）。

---

## 9. 附：复现命令与原始输出（§5）

### 9.1 Lucide 权威图标名提取（本文所有「已核实」的来源）

```powershell
# 1) 版本级元数据
npm view lucide-react-native@1.49.0 name version license peerDependencies dependencies `
  dist.unpackedSize dist.tarball dist.fileCount main module types sideEffects exports --json

# 2) 解包
Invoke-WebRequest -Uri "https://registry.npmjs.org/lucide-react-native/-/lucide-react-native-1.49.0.tgz" -OutFile lrn.tgz
tar -xzf lrn.tgz -C lrn

# 3) 原生代码扫描（预期 0）
Get-ChildItem -Recurse -File lrn\package |
  Where-Object { $_.Extension -in '.podspec','.swift','.kt','.java','.mm','.m','.h','.cpp','.hpp' `
    -or $_.FullName -match '\\android\\' -or $_.FullName -match '\\ios\\' }

# 4) 权威图标名（从每个模块的 __iconData.name 提取）
Get-ChildItem lrn\package\dist\esm\icons -Filter *.mjs -File | ForEach-Object {
  $m = [regex]::Match((Get-Content $_.FullName -Raw), 'name:\s*"([^"]+)"')
  if ($m.Success) { $m.Groups[1].Value }
} | Sort-Object -Unique      # => 1857 行

# 5) 逐个候选名精确匹配（本文采用的核实方式）
$set = [System.Collections.Generic.HashSet[string]]::new()
# ... 填入上一步结果 ...
$set.Contains('brick-wall')  # True  ；$set.Contains('wall') => False
```

**实测输出摘要**：

```
TOTAL canonical icon names in esm/icons: 1857
barrel 'as' export identifiers:          1857
dist/esm/icons/*.mjs count:              1858   (1857 图标 + index.mjs)
native files matched:                    NONE FOUND -- zero native files
icon modules containing 'strokeWidth' in data:     0
icon modules containing 'stroke-linecap' in data:  0
esm .mjs total bytes:                    1,838,453  (含 barrel 与共享代码)
individual icon modules total bytes:     1,465,346  (1857 个，不含 barrel)
```

**最终核实统计**：候选 **243** 个 → **精确命中 223** 个 → **落空 20** 个。

### 9.2 Material Symbols 名称核实

```powershell
Invoke-WebRequest -Uri "https://registry.npmjs.org/@expo/material-symbols/-/material-symbols-0.1.1.tgz" -OutFile ms.tgz
tar -xzf ms.tgz -C ms
(Get-ChildItem ms\package -Recurse -Filter *.xml -File).Count   # => 3849
```

**实测输出摘要**：`xml count: 3849`；`grid_view` / `construction` / `school` / `account_circle` / `build` / `home_repair_service` / `handyman` **均命中**；**`tools` 与 `person_filled` 未命中**。

### 9.3 SDK 57 pin 核实

```powershell
Invoke-WebRequest -Uri "https://registry.npmjs.org/expo/-/expo-57.0.26.tgz" -OutFile expo.tgz
tar -xzf expo.tgz -C expo
Get-Content expo\package\bundledNativeModules.json -Raw | ConvertFrom-Json
```

**实测输出**：

```
react-native-svg        => 15.15.4
expo-symbols            => ~57.0.3
@expo/ui                => ~57.0.21
@expo/material-symbols  => (键不存在)
react-native            => 0.86.3
react                   => 19.2.3
expo-router             => ~57.0.24
```

### 9.4 一手来源清单（全部于 2026-10-01 访问）

| 来源 | URL | 状态 |
|---|---|---|
| npm registry：`lucide-react-native` | `https://registry.npmjs.org/lucide-react-native` | ✅ 200 |
| npm tarball：`lucide-react-native@1.49.0` | `https://registry.npmjs.org/lucide-react-native/-/lucide-react-native-1.49.0.tgz` | ✅ 200（2,280,914 B） |
| 包内 `LICENSE` | tarball 解包路径 `package/LICENSE`（3208 B） | ✅ 一手 |
| Lucide 官方 license 页 | `https://lucide.dev/license` | ✅ 200 |
| Lucide RN 文档总览 | `https://lucide.dev/guide/react-native` | ✅ 200 |
| Lucide RN Sizing | `https://lucide.dev/guide/react-native/basics/sizing` | ✅ 200 |
| Lucide RN Stroke width | `https://lucide.dev/guide/react-native/basics/stroke-width` | ✅ 200 |
| Lucide RN Global styling | `https://lucide.dev/guide/react-native/advanced/global-styling` | ✅ 200 |
| **Lucide RN Optimizations（tree-shaking 关键依据）** | `https://lucide.dev/guide/react-native/advanced/optimizations` | ✅ 200 |
| Expo Symbols | `https://docs.expo.dev/versions/latest/sdk/symbols` | ✅ 200 |
| Expo UI · Universal Icon | `https://docs.expo.dev/versions/latest/sdk/ui/universal/icon` | ✅ 200 |
| Expo Tree shaking | `https://docs.expo.dev/guides/tree-shaking` | ✅ 200 |
| npm registry：`@expo/material-symbols` | `https://registry.npmjs.org/@expo/material-symbols` | ✅ 200 |
| npm tarball：`expo@57.0.26` | `https://registry.npmjs.org/expo/-/expo-57.0.26.tgz` | ✅ 200 |
| `api.github.com` | — | ❌ **403**（见 §6.3） |

### 9.5 仓库内依据文档

- [App 设计宪法](../constitution/App设计宪法.md) —— **第 16 条**为本文的上位条款；§4.1 / §4.3 / §4.1.2 / §7 为相关约束
- [App 前端风格体系](../design/App前端风格体系.md) —— §3.2 字阶、§十五 图标体系、§12.3 的 `Icon` 原子
- [App 组件层调研：现成组件库评估](./App组件层调研-现成组件库评估.md) —— `@expo/ui` 的组件面与原生代码实测
- [App 基座事实核对：版本线与上架门槛](../evaluation/App基座事实核对-版本线与上架门槛.md) —— SDK 57 pin 与平台原生能力
