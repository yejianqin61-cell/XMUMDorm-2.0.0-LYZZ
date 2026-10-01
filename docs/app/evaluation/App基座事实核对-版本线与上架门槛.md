# App 基座事实核对：版本线 与 上架门槛

**核对人**：Lead（独立核实，未采信仓库内归档旧结论）
**核对时间**：**2026-09-30 23:44–23:47 (+08:00)**
**性质**：宪法技术栈条款的**事实依据**。本文件只记录「可复现的硬事实」，不含设计主张；完整技术选型调研由 R3 另行产出。
**为什么由 Lead 亲自做**：版本线与 Play target API 是**开工前必须定死**的两项，且归档旧结论称"2026-06-30 SDK 57 为最新稳定"——已过去三个月，必须重验。

---

## 一、版本线（npm registry 实测）

```
执行时间：2026-09-30 23:44:49 +08:00
命令：npm view <pkg> dist-tags --json
```

| 包 | `latest` | 其他关键 tag |
|---|---|---|
| **expo** | **57.0.26** | `next` = **58.0.0**（正式版本号，非 canary）；`sdk-56` = 56.0.23；`canary` = 58.0.0-canary |
| **react-native** | **0.87.1** | `0.86-stable` = 0.86.3；`next` = 0.88.0-rc.3 |
| **react** | **19.3.0** | `next` = 19.3.0-canary |
| **expo-router** | **57.0.24** | `next` = 58.0.10 |

### 结论 1：SDK 57 仍是当前唯一 stable 线

`expo` 的 `latest` = **57.0.26**，而 **58.0.0 只存在于 `next`**。即：**SDK 58 尚未转为稳定。**

### ⚠️ 结论 2（易踩的坑）：不要用 RN / React 的 npm `latest`

Expo 项目**必须使用 Expo 为该 SDK pin 的版本**，而不是各包自己的 `latest`：

- RN 的 npm `latest` 是 **0.87.1**，但 Expo SDK 57 配对的是 **0.86.x 线**（`0.86-stable` = 0.86.3；归档 v1 实测用的正是 `react-native 0.85.3` + `expo ~56.0.8`）。
- React 的 npm `latest` 是 **19.3.0**，而 SDK 57 线配对的是 **19.2.x**。
- 直接用 `npm install react-native@latest` 会**脱出 Expo 的兼容矩阵**，属于典型事故。

> 佐证：`expo@57.0.26` 的 `peerDependencies` 里 `react` / `react-native` 都是 `"*"`（不提供 pin），所以 pin 只能来自 Expo 官方 SDK 发布说明或 `expo-doctor` 校验，**不能从 peerDeps 推断**。

### 结论 3（排期关键）：SDK 58 的稳定时间窗已经可算

来自 Expo 官方 changelog（一手）：

- 标题：**"Expo SDK 58 Beta is now available"**，**发布于 2026-09-15**。
- 原文：**"The SDK 58 beta period begins today and will last three to four weeks."**
- 原文：**"SDK 58 beta includes React Native 0.88 (Release Candidate). React Native 0.88 has not been released yet, so the beta uses the release candidate. We will move to the stable release when React Native 0.88 ships, and release SDK 58 shortly after."**
- 原文：**"SDK 58 is built for iOS 27"**。
- 原文：Expo Go 商店版"will update to SDK 58 shortly after the stable release, so you have time to upgrade before the store version drops SDK 57 support."

**推算**：beta 起点 2026-09-15 + 3～4 周 → **SDK 58 稳定期约在 2026-10-06 ～ 2026-10-13**。今天是 **2026-09-30**，距其稳定**约 1～2 周**。

来源：<https://expo.dev/changelog/sdk-58-beta>

---

## 二、上架门槛（Google Play，官方一手）

来源：<https://developer.android.com/google/play/requirements/target-sdk>（经 Jina Reader 提取，2026-09-30）

> **Starting August 31 2026:**
> - **New apps and app updates must target Android 16 (API level 36) or higher** to be submitted to Google Play（Wear OS / Automotive / TV / XR 另有更低要求）
> - Existing apps must target Android 15 (API level 35) or higher to remain available to new users on newer devices
> - If you need more time, **you'll be able to request an extension to November 1, 2026**

### 结论 4：新 App 必须 target **API 36（Android 16）**，且该要求**已生效**

今天是 2026-09-30，**8 月 31 日的门槛已经在执行**。本项目是**全新 App**，因此从第一次提交起就必须满足 API 36。延长期（至 2026-11-01）只对存量应用有意义。

> 归档旧调研称"自 2026-08-31 起新应用与更新必须 target API 36"——**本次核对确认该结论正确**，且已从"将生效"变为"已生效"。

---

## 三、iOS 侧原生能力（同一手来源，直接影响"iOS 加点原生"的可行性）

来自 SDK 58 beta changelog（2026-09-15）：

| 能力 | 事实 |
|---|---|
| **Liquid Glass 是真实且 Expo 已支持的 API** | 提到 **`expo-glass-effect`**，并称 `isLiquidGlassAvailable` 在"以 iOS 27 SDK 构建的应用中返回 `true`" |
| **iOS 27 采用 UIKit scene-based 生命周期** | "iOS 27 requires the UIKit scene-based life cycle and makes iPhone apps resizable"，Expo 应用已改用 scene 生命周期以在 iOS 27 正确启动 |
| **`@expo/ui` 提供 SwiftUI 与 Jetpack Compose 原生组件** | iOS 新增 `NavigationStack` / `Toolbar` / `NavigationLink` / `NavigationDestination` / `navigationTitle`；Android 新增 Compose `Image` / `DateRangePicker` / `VerticalSlider` |
| **`RNHostView` 量测缺陷已修** | SDK 58 修了"宿主在 SwiftUI/Compose 内的 RN 视图"的点击丢失、手势被外层滚动抢走、BottomSheet/Popover 内触摸丢失等问题 |
| **Expo Router 在 58 提供稳定 data loaders 与 native tabs** | changelog 小节标题即 "Expo Router: stable data loaders and native tabs" |
| 新增 `@expo/agent-cli` | 面向 agent 的 CLI（`npx @expo/agent-cli@latest agents:setup`） |

**对本项目的含义**：所有者定的"**iOS 侧加一点原生**"在技术上**有官方路径且不需自建桥接**——`@expo/ui` 已把 SwiftUI/Compose 组件暴露出来，`expo-glass-effect` 直接对应 Liquid Glass。这一点在规划 iOS 侧时可直接采用，不必自研原生模块。

---

## 四、由以上事实直接推出的两条排期建议

### 建议 1：**不要锁 SDK 57，也不要做"原生重建窗口"**

旧《移动端宪法》的核心排期假设是「**锁定 SDK 57，一次装齐原生包，此后只走 OTA**」，理由是当时 SDK 58 为 Beta。

但**现在的前提不同**：本项目的 App **一行代码都还没写**，而 SDK 58 稳定期约在 1～2 周后。因此合理做法是：

- **选项 A（推荐）**：**等待 SDK 58 转稳定（约 1～2 周）后直接从 58 起步**，把"下一次原生重建"从计划里彻底删掉；
- **选项 B**：在等待期内只做**与 SDK 版本无关**的工作（设计体系、宪法、页面盘点、后端推送通道 APNs/FCM 改造），SDK 决定留到 58 稳定时再落；
- **选项 C（不推荐）**：现在锁 57 起步，则 58 稳定后要么放弃升级、要么付出一次原生重建 + 重新提交的代价。

> 这三条都属于**排期决策**，需要所有者确认；本文件只提供事实与代价，不代替决策。

### 建议 2：**推送通道（APNs/FCM）是唯一"必须先做的后端工程"**

调研-03 已指出：现状只有 Web Push（VAPID），而私信离线可达、接单、报名截止、课前提醒**全部依赖系统推送**。它是唯一无法靠前端设计绕开的后端增量。SDK 版本待定的这段窗口，正好可以并行推进它。

---

## 五、尚未核实 / 待补

以下项本文件**没有**独立核实，留给 R3 的完整调研或后续工作：

| 项 | 说明 |
|---|---|
| Expo SDK 57 与 58 各自 pin 的确切 `react-native` / `react` 版本号 | 本次只确认了"SDK 57 走 0.86.x 线、SDK 58 走 RN 0.88(RC)"这一量级；精确小版本需查各 SDK 发布说明或 `npx expo install --check` |
| 新架构（Fabric / TurboModules / Bridgeless）在 57/58 的默认状态与三方库兼容情况 | 未查 |
| 列表虚拟化 / 动效 / 手势 / 触感等运行时库的当前版本、许可证、原生依赖 | 未查 |
| EAS Build vs 本地 prebuild 的取舍、CI 形态 | 未查 |
| Google Play **新开发者账号**的封闭测试人数/天数要求 | 未查（这是上架工期的第一决定因素） |
| UGC 应用在 Play/App Store 的强制功能清单（屏蔽用户、应用内注销、条款接受等） | 未查 |

> 上述六项正是 R3 调研的交付范围。**在它们补齐之前，不写《App 设计宪法》的技术栈条款。**

---

## 六、复现方式

```powershell
# 版本线（含核实时间）
Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
npm view expo dist-tags --json
npm view react-native dist-tags --json
npm view react dist-tags --json
npm view expo-router dist-tags --json

# 上架门槛与 SDK 58 状态（一手页面）
curl -s "https://r.jina.ai/https://developer.android.com/google/play/requirements/target-sdk"
# 以及 https://expo.dev/changelog/sdk-58-beta
```
