# App 组件层调研：现成组件库评估

**调研人**：组件层子代理（授权独立核实，不采信仓库内既有结论）
**调研时间**：**2026-10-01（+08:00）**
**性质**：本文是《App 设计宪法》组件层条款的**事实依据**。本文**只记录可复现的硬事实与来源**；「自研 / 现成」的最终划线由所有者与架构决定，本文只给出**事实推导出的边界**（见 §1 与 §6.6）。
**本文要回答的问题**：**「有没有可以直接用的现成组件库，还是应该自己写组件？」**

> **⚠ 本文覆盖同名旧稿**：写入前发现同名文件已存在（2026-10-01 21:51 生成，253 行）。经逐条复核，旧稿存在若干与 registry 实测不符的版本号/日期，且其中两处关键表述（`@expo/ui` 的 Yoga 约束范围、`react-native-paper` 最新发布日）**需要精确化**。本文以实测数据替换之，并**保留旧稿价值更高的一手来源**（Expo 官方 `.md` 文档原文），见 §7。

## 证据等级标注约定

| 标注 | 含义 |
|---|---|
| 【一手实测】 | 本机跑命令 / 解包读源码得到的原始结果，附命令与原始输出 |
| 【官方文档】 | 官方文档、官方仓库、npm registry 元数据等一手来源 |
| 【推断】 | 笔者据上述证据的推论，**明确标注为推断** |
| 【未能证实】 | 查不到一手来源，**不采信、不猜** |

**两条方法学说明（决定了本文结论的强度）**：

1. **【一手实测】本文所有版本号、发布日期、license、周下载量、仓库活跃度数据，均来自 npm registry 与 GitHub API 的直接读取，或对 npm tarball 的解包扫描**；未采用任何博客/聚合站/二手转述的版本号。命令与原始输出见 §5.2。
2. **【一手实测】** 本文的「硬编码色值 / `fontSize` 字面量」不是印象判断，而是**对每个包的 tarball 解包后逐文件正则统计**（`#[0-9a-fA-F]{3,8}\b` 与 `fontSize\s*[:=]\s*[0-9]+`），并已剔除 `build/**.d.ts` 注释示例等误报（剔除过程见 §4.4.5）。**该统计口径的已知偏差已在 §6.1 披露。**

---

## 1. 结论速览（TL;DR）

以下 10 条均为**事实**，不含选型建议：

- **【官方文档】Expo 官方在文档里明确否认 `@expo/ui` 是「又一个 UI 库」或「有主见的设计套件」。** 原文：*"Expo UI is **not "yet another" UI library and not an opinionated design kit**. Instead, it's a **primitives library**. It exposes native Jetpack Compose and SwiftUI components directly to JavaScript, rather than re-implementing or simulating UI in JavaScript."*（`https://docs.expo.dev/versions/latest/sdk/ui.md`，访问 2026-10-01）。**这是「有没有现成的」这个问题最直接的一手答案**：官方自己把它与 `react-native-paper` / `react-native-elements` 这类**有主见的设计套件**对立起来。
- **【一手实测】「现成组件库」这一层在 RN 上不存在能同时满足本项目三条硬约束的选项。** 三条硬约束是：① 零 `#hex` / 零 `fontSize` 字面量（宪法第 1–2 条）；② 每个颜色令牌携带 `contrastRatio` 等机器可读元数据、由 `scripts/contrast-check.js` 校验；③ 具名视觉语言 = 苹果的舒适感 + Discord 社区感 + **仅 CTA / Badge / 分区标题三类**的 Neo-Brutalism。**没有任何候选库的默认输出等于这套视觉语言**；凡自带完整视觉的库，其色阶/字阶都是**对手语言**。
- **【一手实测】最能同时满足三条硬约束的两个候选，恰好是光谱两端**：`@expo/ui`（**不自带**配色与字号体系，颜色来自系统 M3 / SwiftUI，字号由你传；代价是组件面窄、且原生入口与 RN 布局模型不同构）与 `@gluestack-ui/core`（**headless 行为原语，实测 0 处颜色字面量、0 处 `fontSize` 字面量**；代价是它给你行为，不给视觉）。
- **【一手实测】最不能用的两个，恰恰是「最像 Material」与「最像设计系统」的两个**：`react-native-paper@5.15.3` 解包实测 **1072 处颜色字面量 / 99 处 `fontSize` 字面量**，自带完整 M3 token（`lib/module/styles/themes/v3/tokens.js` 单文件 78 行颜色值）；`@ui-kitten/components@6.1.3` **50 处颜色字面量**且默认主题是 Eva 而非 M3。**这不是「能不能改主题」的问题，而是「默认状态就在输出另一套视觉身份」的问题。**
- **【一手实测】`react-native-paper` 的 6.x（Material 3 更新线）在 2026-10-01 仍是 alpha，且已停滞 4 个月。** `dist-tags`：`latest=5.15.3`（**2026-05-26**）、`alpha=6.0.0-alpha.0`（**2026-06-16**）。其 6.x 官方文档站自称的是 **"Material You theming … Material 3 color, typography, elevation"**，**通篇未出现 "Expressive"**。
- **【一手实测】「Material 3 Expressive 的官方 RN 实现」不存在。** `@expo/ui/jetpack-compose` 提供的是 **M3 色彩角色**（`MaterialColors`，Android 12+ 走 Material You 壁纸取色，含 `isDynamicColorAvailable()`）**与标注为 Material3 的基础控件**，**不是 M3 Expressive 组件集**。这与仓库既有结论（M3 motion physics 无官方 RN 实现）**方向一致、结论互补**（见 §4.1）。
- **【官方文档 + 一手实测】`@expo/ui` 今天约有 56 个 SwiftUI 组件 / 52 个 Jetpack Compose 组件 / 19 个 universal 组件，并含 8 个「drop-in 替代」**（可替换 `@gorhom/bottom-sheet`、`@react-native-community/datetimepicker`、`@react-native-masked-view/masked-view`、`@react-native-menu/menu`、`react-native-pager-view`、`@react-native-picker/picker`、`@react-native-segmented-control/segmented-control`、`@react-native-community/slider`）。【一手实测】expo@57.0.26 的 `bundledNativeModules.json` 把 `@expo/ui` pin 在 **`~57.0.21`**；该包**含 231 个原生源文件**（`ios` 153 / `android` 80）→ **升它要发版，不能只走 OTA**。
- **【一手实测】RN 上的 Neo-Brutalism 组件库全部不可用或高风险，**因此「只让 CTA / Badge / 分区标题 brutal」这一点**只能靠自己写**：`react-native-brutalism@0.1.1` 解包后**只有 9 个文件、0 个 JS/TS 文件**（仅 3 个 Kotlin 文件，无 JS 入口）；`rn-neo@0.4.0` 最新版 2026-06-25、**周下载 9**、GitHub **5 star**；`@primo-brutality/ui@2.0.0` 最新版 2026-06-16、**仅 8 个文件**、GitHub **5 star**、peer 要求 `nativewind>=4.0.0`。
- **【一手实测】版本纪律有一个会立刻造成事故的坑，本文给出 SDK 57 的权威 pin 快照**：`expo@57.0.26` 的 `bundledNativeModules.json` 把 `react-native-reanimated` 钉在 **4.5.1**、`react-native-worklets` 钉在 **0.10.1**、`react-native-gesture-handler` 钉在 **~2.32.0**、`react-native-screens` 钉在 **~4.26.0**、`@shopify/flash-list` 钉在 **2.0.2**；而这些包在 npm 上的 `latest` 分别是 **4.7.0 / 0.13.0 / 3.3.0 / 4.28.0 / 2.3.2**。**「装 npm latest」= 脱出 Expo 兼容矩阵**。完整对照表见 §4.6。
- **【官方文档 + 一手实测】`expo-router` 的 native tabs 确实仍在 `unstable-` 前缀下，但组件本体已可用且有独立导出**：入口 `expo-router/unstable-native-tabs`，导出 `NativeTabs`，含 `NativeTabs.Trigger.{Label,Icon,Badge,VectorIcon}` 与 `NativeTabs.BottomAccessory.usePlacement()`。这是「真原生底部 Tab」的唯一官方路径（见 §3）。

---

## 2. 候选清单与事实表

### 2.1 主表（A 类：设计系统 / UI 套件 / 样式引擎）

**表注**：版本/日期/license 来自 npm registry（`https://registry.npmjs.org/<pkg>`）与 GitHub API，读取日 **2026-10-01**。周下载量来自 `https://api.npmjs.org/downloads/point/last-week/<pkg>`（同批次读取，快照期 2026-09-24 ~ 2026-10-01）。「颜色字面量 / 字号字面量」列为**对 tarball 解包后逐文件正则统计**（原始输出见 §5.2.2）。

| 包 | 最新版 | 发布日期 | License | 周下载 | **类别** | 自带硬编码色值 | 自带 `fontSize` 字面量 | 是否有可脚本读取的 token 源 | 与本项目三条硬约束的冲突 |
|---|---|---|---|---|---|---|---|---|---|
| `@expo/ui` | **57.0.21** | 2026-09-29 | MIT | 5,162,215 | **原生控件桥（官方自称 primitives library）** | 90 处 / 29 文件（**其中大部分在 `build/**.d.ts` 注释示例，非实现**，见 §4.4.5） | 6 处 / 5 文件（全在 `src/universal/` 的默认样式） | **无自带色板**；Android 侧提供 `MaterialColors`（含 `primary`/`onPrimary`/… 与 `isDynamicColorAvailable()`） | 低：不与你争视觉，但组件面与布局模型有硬限制（见 §4.4） |
| `react-native-paper` | **5.15.3**（`alpha=6.0.0-alpha.0`，2026-06-16） | 2026-05-26 | MIT | 516,940 | **完整设计系统（自带 M3 token + 主题）** | **1072 处 / 22 文件** | **99 处 / 51 文件** | **有**：`lib/module/styles/themes/v3/tokens.js`（78 行颜色值）、`themes/v3/LightTheme.js`、`DarkTheme.js` | **高**：默认输出即自有 M3 token 与自有字阶 |
| `tamagui`（含 `@tamagui/core` / `themes` / `config`） | **2.7.7**（`beta=3.0.0-beta.1479.1`，2026-09-27） | 2026-08-15 | MIT（`tamagui` 包页 license 字段为空；子包 `@tamagui/core` 为 MIT；GitHub `license.spdx_id = MIT`） | 233,819（`tamagui`）；281,257（`@tamagui/core`） | **完整设计系统 + 样式引擎**（自带上千 token） | `@tamagui/themes` **1910 处 / 61 文件**；`tamagui` 本体 4 处 | `tamagui` 本体 9 处；`@tamagui/core` 2 处 | **有且很齐全**：`@tamagui/themes` 导出 `./v3`、`./v3-themes`、`./v4`、`./v5`、`./v5-subtle`，源文件 `generated-v5.ts` / `v5-themes.ts` / `tokens.tsx` 等 | **高**：装它等于装了一整套别人的色阶与字号；要满足零字面量就必须**全量接管其 token 源** |
| `gluestack-ui`（CLI） | **5.0.3** | 2026-06-25 | MIT | 3,139 | **CLI 工具（不是组件库）** | 0 | 0 | 不适用 | 不适用（它不是运行时组件） |
| `@gluestack-ui/core`（**真正的库**） | **5.0.15**（v3 线为 `3.0.25`，2026-06-22） | 2026-06-25 | MIT | —（未单独取；旧包 `@gluestack-ui/themed` 为 41,704） | **headless 行为原语** | **0 处 / 0 文件** ✅ | **0 处 / 0 文件** ✅ | **无自带 token**（headless 设计） | **低**：实测零颜色/零字号字面量，天然不与你争视觉；**代价是你要自供全套视觉** |
| `nativewind` | **4.2.7**（stable）；**5.0.0-rc.0**（2026-09-13，`rc`/`preview` 双 tag） | 2026-09-14 | MIT | 2,088,897 | **样式引擎**（Tailwind 语法 → RN style） | 81 处 / 23 文件（多为 `#0000`/透明与内部实现） | 2 处 / 1 文件（`typography.tsx`） | **有**：`tailwind.config.js` 由你提供，token 源在你手里 | **中**：引擎本身中立，但把「类名字符串」引入业务代码——需确认 `design-debt-report.js` 是否把 `className` 计入 `fontSize` 口径 |
| `@shopify/restyle` | **2.4.5** | 2025-03-19 | MIT | 132,311 | **样式引擎（BYO tokens）** | 4 处 / 1 文件（`TestContainer.js`，测试夹具） | **0 处** ✅ | **有且很干净**：`createTheme()` 完全由你定义 | **低**：实测 **0 依赖**、0 字号字面量，视觉全部来自你的 theme |
| `react-native-unistyles` | **3.3.0** | 2026-07-10 | MIT（GitHub API 的 `license` 字段返回 `none`，见 §6.2） | 267,799 | **样式引擎（BYO tokens + 原生加速）** | 18 处 / 15 文件（含 `boxShadow.js`/`textShadow.js`/`mocks.js` 的默认阴影色 `#000000`） | **0 处** ✅ | **有**：`createStyleSheet` / theme 全在你手里 | **中**：**含原生代码**（`android/`+`ios/`+`cxx/`+`nitrogen/`，92 个原生文件，需 `react-native-nitro-modules` peer）→ OTA 影响与升级成本；另 peer 依赖 `react-native-edge-to-edge` |
| `react-native-ui-lib`（Wix） | **9.1.3** | 2026-09-06 | MIT | 35,264 | **完整设计系统** | **108 处 / 9 文件**（`src/style/colorsPalette.js` 单文件 93 行） | 14 处 / 4 文件（`typographyPresets.js`）；另有 `fontSize: 58` 等字号 token | **有**：`src/style/colorsPalette.js`、`typographyPresets.js` | **高**：自带色板与字号 preset；**且 peer 要求单独的 `uilib-native@^5.0.1`（2026-05-17，59 个原生文件）→ 双包原生依赖** |
| `@ui-kitten/components` | **6.1.3** | 2026-09-27 | MIT | 15,896 | **完整设计系统（Eva 语言，非 M3）** | **50 处 / 38 文件** | **0 处** | **有**：Eva 主题 JSON（`@ui-kitten/processor` 编译） | **高**：默认视觉是 Eva Design 而非 M3，与「M3 on Android」方向正交；周下载 15,896 属低基数 |
| `dripsy` | **4.3.8** | 2024-10-22 | MIT | 6,772 | 样式引擎（BYO tokens） | **0 处** ✅ | **0 处** ✅ | 有（theme 由你定义） | 冲突面低，**但维护已停滞**：GitHub 自 2026-06-01 起 **0 commit**、`pushed_at=2024-10-09`，最新版已近 2 年 |
| `react-native-magnus` | **1.0.63** | **2022-09-22** | MIT | **388** | 完整设计系统（自带 `defaultTheme`） | **279 处 / 3 文件**（`defaultTheme.js`） | 0 处 | 有（自带 defaultTheme） | **最高**：默认主题即 279 处自有色值；**周下载 388、最新版 4 年前、peer 钉死 `react-native-modal@13.0.1` + `react-native-vector-icons@9.2.0`** → 已实质弃用 |
| `react-native-elements` | **3.4.3** | **2022-12-23** | MIT | 97,816 | 完整设计系统 | **148 处 / 19 文件** | 14 处 / 9 文件 | 有（theme 对象） | **最高**：默认色值 + 字号双硬编码；GitHub 自 2026-06-01 起 **0 commit**；已被官方 `@rneui` 取代 |
| `@rneui/themed` | **5.0.0** | 2026-01-19 | MIT | 61,963 | 完整设计系统（自带 theme） | **0 处** ✅ | **0 处** ✅ | 有（`createTheme`） | **低-中**：实测 tarball 内零颜色/零字号**字面量**（样式集中在 theme 对象），**但其默认 theme 内容仍是别人的视觉**——这正是「0 字面量 ≠ 无视觉」的反例（见 §2.2） |

### 2.2 与「零 `#hex` / 零 `fontSize`」纪律相关的**关键区分**（【推断】但依据 §5.2.2 实测）

- **【推断】库内部的硬编码值不会出现在你 `src/` 的扫描结果里——所以「设计债脚本通过」不等于「视觉被接管」。** `design-debt-report.js --path <app>/src` 扫的是你的业务代码；`node_modules` 里的 1072 处色值不会被计数。**但这 1072 处色值在运行时仍然生效。** 两个事实必须分开看，否则会产生「脚本全绿 = 视觉自主」的假象。
- **【推断】真正可操作的分界线不是「有几种颜色」，而是「默认状态是不是已经在输出一套我不认可的视觉」。** 判据：把库装上、一行主题都不改、渲染一个 Button，得到的是不是本项目的 CTA？——`react-native-paper` / `react-native-ui-lib` / `react-native-magnus` / `react-native-elements` **是**；`@gluestack-ui/core` / `@shopify/restyle` / `dripsy` / `@expo/ui` **不是**；`@rneui/themed` **文档上不是、但默认 theme 仍是外来视觉**。

---

## 3. 行为原语清单（B 类：互补，不与设计系统竞争）

**表注**：「原生代码」列为**解包后统计 `.swift/.kt/.java/.m/.mm/.h/.cpp/.podspec` 文件数**（【一手实测】，原始输出见 §5.2.2）。**有原生代码 = 升级需发版，不走 OTA**（宪法 §12 判据）。

| 包 | 最新版 | 发布日期 | License | 周下载 | 含原生代码 | 原生文件数 | 维护信号（2026-10-01） | 是否强加视觉身份 |
|---|---|---|---|---|---|---|---|---|
| `@gorhom/bottom-sheet` | **5.2.14** | 2026-05-09 | MIT | 3,331,208 | 否 | **0** | GitHub 9,104 star；**最新 release 停在 2026-05-09**（近 5 个月未发版） | **否**（纯行为；背景/把手由你给） |
| `react-native-screens` | **4.26.0**（SDK 57 pin；npm latest 4.28.0） | 2026-09-14 | MIT | 10,594,225 | **是** | **588** | 极活跃（6/1 起 ≥100 commits）；open issues 348 | **否**（原生容器，非视觉） |
| `expo-router`（含 `unstable-native-tabs`） | **57.0.24** | 2026-09-29 | MIT | 7,619,930 | **是**（依赖 `react-native-screens`） | 17（expo-router 包内） | 极活跃（随 Expo SDK 发版） | **否**——**这正是「真原生 Tab 容器」的官方路径**（原文见下） |
| `@shopify/flash-list` | **2.3.2**（npm latest）；**2.0.2**（SDK 57 pin） | 2026-06-10 | MIT | 2,800,058 | 否 | **0** ✅ OTA 友好 | 7,241 star；6/1 起 8 commits；open issues 204 | **否**（纯列表行为） |
| `@legendapp/list` | **3.6.0** | 2026-09-30 | MIT | 718,535 | 否 | **0** ✅ OTA 友好 | 3,415 star；极活跃（6/1 起 ≥100 commits，最新版 1 天前） | **否**（唯一实测色值：`#FFFFFFCC` 1 处默认值） |
| `react-native-actions-sheet` | **10.1.2** | 2026-01-21 | MIT | 101,883 | 否 | **0** | **6/1 起 0 commit**；GitHub 仓库为 `ammarahm-ed/react-native-actions-sheet`（npm 元数据里的 `amake/...` 为 **404**，见 §6.3） | 弱（1 处默认背景色 `#f0f0f0`） |
| `react-native-modal` | **14.0.0-rc.1**（npm `latest` 标签仍指 **13.0.1 / 2022-03-01**） | RC: 2025-03-15 | MIT | 674,260 | 否 | **0** | **6/1 起 0 commit**；最新正式版为 **2022 年**；open issues 100 | 否（但维护停滞） |
| `@rn-primitives/*`（`portal` / `slot` / `dialog` / `types` …） | **1.5.3**（portal，2026-08-08）/ **1.5.2**（slot / dialog / types，2026-07-02） | 同上 | MIT | 800,277（portal） | 否 | **0** | 943 star；6/1 起 8 commits | **否**（headless；实测 0 色值） |
| `expo-symbols` | **57.0.3** | 2026-09-11 | MIT | 6,266,176 | **是**（仅 iOS/macOS 侧） | 5 | 随 Expo SDK 发版 | 否（SF Symbols 由系统提供） |
| `expo-glass-effect` | **57.0.4** | 2026-09-24 | MIT | 6,055,928 | **是**（**仅 iOS**，**无 `android/` 目录**） | 5 | 随 Expo SDK 发版 | 否（**iOS 专属材质**，Android 无对应实现，见 §6.5） |
| `expo-haptics` | **57.0.3** | 2026-09-11 | MIT | 5,032,817 | **是** | 9 | 随 Expo SDK 发版 | 否（纯触觉） |
| `react-native-reanimated` | **4.7.0**（npm latest）；**4.5.1**（SDK 57 pin） | 2026-09-18 | MIT | 10,080,156 | **是** | — | 极活跃 | 否（动效引擎） |
| `react-native-gesture-handler` | **3.3.0**（npm latest）；**~2.32.0**（SDK 57 pin） | 2026-09-11 | MIT | 9,770,446 | **是** | — | 极活跃 | 否（手势引擎） |

**`expo-router` native tabs 的一手原文**（【一手实测】读 `expo-router@57.0.24` 解包内 `build/native-tabs/NativeTabs.d.ts`）：

```ts
import type { NativeTabsProps } from './types';
/**
 * The component used to create native tabs layout.
 *
 * @example
 * ```tsx app/_layout.tsx
 * import { NativeTabs } from 'expo-router/unstable-native-tabs';
 * ...
 */
export declare const NativeTabs: ((props: NativeTabsProps) => ...) & {
    Trigger: ... & {
        Label: ...; Icon: ...; Badge: ...; VectorIcon: ...;
    };
    BottomAccessory: ... & { usePlacement: () => "regular" | "inline"; };
};
```

【一手实测】`expo-router@57.0.24` 解包内**确实存在** `build/native-tabs/` 目录：`NativeTabs.d.ts`、`NativeTabsView.ios.d.ts`、`NativeTabsView.android.d.ts`、`NativeTabsView.web.d.ts`、`NativeTabsView.shared.d.ts`、`NativeTabTrigger.d.ts`、`NativeBottomTabsNavigator.d.ts`、`NativeBottomTabsRouter.d.ts`。**注意**：该包 tarball **不含 `src/` 目录**，故上述为编译产物 `.d.ts` 证据，非 TS 源码。

---

## 4. 专项核实（C 类硬问题）

### 4.1 问题一：Material 3 Expressive 有没有官方 React Native 实现？

**事实分四层，必须分开陈述：**

1. **【一手实测】`@expo/ui/jetpack-compose` 提供的是「M3 色彩角色体系」，不是「M3 Expressive 组件集」。** 其 `src/jetpack-compose/colors.ts` 定义 `MaterialColors` 类型，注释原文：*"Material 3 color palette exposed to TypeScript/JavaScript as `#RRGGBBAA` strings. On Android 12+ devices these values are derived from the app user's wallpaper (Material You). On older devices they fall back to the static Material 3 baseline palette."* 并提供 `isDynamicColorAvailable` 用于运行时区分。字段为完整 M3 角色：`primary` / `onPrimary` / `primaryContainer` / `onPrimaryContainer` / `inversePrimary` / `secondary` / `onSecondary` / `secondaryContainer` / `onSecondaryContainer` / `tertiary` / `onTertiary` / `tertiaryContainer` / `background` / `onBackground` / `surface` / `onSurface` …
2. **【官方文档】官方把若干组件明确标为 Material3，但那是「Compose 组件的 1:1 映射」。** `https://docs.expo.dev/versions/latest/sdk/ui.md` 中对 `Button` 的描述是 *"Button components for displaying native **Material3** buttons"*，`IconButton`、`TextField`、`ToggleButton`、`NavigationBar`、`FloatingActionButton` 同样如此。官方同时声明原则：*"**1-to-1 mapping**: Components map one to one to their native counterparts."* **即：Android 上拿到 M3 是因为 Compose 控件本身是 M3，不是因为有人做了「M3 的 RN 实现」。**
3. **【一手实测】`@expo/ui` 的 Android 组件清单里没有 M3 Expressive 的新组件。** 【一手实测】`src/jetpack-compose/` 共 **52 个组件子目录**：`AlertDialog`、`AnimatedVisibility`、`Badge`、`BadgedBox`、`BasicAlertDialog`、`Box`、`Button`、`Card`、`Carousel`、`Checkbox`、`Chip`、`Column`、`DatePicker`、`Divider`、`DockedSearchBar`、`DropdownMenu`、`ExposedDropdownMenuBox`、`FloatingActionButton`、`FlowRow`、`HorizontalFloatingToolbar`、`HorizontalPager`、`Host`、`Icon`、`IconButton`、`Image`、`LazyColumn`、`LazyRow`、`ListItem`、`LoadingIndicator`、`ModalBottomSheet`、`MultiChoiceSegmentedButtonRow`、`NavigationBar`、`Progress`、`PullToRefreshBox`、`RadioButton`、`RNHostView`、`Row`、`SearchBar`、`SegmentedButton`、`Shape`、`SingleChoiceSegmentedButtonRow`、`Slider`、`Snackbar`、`Spacer`、`Surface`、`Switch`、`SyncSwitch`、`Text`、`TextField`、`ToggleButton`、`Tooltip`。**这是一份「M3 基础控件面」，不是 Expressive 部件面。**
4. **【一手实测】`react-native-paper` 的 6.x 文档自称 Material You / Material 3，但通篇未提 Expressive。** 抓取 `https://oss.callstack.com/react-native-paper/6.x/`（HTTP 200，2026-10-01）得到原文特性列表：*"Material You theming — Adopt Material 3 color, typography, elevation, and state layers with a theme system designed for real apps."*，全站可见文本中**无 "Expressive"**。其 `dist-tags` 为 `alpha=6.0.0-alpha.0`（2026-06-16）、`latest=5.15.3`（2026-05-26）。

**【推断】结论**：截至 2026-10-01，RN 生态里**没有任何官方的 M3 Expressive 实现**——既没有官方 Expressive 组件集，也没有官方 M3 Expressive 动效（与仓库既有结论一致）。**能拿到的一手能力上限是**：`@expo/ui/jetpack-compose` 的 M3 色彩角色 + `Host` 桥 + Compose 原生控件的真实观感。
**【未能证实】**：Expo 是否已在 SDK 58 线（`expo` 的 `next` = **58.0.1**，2026-10-01）加入 Expressive 组件。**本文未核实 58 线的组件面**（SDK 58 非稳定线、不在本项目范围）；**不要据本文推断 58 的能力**。

### 4.2 问题二：RN/Expo 有 Neo-Brutalism 组件套件吗？会不会与「只允许 CTA / Badge / 分区标题 brutal」的白名单冲突？

**【一手实测】存在于 npm 的 RN Neo-Brutalism 包共 3 个，全部不可采纳：**

| 包 | 最新版 / 日期 | 周下载 | 解包实测 | 判定 |
|---|---|---|---|---|
| `react-native-brutalism` | 0.1.1 / 2024-03-03 | **6** | **仅 9 个文件**：`LICENSE`、`package.json`、`README.md`、`android/build.gradle`、`android/gradle.properties`、`android/settings.gradle`、`android/src/main/java/com/rnbrutalism/{BrutalismPackage,BrutalismView,BrutalismViewManager}.kt`。**JS/TS 文件数 = 0** | **不可用**——无 JS 入口，无法 import；GitHub 5 star |
| `rn-neo` | 0.4.0 / 2026-06-25 | **9** | 266 文件；**`lib/module/core/theme/tokens.js` 单文件 34 行颜色值**，全包 72 处颜色字面量；0 处 `fontSize` 字面量；0 原生文件 | **高风险**——GitHub 5 star；peer 要求 `react-native-reanimated>=4.2.0`（与 SDK 57 pin 的 4.5.1 兼容）但采用基数近零 |
| `@primo-brutality/ui` | 2.0.0 / 2026-06-16 | 未进入对照统计（生态极小） | **仅 8 个文件**；`dist/index.js` 11 处 + `dist/index.d.ts` 10 处颜色字面量（共 21 处）；0 处字号；peer 要求 `nativewind>=4.0.0` | **高风险**——GitHub `lucianodiisouza/primo-brutality` **5 star**、0 open issues |

**另有 2 个历史包可作证伪材料**：`react-native-rugged-ui@0.0.3`（2023-03-02，周下载 12，关键词含 `neobrutalism`，GitHub **0 star**）；npm 关键词 `neobrutalism` 全库搜索共 **31 条**命中，**其中没有任何一个能同时满足「RN 运行时组件 + 有维护 + 有采用基数」**。【一手实测】

**【推断】对白名单的直接影响**：**「只让 CTA / Badge / 分区标题 brutal」这条约束，在现成库里没有对应物**——所有存在的 RN brutality 库都假定「整个界面都是 brutalist」（它们提供成套主题，不是单类元素的样式片段）。因此：
- **【推断】白名单约束天然要求「自己写这一层」**：只有自研组件才能把 brutal 收束到三类元素，并以令牌开关控制。
- **【推断】可复用的不是「brutalism 组件」，而是「brutalism 的令牌维度」**：粗描边（border width）、硬阴影（无模糊 offset shadow）、大圆角或零圆角、高饱和撞色。这些应表达为令牌 + 三类元素组件，而不是引入一个 brutalist 设计系统。

### 4.3 问题三：哪些候选是 headless（自带样式归零）？哪些会强加竞争性视觉语言？

**判据用实测数据而非宣传语**（【一手实测】，数据见 §2.1 与 §5.2.2）：

| 分层 | 包 | 实测依据 |
|---|---|---|
| **headless / 自带样式为零** | `@gluestack-ui/core@5.0.15` | **0 处颜色字面量 / 0 处 `fontSize` 字面量**（`rgba?\(` 与 `#hex` 双口径均为 0）；依赖面为 30 个 `@react-aria/*` + `@react-stately/*`（**行为/无障碍层**），peer **无 `nativewind` 强制** |
| | `@rn-primitives/*` | 0 处颜色字面量；`@rn-primitives/slot` 仅 3 个 JS 文件 |
| **BYO tokens 的样式引擎（中立，token 源在你手里）** | `@shopify/restyle@2.4.5` | **0 依赖、0 处 `fontSize` 字面量**；4 处色值全在 `TestContainer.js`（测试夹具） |
| | `dripsy@4.3.8` | **0 处颜色 / 0 处字号**；但**自 2026-06-01 起 0 commit、最新版 2024-10** |
| | `react-native-unistyles@3.3.0` | 0 处 `fontSize` 字面量；18 处色值集中在默认阴影/测试；**含原生代码**（92 个原生文件），peer 含 `react-native-nitro-modules` |
| | `nativewind@4.2.7` | 81 处色值多为内部实现与 `#0000`（透明）；`typography.tsx` 有 2 处字号；**token 源是你自己的 `tailwind.config.js`** |
| **双层：headless 底座 + 可选视觉层** | `@gluestack-ui/core`（headless）+ `gluestack-ui` CLI 生成样式组件 | 【一手实测】CLI 的 `add` 命令把组件源码**复制进你的仓库**（读 `gluestack-ui@5.0.3` README：*"A CLI tool for easily initialising `gluestack-ui` and adding components to your projects"*，bin = `gluestack-ui`）→ **这是最有利于「零字面量 + 令牌纪律」的形态：源码进你的仓库，可用你的令牌重写** |
| **不自带色板但组件面/布局受限** | `@expo/ui@57.0.21` | 见 §4.4 |
| **强加竞争性视觉语言** | `react-native-paper@5.15.3` | **1072 色值 / 99 字号**；另有 `rgba/hsl` 命中 **632 行**；自带完整 M3 token 文件 |
| | `@tamagui/themes@2.7.7` | **1910 色值 / 61 文件**；另有 `rgba/hsl` 命中 **479 行** |
| | `react-native-ui-lib@9.1.3` | **108 色值**（`colorsPalette.js` 93 行）+ 14 处字号 preset |
| | `react-native-magnus@1.0.63` | **279 色值**（`defaultTheme.js`）+ 已弃用 |
| | `react-native-elements@3.4.3` | **148 色值 + 14 处字号** + 已 0 commit |
| | `@ui-kitten/components@6.1.3` | **50 色值**，默认 Eva 语言（非 M3） |

**「token 能不能被脚本读」的实测答案**（【一手实测】）：能读，且都是**普通 JS 对象**，不是黑盒——
- `react-native-paper` → `lib/module/styles/themes/v3/tokens.js`、`LightTheme.js`、`DarkTheme.js`
- `@tamagui/themes` → `src/generated-v5.ts`、`src/v5-themes.ts`、`src/tokens.tsx`（v3/v4/v5 各代并存，`exports` 含 `./v3`、`./v3-themes`、`./v4`、`./v5`、`./v5-subtle`）
- `react-native-ui-lib` → `src/style/colorsPalette.js`、`src/style/typographyPresets.js`
- `@expo/ui` → Android 侧 `MaterialColors`（运行时从原生模块取，**是设备相关的，不是静态 token**）

**【推断】战术含义**：若只关心「让 `design-debt-report.js` 全绿」，任何库都行（`node_modules` 不计入）。若关心「令牌是唯一事实源」（宪法第 2 条），则**只有 token 源在你仓库内的形态才成立**——即 `restyle` / `dripsy` / `nativewind`（config 在你仓）/ `unistyles` / `gluestack-ui`（源码复制进仓）/ 自研；而 `paper` / `tamagui` / `ui-lib` / `ui-kitten` 的 token 在 `node_modules` 里，**你不能编辑、只能覆盖**，一旦覆盖就是维护一个 fork。

### 4.4 问题四：`@expo/ui` 今天到底有哪些组件？限制是什么？能用于 App 自己的组件，还是只是原生控件逃生舱？

#### 4.4.1 入口结构与官方定位（【官方文档】+【一手实测】）

**官方定位原文**（`https://docs.expo.dev/versions/latest/sdk/ui.md`，访问 2026-10-01）：

> *"`@expo/ui` is a set of **native input components** that allows you to build fully native interfaces with Jetpack Compose and SwiftUI. It aims to provide the commonly used features and components that a typical app will need."*
> *"**Native primitives**: Expo UI is **not another UI library**. It brings Jetpack Compose and SwiftUI primitives to React Native."*
> *"**1-to-1 mapping**: Components map one to one to their native counterparts."*
> *"**Full-app support**: Expo UI integrates at the component level. You can write an entire app with it, or adopt it one screen at a time. You can also mix React Native components, DOM components, and 2D components drawn with `react-native-skia`."*
> *"**How is Expo UI different from libraries like `react-native-paper` or `react-native-elements`?** Expo UI is **not "yet another" UI library and not an opinionated design kit**. Instead, it's a **primitives library**. It exposes native Jetpack Compose and SwiftUI components directly to JavaScript, rather than re-implementing or simulating UI in JavaScript."*
> *"**Can I use `@expo/ui/swift-ui` on Android or web?** **No.** `@expo/ui/swift-ui` renders SwiftUI views, which exist only on Apple platforms."*

**⚠ 注意官方那句 "You can write an entire app with it" 与 4.4.4 的布局限制并不矛盾**——因为 `universal` 入口（见 4.4.3）恰恰是**跨端且基于 RN Flexbox** 的那一层；能「写整个 App」指的是走 universal 路径，不是走原生入口。

【一手实测】`@expo/ui@57.0.21` 的 `package.json` `exports`：

```
"."                            → ./src/universal/index.ts
"./swift-ui"                   → ./src/swift-ui/index.tsx
"./swift-ui/modifiers"         → ./src/swift-ui/modifiers/index.ts
"./jetpack-compose"            → ./src/jetpack-compose/index.ts
"./jetpack-compose/modifiers"  → ./src/jetpack-compose/modifiers/index.ts
"./community/datetime-picker"  "./community/bottom-sheet"      "./community/segmented-control"
"./community/picker"           "./community/slider"            "./community/masked-view"
"./community/menu"             "./community/pager-view"
"./babel-plugin"
dependencies: sf-symbols-typescript ^2.1.0, vaul ^1.1.2
peerDependencies: @babel/core*, expo*, react*, react-dom*(optional), react-native*, react-native-worklets*(optional)
license: MIT
```

【一手实测】解包文件计数：`src` 326 | `build` 642 | `ios` 153 | `android` 80 | `plugin` 8 | `local-maven-repo` 25。

#### 4.4.2 三个入口的组件清单（【一手实测】目录级枚举 +【官方文档】表格交叉核对）

**`@expo/ui/swift-ui`（iOS）— 56 个组件子目录**（【一手实测】枚举 `src/swift-ui/`）：

```
AccessoryWidgetBackground, Alert, Background, BottomSheet, Button, Chart, ColorPicker,
ConfirmationDialog, ContentUnavailableView, ContextMenu, ControlGroup, DatePicker,
DisclosureGroup, Divider, Form, Gauge, GlassEffectContainer, Grid, Group, Host, HStack,
Image, Label, LabeledContent, LazyHStack, LazyVStack, Link, List, Mask, Menu,
NavigationDestination, NavigationLink, NavigationSplitView, NavigationStack, Overlay,
Picker, Popover, ProgressView, ScrollView, Section, SecureField, Shapes, ShareLink,
Slider, Spacer, Stepper, SwipeActions, SyncToggle, TabView, Text, TextField, Toggle,
Toolbar, VStack, ZStack
（另有顶层文件导出 useNativeState / withAnimation，以及 Modifiers 体系）
```
【官方文档】同页 SwiftUI 表格列出 **43 项**（不含 `Background`/`Chart`/`ContentUnavailableView`/`GlassEffectContainer`/`Grid`/`Mask`/`NavigationDestination`/`NavigationSplitView`/`NavigationStack`/`Shapes`/`Stepper`/`SyncToggle`/`Toolbar` 等较新或较细项）。**两个数字口径不同，引用时须声明口径。**

**`@expo/ui/jetpack-compose`（Android）— 52 个组件子目录**（【一手实测】枚举 `src/jetpack-compose/`）：

```
AlertDialog, AnimatedVisibility, Badge, BadgedBox, BasicAlertDialog, Box, Button, Card,
Carousel, Checkbox, Chip, Column, DatePicker, Divider, DockedSearchBar, DropdownMenu,
ExposedDropdownMenuBox, FloatingActionButton, FlowRow, HorizontalFloatingToolbar,
HorizontalPager, Host, Icon, IconButton, Image, LazyColumn, LazyRow, ListItem,
LoadingIndicator, ModalBottomSheet, MultiChoiceSegmentedButtonRow, NavigationBar, Progress,
PullToRefreshBox, RadioButton, RNHostView, Row, SearchBar, SegmentedButton, Shape,
SingleChoiceSegmentedButtonRow, Slider, Snackbar, Spacer, Surface, Switch, SyncSwitch,
Text, TextField, ToggleButton, Tooltip
（另有 colors（Material Colors）、useNativeState、layout-types、RNHostView）
```
【官方文档】同页列出 **51 项**（含 `Material Colors` 与 `Modifiers` 条目，不含 `Image`/`SyncSwitch`/`MultiChoiceSegmentedButtonRow`/`SingleChoiceSegmentedButtonRow` 等）。**同样口径不同。**

**`@expo/ui/universal`（Android/iOS/Web 单一组件树）— 19 个组件**（【一手实测】枚举 `src/universal/`，与 `src/universal/index.ts` 的 export 一致）：

```
BottomSheet, Button, Checkbox, Collapsible, Column, FieldGroup, Host, Icon, List,
ListItem, Picker, RNHostView, Row, ScrollView, Slider, Spacer, Switch, Text, TextInput
```
【官方文档】同页 universal 表格列出 **18 项**（把 `ListItem` 并入 `List` 的描述中）。**口径差异已声明。**

**Drop-in 替代（8 项，【官方文档】）**：`BottomSheet`（兼容 `@gorhom/bottom-sheet`）、`DateTimePicker`、`MaskedView`、`Menu`、`PagerView`、`Picker`、`SegmentedControl`、`Slider`。对应【一手实测】`src/community/` 下的 8 个子目录：`bottom-sheet`、`datetime-picker`、`masked-view`、`menu`、`pager-view`、`picker`、`segmented-control`、`slider`。
→ **【推断】这是减少第三方原生依赖数量的直接机会**（每一项替代掉一个社区原生包 = 少一份宪法 §12 的登记与 OTA 负担）。

#### 4.4.3 「无 Yoga/Flexbox、必须用 `HStack`/`VStack`/`Row`/`Column`、必须包在 `Host` 内」——**实测结果比这条说法更精确**

**【官方文档】原文（同页 "Common questions"）**：

> *"**Can I use flexbox or other styles in Expo UI components?** Flexbox styles apply to the **`Host` component itself**. Once you are inside the native context, **`Yoga` is not available**. Define layouts with `Row` and `Column` on Android, or `HStack` and `VStack` on iOS."*
> *"**What's the `Host` component?** `Host` is the bridge between React Native and the native UI toolkit. **You must wrap every Expo UI component in one.** You can think of it like `<svg>` in the DOM or `<Canvas>` in react-native-skia. On iOS, it uses `UIHostingController` to render SwiftUI views in UIKit."*
> *"**Can I use React Native components inside SwiftUI components?** Yes… However… once you render React Native components, **you're leaving the SwiftUI context**. To add Expo UI components again, **reintroduce a `Host` wrapper**. Keep SwiftUI layouts self-contained. Interop is possible, but it works best when boundaries are clearly defined."*

**【一手实测】代码级事实（三条，缺一不可）：**

1. **`@expo/ui` 不是只有一层。** `src/universal/Host/index.ios.tsx` 全文为 `export { Host } from '@expo/ui/swift-ui';`，`index.android.tsx` 全文为 `export { Host } from '@expo/ui/jetpack-compose';`。即 **universal 层是「平台分发壳」**，iOS 落 SwiftUI，Android 落 Compose。
2. **在原生层内，布局确实是平台自己的布局系统，不是 Yoga。** `swift-ui/HStack` 与 `jetpack-compose/Row` 都是 `requireNativeView('ExpoUI', 'HStackView' / 'RowView')`，props 为 `spacing` + `alignment`（SwiftUI）/ `horizontalArrangement` + `verticalArrangement` + `horizontalAlignment`（Compose）——**没有 flex 属性**。官方那句「Yoga is not available」**在原生 context 内成立**。
3. **但 `universal` 层的 `Row`/`Column` 就是 React Native 的 `View` + Flexbox。** 【一手实测】`src/universal/Row/index.tsx` 原文注释：*"Fill the parent's cross-axis by default so a `<Spacer flexible />` child has room to grow. Without this, a Row placed inside a `Column` with alignment other than 'stretch' is content-sized on web, which leaves flex children with no leftover space. **SwiftUI and Compose achieve the same effect via their own layout phases.**"*，其样式为 `{ alignSelf: 'stretch', flexDirection: 'row' }`。

→ **因此本文给出精确表述**：**「Yoga 不可用」限定于原生 context（`Host` 之内的 `swift-ui` / `jetpack-compose` 子树）；`universal` 入口的 `Row`/`Column`/`Spacer` 仍是 RN Flexbox 语义，且在 iOS/Android 上分别映射到 SwiftUI / Compose 的布局阶段。** 把这句话无条件推广成「`@expo/ui` 内部无 Yoga、不能当布局基座」是**不准确的**——`universal` 层正可以当跨端布局基座。

**`RNHostView` 是反向逃生舱**：【一手实测】`swift-ui`、`jetpack-compose`、`universal` 三个入口都导出 `RNHostView`，用于把 RN 视图嵌回原生层（官方描述：*"A component that enables React Native views inside Jetpack Compose / SwiftUI"*）。【推断】这说明官方明确预期「原生容器与 RN 视图混排」是常态，而不是二选一。

#### 4.4.4 `Host` 的接口（决定了它为什么不可替代）

【一手实测】`src/swift-ui/Host/index.tsx` 的 `HostProps`（节选，原文注释）：`matchContents`（*"the host view will update its size in the React Native view tree to match the content's layout from SwiftUI. Can be only set once on mount."*）、`useViewportSizeMeasurement`、`onLayoutContent`、`colorScheme`、**`seedColor`**（*"Seed color applied to the SwiftUI content as its tint. It propagates through the SwiftUI environment to theme interactive elements (buttons, switches, sliders, and similar controls) rendered by the children."*）、`layoutDirection`、`ignoreSafeArea`。
`src/jetpack-compose/Host/index.tsx` 的 `colorScheme` 注释原文：*"`'light'` / `'dark'` force a specific appearance; omitted follows the device setting. The palette itself follows the device wallpaper on Android 12+ (Material You) or the static Material 3 baseline otherwise — unless `seedColor` is set."*

**【推断】这就是「真原生材质」的入口，也解释了为什么它不可替代**：`seedColor` + `colorScheme` 是把本项目令牌注入平台原生渲染的唯一正规通道，等价于「用自己的主色驱动系统控件的配色」。

#### 4.4.5 它会不会与「零 `#hex` / 零 `fontSize`」冲突？——实测：弱冲突，且可控

**【一手实测】`@expo/ui@57.0.21` 全包 90 处颜色字面量分布在 29 个文件。逐文件清单如下（已用于区分「注释示例」与「真实实现」）：**

```
  2  \build\jetpack-compose\Icon\index.d.ts        ← 示例注释
  1  \build\jetpack-compose\Image\index.d.ts       ← 示例注释
  1  \build\jetpack-compose\modifiers\index.d.ts   ← 示例注释
  1  \build\swift-ui\Button\index.d.ts             ← 示例注释
  1  \build\swift-ui\Image\index.d.ts              ← 示例注释
  1  \build\swift-ui\modifiers\shapes\index.d.ts   ← 示例注释
  2  \build\swift-ui\modifiers\background.d.ts     ← 示例注释
  8  \build\swift-ui\modifiers\index.d.ts          ← 示例注释
  1  \build\swift-ui\types.d.ts                    ← 示例注释
  1  \src\community\bottom-sheet\BottomSheet.tsx
  1  \src\community\pager-view\PagerView.android.tsx
  4  \src\community\segmented-control\vendor\SegmentedControl.tsx
  1  \src\community\segmented-control\vendor\SegmentedControlTab.tsx
  2  \src\community\segmented-control\vendor\SegmentsSeparators.tsx
  2  \src\jetpack-compose\Icon\index.tsx
  1  \src\jetpack-compose\Image\index.tsx
  1  \src\jetpack-compose\modifiers\index.ts
  1  \src\swift-ui\Button\index.tsx
  1  \src\swift-ui\Image\index.tsx
  1  \src\swift-ui\modifiers\shapes\index.ts
  2  \src\swift-ui\modifiers\background.ts
  8  \src\swift-ui\modifiers\index.ts
  1  \src\swift-ui\types.ts
  1  \src\universal\BottomSheet\index.tsx
  1  \src\universal\Collapsible\index.tsx
  2  \src\universal\ListItem\ListItem.tsx
  1  \src\universal\Switch\index.tsx
  2  \src\universal\Text\index.tsx
 29  \src\universal\webUtils.ts
```

**逐项定性（【一手实测】读原文）**：
- `src/universal/webUtils.ts` 的 29 处 = **Web 平台的 CSS 变量表**（`--expo-ui-background: #ffffff;` / `--expo-ui-gray-50: #f9fafb;` …，含 light 与 dark 两套）。**仅 web 生效。**
- `src/community/segmented-control/vendor/*` 的 7 处 = **内置第三方分段控件的硬编码**（`backgroundColor: colorScheme === 'dark' ? '#636366' : 'white'`、`'#EEEEF0'`、`'#1C1C1F'`、`'#D1D1D4'`、`'#3F3F42'`、`shadowColor: '#000'`）。**这是唯一一处「原生路径上会生效的外来色值」。**
- `src/universal/Text/index.tsx` 的 2 处 = `light: { color: '#000000' }, dark: { color: '#FFFFFF' }`（无平台后缀的兜底实现）。
- 其余 `swift-ui` / `jetpack-compose` 的色值均在 **JSDoc 示例注释或类型文档**中（如 `background.ts` 的 `* <Text modifiers={[background('#FF0000')]}>Solid color</Text>`）。**即：`build/**.d.ts` 的 66 处不应被计入「实现里的硬编码」。**
- **`src/universal/` 存在 6 处 `fontSize` 字面量**：`Button/index.tsx:49`（`fontSize: 14`）、`FieldGroup/FieldSection.tsx:19,25`（14 / 13）、`ListItem/ListItem.tsx:69`（13）、`Picker/Picker.tsx:26`（14）、`TextInput/index.tsx:19`（14）。**这些是默认值，不是强制值。**

**【一手实测】字号是可被令牌覆盖的，且 `@expo/ui` 不自带 type scale**——这是它与其他设计系统最本质的区别：
- `src/universal/Text/types.ts:29` 定义 `fontSize?: number`；`index.ios.tsx:82` 有 `const baseFontSize = textStyle.fontSize ?? 17;`（**兜底 17 是 SwiftUI Body 尺寸，而非一套 scale**）；`index.ios.tsx` 把 `fontSize`/`fontWeight`/`fontFamily` 映射为 SwiftUI 的 `font({ size, weight, family })` modifier；`index.android.tsx:38` 把 `textStyle.fontSize` 透传给 Compose `Text`。
- 即：**它接受一个数字，不提供 `body`/`label`/`title` 之类的语义档位**。【推断】所以「把 `fontSize: 14` 换成 `fontSize: tokens.type.label.size`」在 `@expo/ui` 上是**直通的**，不需要对抗库自带的 type scale；而在 `react-native-paper`（99 处字号）或 `react-native-ui-lib`（`typographyPresets.js`）上则要对抗已有 scale。

**【推断】问题四的答案**：
- `@expo/ui` **可用作 App 自有组件的地基**，且**有两条不同路线**：① **universal 路线**（`Host` + `Row`/`Column` + `Text` + 令牌）——跨端一致、基于 Flexbox，但只有 19 个组件；② **原生路线**（`swift-ui` / `jetpack-compose`）——真原生观感与控件面，但**两个组件集互不相通，同一份 UI 代码不能两端跑**，且必须遵守 `Host` / 布局原语约束。
- 它的**不可替代价值**正是宪法 §11.8 指出的那件事：**「凡 `@expo/ui` 已提供的原生组件，不允许自写原生实现」**——它是唯一能给出平台原生控件（含 iOS 26 材质、Android M3 原生控件）的官方通道，另有 8 个 drop-in 替代可用来减少第三方原生依赖。
- **【推断】因此它的正确角色是「平台原生控件的地基 + 逃生舱 + 官方替代品来源」，而不是「App 的完整组件库」**：App 的组件层（卡片、列表项、Badge、CTA、分区标题）在两种路线下都仍需自研，并以令牌消费 `@expo/ui` 提供的原生容器。

### 4.5 问题五（延伸）：动态取色（Material You）与「令牌必须携带 contrastRatio」是否冲突？

**【一手实测】`@expo/ui/jetpack-compose` 的 `MaterialColors` 在 Android 12+ 上取用户壁纸色**，并可用 `isDynamicColorAvailable()` 运行时判定；`Host` 的 `seedColor` 可覆盖为由我们指定的种子色（`getMaterialColors` / `useMaterialColors` 支持显式 `scheme` + `seedColor`，其 CHANGELOG 57.0.20 记载：*"[Android] Cache Material 3 palettes generated from an explicit `scheme` and `seedColor`…"*）。

**【推断】冲突分析**：
- 若**开启动态取色**，则表面/强调色的实际取值由用户壁纸决定，**`contrastRatio` 无法在构建期预先算定**，与宪法第 2.3 条（每个颜色令牌携带实测对比度）直接冲突。**→ 不应把系统动态色当作本项目令牌层的取值来源。**
- 但**这不等于不能用 `@expo/ui`**：有三条不冲突的用法：① 给 `Host` 传 **`seedColor` = 本项目品牌主色**（把系统控件的配色锚定到我们的色，而非壁纸）；② 用 `colorScheme` 显式 lock 到 light/dark，不用 `'unspecified'`；③ **把 `@expo/ui` 原生控件当作「平台控件」，我们自己的令牌层只管自绘组件**，两者在视觉上通过同一 `seedColor` 对齐。
- **【未能证实】**：`seedColor` 是否会在所有 M3 组件上完全覆盖动态取色（本文未做真机验证），以及 `getMaterialColors` 返回的 8 位 `#RRGGBBAA` 是否可直接进入 `contrast-check.js` 的解析路径（需看该脚本实现）。**这两点须在脚手架期实测。**

### 4.6 专项核实：Expo SDK 57 的权威版本 pin（防止「装 npm latest」事故）

**【一手实测】命令与来源**：解包 `expo@57.0.26` tarball，读取其 `package/bundledNativeModules.json`（此文件即 `npx expo install` 的判定依据）。与 npm `latest` 对照（同批读取，2026-10-01）：

| 包 | **SDK 57 pin（`bundledNativeModules.json`）** | npm `latest`（2026-10-01） | 差异 |
|---|---|---|---|
| `react` | **19.2.3** | 19.3.0 | ⚠️ 差次版本 |
| `react-native` | **0.86.3** | 0.87.1 | ⚠️ 差次版本 |
| `@expo/ui` | **~57.0.21** | 57.0.21 | ✅ 一致 |
| `expo-router` | **~57.0.24** | 57.0.24 | ✅ 一致 |
| `react-native-gesture-handler` | **~2.32.0** | **3.3.0** | ⚠️ **差一个大版本** |
| `react-native-reanimated` | **4.5.1** | **4.7.0** | ⚠️ |
| `react-native-worklets` | **0.10.1** | **0.13.0** | ⚠️ |
| `react-native-screens` | **~4.26.0** | **4.28.0** | ⚠️ |
| `react-native-safe-area-context` | **~5.7.0** | **5.10.1** | ⚠️ |
| `react-native-svg` | **15.15.4** | 15.15.5 | ~ |
| `@shopify/flash-list` | **2.0.2** | **2.3.2** | ⚠️ |
| `@shopify/react-native-skia` | **2.6.2** | **2.14.0** | ⚠️ 差很多 |
| `expo-image` | **~57.0.5** | 57.0.5 | ✅ |
| `expo-symbols` | **~57.0.3** | 57.0.3 | ✅ |
| `expo-glass-effect` | **~57.0.4** | 57.0.4 | ✅ |
| `expo-haptics` | **~57.0.3** | 57.0.3 | ✅ |
| `expo-blur` | **~57.0.3** | 57.0.3 | ✅ |
| `expo-linear-gradient` | **~57.0.2** | 57.0.2 | ✅ |
| `@expo/vector-icons` | **^15.0.2** | 15.1.1 | ~ |
| `expo-font` | **~57.0.4** | 57.0.4 | ✅ |
| `react-native-keyboard-controller` | 1.21.9 | 1.22.6 | ⚠️ |
| `react-native-edge-to-edge` | **未列入** | 1.8.2 | 见 §6.6 |
| `react-native-nitro-modules` | **未列入** | 0.37.1 | 见 §6.6 |

**关于 `gesture-handler` 的补充实测**：其 npm 元数据的 `peerDependencies` 仅有 `react` / `react-native`（**无上界保护**），故手装 3.x 到 SDK 57 **不会在安装期报错**——这正是宪法 §3.1「一律 `npx expo install`」存在的理由。

**【一手实测】所有候选 UI 库均不在 `bundledNativeModules.json` 内**（该文件只覆盖 Expo 自家与少量第三方）。也就是说 **`react-native-paper` / `tamagui` / `gluestack-ui` / `nativewind` / `restyle` / `unistyles` / `ui-lib` / `ui-kitten` / `dripsy` / `magnus` / `rneui` / `@gorhom/bottom-sheet` / `@legendapp/list` / `react-native-actions-sheet` / `react-native-modal` / `@rn-primitives/*` 的版本没有任何 Expo 官方 pin**——【推断】它们与 SDK 57 的兼容性**只能靠 peerDependencies 是否与上表一致来判断**，无法靠 `expo install` 保证：

| 候选 | 其 peerDependencies 实测 | 与 SDK 57 pin 的关系 |
|---|---|---|
| `react-native-unistyles@3.3.0` | `react-native@>=0.76.0`、`react-native-reanimated@*`、`react-native-edge-to-edge@*`、`react-native-nitro-modules@*`、`@react-native/normalize-colors@*` | **需要用两个未 pin 的原生包**（`edge-to-edge`、`nitro-modules`）→ 二者均**含原生代码**且无 Expo pin |
| `@ui-kitten/components@6.1.3` | `react-native@>=0.72.0`、`react-native-svg@>=13.0.0` | 上界宽松，可解 |
| `react-native-ui-lib@9.1.3` | `react@>=19.0.0`、`react-native@>=0.77.3`、**`uilib-native@^5.0.1`**、`react-native-reanimated@>=3.19.4`、`react-native-gesture-handler@>=2.24.0`、`react-native-safe-area-context@>=5.6.2` | 可解；**但 `uilib-native@5.1.2`（2026-05-17，59 个原生文件）是额外原生依赖** |
| `@expo/ui@57.0.21` | `expo@*`、`react@*`、`react-native@*`、`react-native-worklets@*`（optional）、`@babel/core@*`（optional）、`react-dom@*`（optional） | 全 `*`，无 pin 信息 |
| `nativewind@4.2.7` | `tailwindcss@>3.3.0` | 只需 Tailwind，无 RN 版本约束 |
| `nativewind@5.0.0-rc.0` | `tailwindcss@>4.1.11`、**`react-native-css@3.1.0-rc.0`** | **peer 指向另一个 RC** |
| `tamagui@2.7.7` | `react@>=19` | 可解 |
| `@gluestack-ui/core@5.0.15` | `react-native@>=0.64.0`、`react-native-svg@>=12.0.0`、`react-native-web@>=0.19.0`、`@gluestack-ui/utils@*`、`react-native-safe-area-context@>=4.0.0` | 可解（**但 `react-native-web` 与本项目无关**） |
| `@legendapp/list@3.6.0` | `react@*` | 可解 |
| `react-native-actions-sheet@10.1.2` | `react-native@*`、`react-native-gesture-handler@*`、`react-native-reanimated@*`、`react-native-safe-area-context@*`；**deps 含 `react-native-worklets`** | 可解 |
| `react-native-paper@6.0.0-alpha.0` | `react-native-worklets@>=0.8.1`、`react-native-reanimated@>=4.3.0` | 与 SDK pin 的 0.10.1 / 4.5.1 **恰好相容**，但仍是 alpha |

**【推断】决策含义**：**「用现成库」在本项目里同时意味着「接受一批没有 Expo pin 的原生依赖」**。其中 `unistyles`（需 `nitro-modules` + `edge-to-edge`）与 `react-native-ui-lib`（需 `uilib-native`）是**原生依赖面最大的两个**，与宪法 §12「引入任何第三方原生库前必须登记 license / 是否含原生代码 / OTA 影响」的登记成本直接相关。

---

## 5. 证据索引

### 5.1 来源清单（URL + 访问日期）

| 来源 | URL | 访问日期 | 用途 |
|---|---|---|---|
| **Expo 官方 `@expo/ui` 文档（Markdown 版）** | `https://docs.expo.dev/versions/latest/sdk/ui.md` | **2026-10-01** | **官方定位原文（primitives library）、三入口组件表、Host/Yoga 约束、drop-in 替代清单、平台限制** |
| npm registry（包元数据 / `dist-tags` / `time`） | `https://registry.npmjs.org/<pkg>`、`https://registry.npmjs.org/<pkg>/<version>` | **2026-10-01** | 版本、发布日期、license、peerDeps、依赖数、tarball URL |
| npm registry 搜索 API | `https://registry.npmjs.org/-/v1/search?text=...` | **2026-10-01** | Neo-Brutalism / M3 相关包的**全库枚举与下载量** |
| npm downloads API（周下载） | `https://api.npmjs.org/downloads/point/last-week/<pkg>` | **2026-10-01** | 采用基数 |
| npm tarball（解包阅读源码） | `https://registry.npmjs.org/<pkg>/-/<name>-<ver>.tgz` | **2026-10-01** | 组件清单、原生文件、字面量统计、文档原文 |
| GitHub REST API | `https://api.github.com/repos/<owner>/<repo>`、`/commits?since=...`、`/releases/latest`、`/rate_limit` | **2026-10-01** | star、archived、license、`pushed_at`、6/1 起 commit 数 |
| React Native Directory API | `https://reactnative.directory/api/libraries?search=<pkg>` | **2026-10-01** | New Architecture 支持标记 |
| React Native Paper 6.x 官方文档站 | `https://oss.callstack.com/react-native-paper/6.x/` | **2026-10-01** | 官方自称的 M3 能力范围（是否提 Expressive） |
| 仓库内一手依据 | `docs/00-Constitution/principles/App设计宪法.md`（§2 / §3 / §11.8 / §12 / 第 1–2 条）、`docs/06-Analyze/tech-research/App基座事实核对-版本线与上架门槛.md`、`docs/06-Analyze/ui-research/App设计调研-02-Android与iOS平台规范.md` | 2026-10-01 | 约束条件与既有核实结论的交叉引用 |

### 5.2 原始控制台输出（【一手实测】）

#### 5.2.1 版本 / 发布日期 / license / 周下载（原始表，节选自批量探测输出）

```
$ npm view @expo/ui version license --json
{
  "version": "57.0.21",
  "license": "MIT"
}
```

```
=== SUMMARY (latest) ===                       （registry.npmjs.org 直读，2026-10-01）
pkg                            latest      published                license
---                            ------      ---------                -------
@expo/ui                       57.0.21     2026-09-29T10:57:11.355Z MIT
@expo/vector-icons             15.1.1      2026-02-23T08:54:48.756Z MIT
@gluestack-ui/core             5.0.15      2026-06-25T05:30:19.666Z MIT
@gluestack-ui/themed           1.1.73      2025-04-08T14:07:21.293Z ISC
@gorhom/bottom-sheet           5.2.14      2026-05-09T18:28:46.604Z MIT
@legendapp/list                3.6.0       2026-09-29T19:52:49.977Z MIT
@react-navigation/native-stack 7.20.0      2026-09-29T17:06:42.882Z MIT
@rneui/themed                  5.0.0       2026-01-19T04:31:00.984Z MIT
@rn-primitives/portal          1.5.3       2026-08-08T19:31:50.861Z MIT
@shopify/flash-list            2.3.2       2026-06-10T06:06:04.569Z MIT
@shopify/restyle               2.4.5       2025-03-19T21:32:10.619Z MIT
@tamagui/core                  2.7.7       2026-08-15T00:26:42.071Z MIT
@ui-kitten/components          6.1.3       2026-09-27T16:28:35.709Z MIT
dripsy                         4.3.8       2024-10-22T21:22:00.278Z MIT
expo                           57.0.26     2026-09-29T10:57:08.644Z MIT
expo-glass-effect              57.0.4      2026-09-24T10:12:38.497Z MIT
expo-haptics                   57.0.3      2026-09-11T11:31:48.934Z MIT
expo-router                    57.0.24     2026-09-29T10:59:50.752Z MIT
expo-symbols                   57.0.3      2026-09-11T11:29:02.487Z MIT
gluestack-ui                   5.0.3       2026-06-25T05:30:36.514Z MIT
nativewind                     4.2.7       2026-09-14T22:51:19.095Z MIT
react-native                   0.87.1      2026-08-26T15:36:54.923Z MIT
react-native-actions-sheet     10.1.2      2026-01-21T07:35:46.839Z MIT
react-native-elements          3.4.3       2022-12-23T20:09:29.468Z MIT
react-native-gesture-handler   3.3.0       2026-09-11T10:48:20.163Z MIT
react-native-magnus            1.0.63      2022-09-22T11:53:39.251Z MIT
react-native-modal             14.0.0-rc.1 2025-03-15T03:54:56.538Z MIT
react-native-paper             5.15.3      2026-05-26T15:47:10.847Z MIT
react-native-reanimated        4.7.0       2026-09-18T14:34:51.410Z MIT
react-native-safe-area-context 5.10.1      2026-09-29T12:47:09.140Z MIT
react-native-screens           4.28.0      2026-09-14T10:44:16.651Z MIT
react-native-svg               15.15.5     2026-05-11T15:58:55.174Z MIT
react-native-ui-lib            9.1.3       2026-09-06T12:18:02.780Z MIT
react-native-unistyles         3.3.0       2026-07-10T15:54:31.202Z MIT
tamagui                        2.7.7       2026-08-15T00:25:22.995Z
uniwind                        1.12.1      2026-10-01T12:12:35.017Z MIT

pkg                              weekly
---                              ------
@expo/ui                        5162215
@gluestack-ui/themed            41704
@gorhom/bottom-sheet            3331208
@legendapp/list                 718535
@rneui/themed                   61963
@rn-primitives/portal           800277
@shopify/flash-list             2800058
@shopify/restyle                132311
@tamagui/core                   281257
@ui-kitten/components           15896
dripsy                           6772
expo                            10978245
expo-glass-effect               6055928
expo-haptics                    5032817
expo-router                     7619930
expo-symbols                    6266176
gluestack-ui                     3139
nativewind                      2088897
react-native-paper              516940
react-native-ui-lib              35264
react-native-unistyles          267799
react-native-magnus                388
react-native-elements            97816
tamagui                         233819
```

```
=== dist-tags（节选，原始） ===
@expo/ui            sdk-55=55.0.17  sdk-56=56.0.26  sdk-57=57.0.21  latest=57.0.21  next=58.0.10  canary=58.0.0-canary-...
expo                sdk-54=54.0.37  sdk-55=55.0.31  sdk-56=56.0.23  sdk-57=57.0.26  latest=57.0.26  next=58.0.1
react-native-paper  version3.11.0=3.11.0  alpha=6.0.0-alpha.0  rc=5.0.0-rc.10  latest=5.15.3
tamagui             prepub=1.123.3  latest=2.7.7  canary=2.7.7-1788328229285  beta=3.0.0-beta.1479.1
nativewind          preview=5.0.0-rc.0  rc=5.0.0-rc.0  rc-staging=5.0.0-rc.0  nightly=0.0.0-nightly.f9cfae6  latest=4.2.7
react-native-unistyles beta=3.0.0-beta.8  next=3.0.0-rc.5  nightly=3.0.0-nightly-20250703  latest=3.3.0
@gluestack-ui/core  preview=0.0.0-pr-... alpha=5.0.15-alpha.0  latest=5.0.15
react-native-modal  latest=13.0.1（注意：npm latest 指向 2022 年的 13.0.1，而 14.0.0-rc.1 发布于 2025-03-15）

=== 最近版本（节选，用于判断停滞）===
@gluestack-ui/core  recent: 5.0.15@2026-06-25 3.0.25@2026-06-22 3.0.24@2026-06-11 …
@legendapp/list     recent: 3.6.0@2026-09-30 3.5.0@2026-09-29 3.4.0@2026-09-22 …
@expo/ui            recent: 58.0.10@2026-10-01 58.0.9@2026-09-29 57.0.21@2026-09-29 58.0.8@2026-09-28 …
expo                recent: 58.0.1@2026-10-01 58.0.0@2026-09-29 56.0.23@2026-09-29 57.0.26@2026-09-29 …
react-native-paper  recent: 6.0.0-alpha.0@2026-06-16 5.15.3@2026-05-26 5.15.2@2026-05-08 5.15.1@2026-04-14 …
```

#### 5.2.2 硬编码字面量 / 原生文件统计（原始表，来自 tarball 解包扫描）

```
pkg                               jsFiles filesWithHex hexTotal filesWithFontSize fontSizeTotal nativeFiles
---                               ------- ------------ -------- ----------------- ------------- -----------
@expo/ui@57.0.21                      660           29       90                 5             6         231
@gluestack-ui/core@5.0.15             717            0        0                 0             0           0
@gluestack-ui/utils@5.0.6             134            0        0                 0             0           0
@gorhom/bottom-sheet@5.2.14           473            6        9                 2             2           0
@legendapp/list@3.6.0                  24            6        6                 0             0           0
@rneui/themed@5.0.0                    80            0        0                 0             0           0
@rn-primitives/slot@1.5.2               3            0        0                 0             0           0
@shopify/flash-list@2.0.2             208            0        0                 0             0           0
@shopify/restyle@2.4.5                 44            1        4                 0             0           0
@tamagui/config@2.7.7                 228            0        0                 0             0           0
@tamagui/core@2.7.7                    54            1        2                 1             2           0
@tamagui/themes@2.7.7                 224           61     1910                 0             0           0
@ui-kitten/components@6.1.3           635           38       50                 0             0           0
dripsy@4.3.8                          154            0        0                 0             0           0
expo-glass-effect@57.0.4               34            0        0                 0             0           5
expo-haptics@57.0.3                     9            0        0                 0             0           9
expo-router@57.0.24                  1218           12      129                12            38          17
expo-symbols@57.0.3                    55            2        2                 0             0           5
nativewind@4.2.7                      113           23       81                 1             2           0
react-native-actions-sheet@10.1.2      33            1        1                 0             0           0
react-native-aria@0.2.3                 4            0        0                 0             0           0
react-native-brutalism@0.1.1            0            0        0                 0             0           3
react-native-css@3.0.7                574            9       33                 6            15           0
react-native-edge-to-edge@1.8.2        31            0        0                 0             0           4
react-native-elements@3.4.3           146           19      148                 9            14           0
react-native-magnus@1.0.63            522            3      279                 0             0           0
react-native-modal@14.0.0-rc.1         12            0        0                 0             0           0
react-native-paper@5.15.3             682           22     1072                51            99           0
react-native-screens@4.26.0           646            0        0                 0             0         588
react-native-ui-lib@9.1.3             910            9      108                 4            14          59
react-native-unistyles@3.3.0          549           15       18                 0             0          92
tamagui@2.7.7                         119            2        4                 9             9           0
uniwind@1.12.1                        579           19       34                 0             0           0
@primo-brutality/ui@2.0.0               2            2       21                 0             0           0
rn-neo@0.4.0                          131            4       72                 0             0           0
uilib-native@5.1.2                     74            0        0                 0             0          59
```

```
=== 补充：rgba()/hsl() 字面量（同一扫描口径，用于解释为何某些包 hex=0 但仍有视觉）===
react-native-paper  : rgba/hsl 命中 632 行（最多：styles/themes/v3/tokens.js 78 行 ×3 份拷贝、components/Chip/helpers 21 行）
react-native-ui-lib : rgba/hsl 命中 29 行
@tamagui/themes     : rgba/hsl 命中 479 行（dist/cjs/v5-themes.native.js 44 行、src/generated-v5.ts 34 行 …）
@gluestack-ui/core  : rgba?\( 或 #hex 命中 0 行
@rneui/themed       : rgba?\( 或 #hex 命中 0 行
@legendapp/list     : rgba?\( 或 #hex 命中 3 行（#FFFFFFCC 默认值）
```

#### 5.2.3 关键包 peerDependencies（原始，用于兼容性判定）

```
### react-native-paper@5.15.3        peers: react@* | react-native@* | react-native-safe-area-context@*
### react-native-paper@6.0.0-alpha.0 peers: react@* | react-native@* | react-native-worklets@>=0.8.1 | react-native-reanimated@>=4.3.0 | react-native-safe-area-context@*
### tamagui@2.7.7                    peers: react@>=19
### react-native-unistyles@3.3.0     peers: @react-native/normalize-colors@* | react@* | react-native@>=0.76.0 | react-native-edge-to-edge@* | react-native-nitro-modules@* | react-native-reanimated@*
### nativewind@4.2.7                 peers: tailwindcss@>3.3.0
### nativewind@5.0.0-rc.0            peers: tailwindcss@>4.1.11 | react-native-css@3.1.0-rc.0
### @shopify/restyle@2.4.5           peers: react@* | react-native@*   （deps: none）
### gluestack-ui@5.0.3               peers: (none)
        deps: zod, chalk, recast, fs-extra, prettier, commander, fast-glob, nativewind, react-aria, simple-git, jscodeshift, @clack/prompts, react-native-svg, find-package-json
### @gluestack-ui/core@5.0.15        peers: react@>=16.8.0 | react-native@>=0.64.0 | react-native-svg@>=12.0.0 | react-native-web@>=0.19.0 | @gluestack-ui/utils@* | react-native-safe-area-context@>=4.0.0
        deps: 30 个，全部为 @react-aria/* 与 @react-stately/*（行为/无障碍层）
### react-native-ui-lib@9.1.3        peers: react@>=19.0.0 | react-native@>=0.77.3 | uilib-native@^5.0.1 | react-native-reanimated@>=3.19.4 | react-native-gesture-handler@>=2.24.0 | react-native-safe-area-context@>=5.6.2
### @ui-kitten/components@6.1.3      peers: react@>=18.2.0 | react-native@>=0.72.0 | react-native-svg@>=13.0.0
### rn-neo@0.4.0                      peers: expo@* | react@* | react-native@* | react-native-reanimated@>=4.2.0 | react-native-worklets@*
### react-native-actions-sheet@10.1.2 peers: react-native@* | react-native-gesture-handler@* | react-native-reanimated@* | react-native-safe-area-context@*   deps: react-native-worklets
### react-native-magnus@1.0.63       peers: react@* | react-native@* | react-native-animatable@1.3.3 | react-native-modal@13.0.1 | react-native-vector-icons@9.2.0
### @primo-brutality/ui@2.0.0        peers: nativewind@>=4.0.0 | react@>=18.0.0 | react-native@>=0.74.0
```

```
=== 安装体量（依赖数 / 文件数 / 解包字节，原始）===
react-native-paper             5.15.3     directDeps=3    files=1200   unpacked=3768150
tamagui                        2.7.7      directDeps=63   files=191    unpacked=2770386
@gluestack-ui/core             5.0.15     directDeps=30   files=1396   unpacked=1432593
nativewind                     4.2.7      directDeps=3    files=146    unpacked=341071
@shopify/restyle               2.4.5      directDeps=0    files=47     unpacked=92221
react-native-unistyles         3.3.0      directDeps=1    files=1108   unpacked=1449826
react-native-ui-lib            9.1.3      directDeps=12   files=1229   unpacked=2639929
@ui-kitten/components          6.1.3      directDeps=4    files=1021   unpacked=2629548
dripsy                         4.3.8      directDeps=4    files=257    unpacked=322952
react-native-magnus            1.0.63     directDeps=3    files=917    unpacked=1698217
react-native-elements          3.4.3      directDeps=8    files=149    unpacked=349923
@rneui/themed                  5.0.0      directDeps=0    files=82     unpacked=69701
```

#### 5.2.4 维护信号（GitHub API 原始表）

```
repo                                   stars      pushed                archived lic      issues
expo/expo                              52515      2026-10-01            False    MIT      838
callstack/react-native-paper           14466      2026-09-29            False    MIT      494
tamagui/tamagui                        14209      2026-10-01            False    MIT      99
gluestack/gluestack-ui                 5317       2026-09-02            False    none     18
nativewind/nativewind                  8106       2026-09-15            False    MIT      58
Shopify/restyle                        3425       2026-09-29            False    MIT      39
jpudysz/react-native-unistyles         2957       2026-10-01            False    none     58
wix/react-native-ui-lib                7157       2026-09-06            False    MIT      84
akveo/react-native-ui-kitten           10665      2026-09-30            False    MIT      48
nandorojo/dripsy                       2167       2024-10-09            False    MIT      23
react-native-elements/react-native-elements 25872  2026-05-21            False    MIT      159
gorhom/react-native-bottom-sheet       9104       2026-05-09            False    MIT      75
software-mansion/react-native-screens  3734       2026-10-01            False    MIT      348
Shopify/flash-list                     7241       2026-09-15            False    MIT      204
LegendApp/legend-list                  3415       2026-09-29            False    MIT      98
react-native-modal/react-native-modal  5651       2026-01-29            False    MIT      100
roninoss/rn-primitives                 943        2026-08-08            False    MIT      23
ammarahm-ed/react-native-actions-sheet 2179       （见 commits）         False    —        112

=== 2026-06-01 起的 commit 数（per_page=100 上限，100 表示"≥100"）===
expo/expo 100 | react-native-paper 48 | tamagui 100 | gluestack-ui 53 | nativewind 14 | Shopify/restyle 3
react-native-unistyles 38 | react-native-ui-lib 6 | react-native-ui-kitten 100 | dripsy 0
react-native-elements 0 | react-native-screens 100 | Shopify/flash-list 8 | LegendApp/legend-list 100
ammarahm-ed/react-native-actions-sheet 0 | react-native-modal 0 | roninoss/rn-primitives 8

=== releases/latest ===
callstack/react-native-paper     tag=v5.15.3      published=2026-05-26
tamagui/tamagui                  tag=v2.7.7       published=2026-08-15
gluestack/gluestack-ui           tag=v5.0.0       published=2026-06-25
jpudysz/react-native-unistyles   tag=v3.3.0       published=2026-07-10
LegendApp/legend-list            tag=v3.6.0       published=2026-09-29
gorhom/react-native-bottom-sheet tag=v5.2.14      published=2026-05-09
Shopify/flash-list               tag=v2.3.2       published=2026-06-10
nativewind/nativewind            tag=nativewind@4.2.7 published=2026-09-14
react-native-modal/react-native-modal tag=v13.0.1 published=2022-03-01

=== GitHub API 速率状态（本批次开始时）===
core remaining=58/60  search remaining=10/10
```

#### 5.2.5 `expo@57.0.26` 的 `bundledNativeModules.json`（节选与本文相关项，原文照录）

```
{
  "@expo/ui": "~57.0.21",
  "@expo/vector-icons": "^15.0.2",
  "expo-blur": "~57.0.3",
  "expo-font": "~57.0.4",
  "expo-glass-effect": "~57.0.4",
  "expo-haptics": "~57.0.3",
  "expo-image": "~57.0.5",
  "expo-linear-gradient": "~57.0.2",
  "expo-router": "~57.0.24",
  "expo-symbols": "~57.0.3",
  "react": "19.2.3",
  "react-native": "0.86.3",
  "react-native-gesture-handler": "~2.32.0",
  "react-native-reanimated": "4.5.1",
  "react-native-safe-area-context": "~5.7.0",
  "react-native-screens": "~4.26.0",
  "react-native-svg": "15.15.4",
  "react-native-worklets": "0.10.1",
  "react-native-keyboard-controller": "1.21.9",
  "@shopify/flash-list": "2.0.2",
  "@shopify/react-native-skia": "2.6.2",
  "@react-native-async-storage/async-storage": "2.2.0",
  "react-native-pager-view": "8.0.2",
  "react-native-webview": "13.16.1",
  "react-native-maps": "1.27.2",
  "lottie-react-native": "~7.3.8"
}
（另含全部 expo-* 包与 @expo/* 包；**未包含** react-native-edge-to-edge、react-native-nitro-modules、uilib-native，
  以及本文评估的任何 UI 库）
```

#### 5.2.6 `@expo/ui@57.0.21` 解包结构与 `src` 目录枚举（原文/原始输出）

```
顶层：android/ assets/ build/ ios/ jetpack-compose/ local-maven-repo/ plugin/ src/ swift-ui/
文件数：src 326 | build 642 | ios 153 | android 80 | plugin 8 | local-maven-repo 25 | swift-ui 4 | jetpack-compose 4

src\swift-ui        : 56 个子目录, 6 个顶层文件
src\jetpack-compose : 52 个子目录, 7 个顶层文件
src\universal       : 19 个子目录, 12 个顶层文件
src\community       :  8 个子目录
  → bottom-sheet, datetime-picker, masked-view, menu, pager-view, picker, segmented-control, slider
```

#### 5.2.7 `react-native-brutalism@0.1.1` 完整文件清单（证明其不可用）

```
C:\...\rnb\package\LICENSE
C:\...\rnb\package\package.json
C:\...\rnb\package\README.md
C:\...\rnb\package\android\build.gradle
C:\...\rnb\package\android\gradle.properties
C:\...\rnb\package\android\settings.gradle
C:\...\rnb\package\android\src\main\java\com\rnbrutalism\BrutalismPackage.kt
C:\...\rnb\package\android\src\main\java\com\rnbrutalism\BrutalismView.kt
C:\...\rnb\package\android\src\main\java\com\rnbrutalism\BrutalismViewManager.kt
（files in dist: 9, unpackedSize: 11416, 无 index.js / 无任何 .ts/.tsx）
```

---

## 6. 未能证实的事项（明确缺口）

**以下条目是本文**没有**证据支撑的部分。请勿据本文推断，也不要用任何「合理猜测」填空。**

### 6.1 【未能证实】字面量统计口径的边界

- 本文的 `#hex` 统计**只匹配 `#` 开头的十六进制形式**，**不覆盖** `rgb()` / `rgba()` / `hsl()` 字符串、颜色名（`'white'` / `'tomato'`）、以及从依赖里取的调色板对象（例如 `@expo/ui` 的 `universal/Button/index.tsx` 用的是 `colors.primary[500]`，命中数因此偏低）。**§5.2.2 已单列 rgba 命中数作为补正，但两者不是同一口径，不能相加。**
- 本文的 `fontSize` 统计**只匹配 `fontSize: <数字>` / `fontSize = <数字>`**，**不覆盖** `fontSize` 走变量、走 `scale(…)`、或经由 `style` 数组间接设置的情形。
- 因此**「某包 = 0 处字面量」应读作「在该口径下未命中」，不是「绝对没有任何内置视觉」**。已确认的反例：`@rneui/themed` 在该口径下为 0，但其默认 theme 仍是一套外来视觉。

### 6.2 【未能证实】跨来源的 license 分歧

- `gluestack/gluestack-ui` 与 `jpudysz/react-native-unistyles` 两个仓库的 **GitHub API `license` 字段返回 `none`**，而同名 npm 包的 `license` 字段为 **MIT**。**【未能证实】哪一个是权威**（可能是 GitHub 的 license 探测未识别、或仓库 license 文件与 npm 元数据不一致）。**按宪法 §3.4，采用前必须回源确认。**
- `tamagui` 的 npm 主包 `license` 字段**为空**，GitHub `license.spdx_id = MIT`。本文按 MIT 记录并标注「npm 未声明」。子包范围未逐一核查。

### 6.3 【未能证实】两个包的官方仓库 URL

- `react-native-actions-sheet@10.1.2` 的 npm 元数据 `repository.url` 为 `git+https://github.com/amake/react-native-actions-sheet.git`，该地址 **GitHub API 返回 404**；实际可访问的是 `ammarahm-ed/react-native-actions-sheet`（2,179 star、112 open issues）。**【未能证实】两者是否为同一项目的改名/转移，本文不做断言。**
- `react-native-magnus@1.0.63` 的 npm 元数据 repo 为 `https://github.com/jsartisan/react-native-magnus`，其 org 形式 `FidMe/react-native-magnus` **返回 404**。本文**未取到 magnus 仓库的 star / commit 数据**，其「已弃用」判定仅基于「最新版 2022-09-22 + 周下载 388 + peer 钉死 2022 年的依赖」三条实测事实。

### 6.4 【未能证实】组件计数口径的统一

- §4.4.2 中「一手枚举（56 / 52 / 19）」与「官方文档表格（43 / 51 / 18）」**口径不同**：官方表格不逐项列出某些较新或较细的组件，也会把 `Modifiers`、`Material Colors` 这类**非组件条目**计入，且 `ListItem` 在 universal 表里被并入 `List` 的描述。**本文不宣称哪一个是「正确组件数」**；引用时**必须声明口径**，若需要精确数字应**当时重数**（组件面随 SDK 发版变化：`@expo/ui` 的 `next` 已是 58.0.10）。

### 6.5 【未能证实】Android 侧材质与 iOS 专属能力的对应关系

- `expo-glass-effect@57.0.4` 解包实测**只有 `ios/`，没有 `android/` 目录**，源码含 `GlassContainer.ios.tsx`、`GlassView.ios.tsx`、`isLiquidGlassAvailable.ios.ts`。**【未能证实】Android 上是否有等价的官方「材质」实现**（本文未在 `@expo/ui` 中发现对应的 Compose 材质封装；`Surface` / `HorizontalFloatingToolbar` 是否算等价物，本文不作断言）。
- 【未能证实】`expo-router/unstable-native-tabs` 在 Android 上的具体实现是否走 `@expo/ui` 的 `NavigationBar`（本文只确认其含 `NativeTabsView.android.d.ts`，未追溯 Android 渲染路径）。
- 【未能证实】`@expo/ui` 组件是否在 iOS 上使用 iOS 26 的 Liquid Glass 材质（官方文档提到 `presentationBackground` 在 iOS 26 渲染为 flat color 而非半透明模糊，但**未逐一说明各组件的材质来源**）。

### 6.6 【未能证实】`react-native-edge-to-edge` / `react-native-nitro-modules` 的官方获取方式

- 二者**不在 `expo@57.0.26` 的 `bundledNativeModules.json` 内**。**【未能证实】SDK 57 官方推荐如何获取它们**（是否应通过 `npx expo install` 从 expo 的其他清单解析、还是从 npm 直装）。这直接关系到 §4.6 的版本纪律，**需要一次以 `npx expo install --check` 实测来收口**（本文未在无脚手架的环境中执行该命令，**不做推断**）。

### 6.7 【未能证实】性能与运行时行为

- 本文**没有任何性能数据**：未测渲染帧率、未测列表滚动性能、未测包体积增量、未测启动时间。**不要把 §5.2.3 的「依赖数 / 解包字节」当作性能指标**——它只是安装体量的代理量，且 `unpackedSize` 含源码与测试文件。
- 本文**没有在真机或模拟器上运行过任何一个候选库**。所有「是否强加视觉身份」的判定均来自**解包源码与令牌文件的存在性**，不是渲染截图对比。**【推断】性质，已在正文标出。**
- 【未能证实】各库**在 RN 0.86.3 / React 19.2.3（SDK 57 pin）上的实际运行兼容性**——本文只核对了 peerDependencies 与版本，**未做安装与运行验证**。

### 6.8 【未能证实】「自研还是用现成」的最终结论

- 本文**刻意不给选型结论**：这是需要所有者裁决的架构决策，其输入还包含本文未涵盖的维度（团队产能、1 个月工期、模块铺开顺序）。
- 本文提供的是**由事实推导出的约束边界**（【推断】性质，供裁决使用）：
  1. **【推断】「令牌是唯一事实源」这条纪律，与「引入自带完整 token 的设计系统」在原理上互斥**（除非愿意长期维护 fork/覆盖层）。因此 `react-native-paper` / `tamagui` / `react-native-ui-lib` / `@ui-kitten` / `react-native-magnus` / `react-native-elements` 与本案的令牌纪律相冲。
  2. **【推断】「苹果舒适感 + Discord 社区感 + 三类元素 brutal」这个组合没有任何现成库提供**；它必须由自研组件 + 令牌表达。可复用的是**行为**（headless 原语、列表、手势、动效、drop-in 替代）与**平台原生控件桥**（`@expo/ui`）。
  3. **【推断】因此在事实层面，「组件层」不是二选一，而是三层分工**：平台原生容器与控件（`@expo/ui` + `react-native-screens` + `expo-router` native tabs）／行为原语（headless 或纯行为包）／**自研表现层组件（消费本项目令牌）**。**每一层「用什么」仍需所有者裁决，但「表现层必须自研」在事实层面已很难绕开**——白名单（只允许三类元素 brutal）与零字面量纪律都无法从现成库中得到。

---

## 7. 附：本文与仓库内既有材料的关系

### 7.1 与既有结论的交叉核实

| 既有出处 | 既有说法 | 本文核实结果 |
|---|---|---|
| `App设计宪法.md` §11.8 | `@expo/ui` 已提供的原生组件不允许自写原生实现；其内部无 Yoga/Flexbox，须用 `HStack`/`VStack`/`Row`/`Column` 并包在 `Host` 内 | **方向成立，表述需精确化**：官方原文为 *"Flexbox styles apply to the `Host` component itself. Once you are inside the native context, Yoga is not available."*——即限制**限于原生 context**；`universal` 入口的 `Row`/`Column` 就是 RN Flexbox（§4.4.3） |
| `App设计宪法.md` §12 | 实测 `FlashList` 与 `LegendList` 零原生代码；`@expo/ui`、`screens`、`reanimated`、`worklets`、`gesture-handler` 含原生代码 | **复核一致**：`@shopify/flash-list@2.0.2` = 0 原生文件；`@legendapp/list@3.6.0` = 0 原生文件；`@expo/ui`=231、`screens`=588、`expo-haptics`=9、`expo-symbols`=5、`expo-glass-effect`=5（仅 iOS） |
| `App设计调研-02` | M3 motion physics 无官方 RN 实现 | **复核一致且互补**：不仅 motion，**M3 Expressive 组件集在 RN 上也无任何官方实现**（§4.1） |
| `App基座事实核对` | SDK 57 为当前唯一 stable 线；不要用 npm latest 装 RN/React | **复核一致**：本批实测 `expo@57.0.26`/`latest`、`expo@58.0.1`/`next`；`react-native@0.87.1`/`latest` vs SDK pin `0.86.3`（§4.6） |
| 同名旧稿（2026-10-01 21:51，253 行） | 三层策略（平台原语用现成 / 设计系统层自研 / 完整 UI kit 不作基座）；引用 `https://docs.expo.dev/versions/latest/sdk/ui.md` 的两段原文 | **核心判断与本文一致**；其引用的官方原文**经本文复核为准确**并已保留（§4.4.1）。**需修正之处**：① Yoga 约束的适用范围（见上）；② `react-native-paper` 最新发布日为 **2026-05-26**（非 2026-06-15）、`@shopify/restyle` 为 **2025-03-19**（非 2026-04-16）、`tamagui` 为 **2026-08-15**（非 2026-09-27）、`@gluestack-ui/themed` 为 **2025-04-08**（非 2025-09-10）；③ `@gluestack-ui/themed` 已非该库主线，当前库为 **`@gluestack-ui/core@5.0.15`**（§2.1）；④ 旧稿称「*未逐一枚举* RN Neo-Brutalism 库」，本文已枚举（§4.2） |

### 7.2 声明

本文为**新增文件**（写入前同名旧稿已存在，经复核后由本文覆盖）；**未修改仓库内任何其他文件**；**未执行 `git add` / `git commit`**；**未在仓库内安装任何依赖**（全部为 `npm view` / registry HTTP 读取 / 解包至仓库外临时目录）。本文引用的所有扫描原始产物（registry JSON、`literal-scan.json`、`downloads-week.json`）保存在仓库外临时目录 `%TEMP%\xmum-npm-probe\`，**未入仓**。
