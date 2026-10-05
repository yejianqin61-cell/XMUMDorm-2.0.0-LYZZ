# P0-09 · Android 返回键 spike（R1）

| 项 | 值 |
|---|---|
| 负责人 | 甲 |
| 依赖 | P0-01 |
| 写作用域 | `app/app.json`（仅 `android.predictiveBackGestureEnabled`）· `app/src/features/navigation/backPolicy.ts` · `docs/app/evaluation/R1-Android返回键结论.md` |
| 状态 | ✅ 已完成（2026-10-02；真机 5 项见 R1 结论文档 §4） |

## 0. 执行结果速览（详见 §8）

- ✅ **实测证明字段落地**：`npx expo prebuild --platform android` 产物 manifest 含 `android:enableOnBackInvokedCallback="false"`
- `features/navigation/backPolicy.ts`：返回策略纯逻辑（覆盖层 > 出栈 > 交给系统），⛔ 不含平台 API
- `plugins/withDisablePredictiveBack.js`：**备用插件（刻意未启用）**
- 结论文档：[R1 结论文档](../../evaluation/R1-Android返回键结论.md)（三态结论：**默认安全（已实测）/ 危险组合是 API 33–35 + predictive back 打开 / 5 项真机待办**）
- 测试 **261 例全过**（本任务 +9）· `tsc --noEmit` exit 0 · 尺子 exit 0

## 1. 目标

把 **R1**（Android target 36 上返回键可能**直接退出 App**）从"社区传闻"降为**有代码级证据 + 真机待办**的结论，并保证**结论出来前不锁定返回栈实现**（宪法 4.5）。

## 2. 依据

- 宪法 **4.4**（返回是系统级行为，⛔ 不得劫持 `KEYCODE_BACK`；每 Tab 独立返回栈；配置变更不丢状态）
- 宪法 **4.5**（**阻塞级前置验证**：真机 spike；结论可能形成 ADR；结论出来前不锁定实现）
- 宪法 **12.1-1**（targetSdkVersion ≥ 36 已生效，SDK 57 开箱满足）
- 设计阶段计划 §4 **R1** 行（RN 官方博客 vs 社区实测相反；上游 `expo/expo#39092` open；逃生舱 `android:enableOnBackInvokedCallback="false"`）

## 3. 交付物

| 文件 | 说明 |
|---|---|
| `docs/app/evaluation/R1-Android返回键结论.md` | 结论（三态：成立 / 不成立 / 待真机）+ 证据表 + 真机验证步骤 + 逃生舱配置方式 |
| `app/src/features/navigation/backPolicy.ts` | **纯逻辑**：`resolveBackAction(state)` → `'popStack' \| 'closeOverlay' \| 'exitApp'`（与平台实现解耦，可单测；⛔ 不劫持系统返回） |
| `app/app.json` | `android.predictiveBackGestureEnabled` 的取值 + 理由（**SDK 57 模板默认即 `false`**，见 §4.1） |

## 4. 证据与本包结论（**已核实部分**）

### 4.1 一手证据（已核实 @2026-10-02）

| 证据 | 内容 | 来源 |
|---|---|---|
| **SDK 57 模板自带该字段** | `npx create-expo-app --template expo-template-blank-typescript`（SDK 57 线）生成的 `app.json` **自带** `"android": { "predictiveBackGestureEnabled": false }` | `app/app.json`（本次脚手架产物，**本仓库内可复现**） |
| Expo 官方文档明写默认 false | 「…Enable your app to use the predictive back gesture on Android 13 (API level 33) and later. **Default to false.** Existing React Native app? To change the setting, update the `android:enableOnBackInvokedCallback` value in AndroidManifest.xml.」→ **`app.json` 字段就是该 manifest 属性的官方映射** | [Expo v57 config docs](https://docs.expo.dev/versions/v57.0.0/config/app/#predictivebackgestureenabled) |
| 上游 issue 仍 open + 官方给的唯一 workaround | `expo/expo#39092`（open，标签 `Issue accepted` / `Upstream: React Native Screens`）：现象是"back gesture 回到手机桌面而不是上一屏"；Expo 员工 Ubax 原话：**"我现在唯一能建议的修复就是设 `predictiveBackGestureEnabled=false`"** | [expo/expo#39092](https://github.com/expo/expo/issues/39092) |
| 危险组合不是 Android 16 | `react/react-native#58407`（open）+ 社区根因：`enableOnBackInvokedCallback="true"` 时 **API 33–35** 收不到 `hardwareBackPress`、返回键直接回桌面；**Android 16 不受影响**（⚠️ 根因是社区结论，非官方） | [react/react-native#58407](https://github.com/react/react-native/issues/58407) |
| RN 0.86 的 JS 层没换机制 | v0.86.0 `Libraries/Utilities/BackHandler.android.js` 仍只订阅 `hardwareBackPress`，无订阅者时 `exitApp()`；`OnBackInvoked*` 在该文件零出现 | [v0.86.0 raw 源码](https://raw.githubusercontent.com/react/react-native/v0.86.0/packages/react-native/Libraries/Utilities/BackHandler.android.js) |
| RN 0.86 新增一条相关修复 | release notes 唯一相关两条：**「BackHandler resume fix on API 36+」**（从后台恢复后回调失效 → 在 `onHostResume` 重新注册）与 `hardwareBackPress` 带 `timeStamp`；**全文无 predictive back 字样** | [RN 0.86 blog](https://reactnative.dev/blog/2026/06/11/react-native-0.86) |
| **Expo Go 不能用来测返回键** | `expo/expo#39841`（已 merge）：设 `predictiveBackGestureEnabled` **对 Expo Go 无效**，必须用 **development build** | [PR #39841](https://github.com/expo/expo/pull/39841) |

> **本包结论（第一态：部分成立）**：**默认配置下 R1 的"直接退出 App"风险已被规避**（字段显式为 false → 走传统 `onBackPressed` → `BackHandler` 链路）。⚠️ 但有两条线必须继续守住：① SDK 54 changelog 曾预告"计划在 SDK 55/56 默认开启"，**默认值将来可能翻转** → 必须**不要吃默认值**；② **API 33–35 老机型**是真正的危险档，且 **Expo Go 测不出来**。

### 4.2 仍然必须真机验证的部分（**不得当已成立**）

| # | 待验证 | 通过判据 | 失败判据 |
|---|---|---|---|
| 1 | 从二级页返回**回到进入前的一级 Tab 与滚动位置** | 逐级返回，位置保持 | 回到列表顶部或直接退出 |
| 2 | 返回键在**发布中心内**只关闭发布中心 | 底栏选中态不变 | 底栏跳到别的格 |
| 3 | 返回键在**信箱**内回到进入前的 Tab | 回到原位置 | 回到广场首页 |
| 4 | 一/二级 Tab 来回切后返回**不会一次退到桌面** | 逐级弹栈 | 直接退出 App |
| 5 | 与 `predictiveBackGestureEnabled: true`（对照组）的差异 | 记录现象 | —— |

⛔ **在这 5 项打完之前，`backPolicy.ts` 只作为"意图声明 + 单测对象"，⛔ 不得据此锁定导航库或返回栈实现。**

### 4.3 逃生舱（保留，不启用）

若真机出现"直接退出"，顺序为：① 保持 `predictiveBackGestureEnabled: false` ② 检查 `react-native-screens` 线内版本（SDK 57 钉 `~4.26.0`）③ 最后才考虑自定义 `BackHandler` 兜底 —— ⛔ **任何情况下不得劫持 `KEYCODE_BACK`**（宪法 4.4.2）。

## 5. 验收标准

| # | 判据 |
|---|---|
| I1 | 结论文档给出**三态结论**，且明确写出"哪些是代码级证据、哪些待真机" |
| I2 | `backPolicy.ts` 覆盖"发布中心/信箱/二级页/Tab 根"四类状态的返回目标，且**无平台 API 依赖** |
| I3 | ⛔ 全仓 0 处 `BackHandler.addEventListener('hardwareBackPress')` 劫持（源码扫描） |
| I4 | `app.json` 的 `predictiveBackGestureEnabled` 取值有书面理由 |
| I5 | 真机 5 项验证步骤可被任何人在 10 分钟内执行（步骤 + 期望 + 记录表） |

## 6. 测试用例

| 编号 | 类型 | 内容 | 期望 |
|---|---|---|---|
| TC-P0-09-1A | 自动 | `resolveBackAction({ overlay:'publish' })` | `'closeOverlay'` |
| TC-P0-09-2A | 自动 | `resolveBackAction({ overlay:null, canGoBack:true })` | `'popStack'` |
| TC-P0-09-3A | 自动 | `resolveBackAction({ overlay:null, canGoBack:false, tabRoot:true })` | `'exitApp'`（交给系统，不由我们决定） |
| TC-P0-09-4A | 自动 | 源码扫描：0 处 `hardwareBackPress` / `BackHandler.addEventListener` | 0 命中 |
| TC-P0-09-5A | 自动 | `app.json` 有 `android.predictiveBackGestureEnabled` 且为布尔值 | 通过 |
| TC-P0-09-6M | 人工（真机） | §4.2 五项逐项 | 结论落库 |

## 7. 执行记录

| 时间 | 动作 | 结果 |
|---|---|---|
| 2026-10-02 | R1 证据核实（官方文档 + 上游 issue + RN 0.86 源码 + rns discussion） | ✅ 找出**真正的危险组合**是 API 33–35 + predictive back **被打开**（不是 Android 16）；`predictiveBackGestureEnabled` 是 manifest 属性的官方映射；⛔ **Expo Go 测不了**；SDK 54 曾预告翻转默认值 → **必须显式写死** |
| 2026-10-02 | `npx expo prebuild --platform android --no-install` | ✅ **实测通过**：产物 `AndroidManifest.xml` 的 `<application>` 上确有 `android:enableOnBackInvokedCallback="false"` —— 这是"字段真的落地"的唯一客观证据 |
| 2026-10-02 | `backPolicy.ts` | ✅ `resolveBackAction()` 四类状态：覆盖层内→关覆盖层（4.9.2-④ 底栏选中态不变）· 能出栈→出栈 · 栈底→交给系统；⛔ 无 `BackHandler` / 无 `react-native` 依赖（测试断言） |
| 2026-10-02 | `plugins/withDisablePredictiveBack.js` | ✅ **备用不启用**：测试断言它**不在** `app.json` 的 `plugins` 里（挂着会掩盖未来默认值翻转） |
| 2026-10-02 | `npx jest --ci` / `tsc` / 尺子 | ✅ 12 suites / **261 tests** · tsc exit 0 · 尺子 exit 0 |
| 2026-10-02 | ⚠️ prebuild 暴露**真缺陷** → 独立修复提交 `80090e4` | Android 上 `userInterfaceStyle: automatic` **需要 `expo-system-ui`**（否则双主题在 Android 不生效）→ 已安装；同时把 prebuild 改写的 `expo run:*` 脚本**还原**（`android/`、`ios/` 是 gitignored，脚本不该依赖本地状态） |
| 2026-10-02 | 1 处自我修正 | `backPolicy.ts` 注释里写了被禁的 API 名 → 自测扫描命中 → 改措辞 |

### 7.1 与本文档原口径的差异

| 项 | 文档原口径 | 实际做法 | 原因 |
|---|---|---|---|
| 结论形态 | 文档 §4 写"三态：成立/不成立/待真机" | R1 的实际结论是**"默认安全（已实测）+ 危险组合定位 + 5 项真机待办"** | 证据比预期更强：不只知道"默认关"，还**实测证明字段进了 manifest**；同时把危险范围收窄到 API 33–35 |
| 逃生舱 | §4.3 写"保留，不启用" | 具体落成 `plugins/withDisablePredictiveBack.js` + 测试守住"未启用" | 让它"随时可用但不会误用" |
| manifest 断言 | §5-I4 只要求"取值有书面理由" | 升级为**可复现命令 + 实测输出**（R1 结论文档 §3） | "文档默认值" ≠ "产物里写了属性"，必须实测 |
