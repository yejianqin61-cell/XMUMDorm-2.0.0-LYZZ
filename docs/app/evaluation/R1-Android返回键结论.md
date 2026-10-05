# R1 结论 · Android 返回键（predictive back / targetSdk 36）

**日期**：2026-10-02　**版本**：v1.0
**性质**：**evaluation 层**（判定记录）。对应 [P0-09 子任务](../task/phase-0/P0-09-Android返回键spike.md)。
**判定对象**：在 **targetSdkVersion 36**（Android 16）上，本项目「五格底栏 + 各 Tab 独立返回栈 + 顶栏信箱推入式目的地 + 发布中心」的导航壳，**返回键会不会直接退出 App**。

---

## 0. 一句话结论

**不能直接下"一定不会退出"的结论，但默认配置是安全的、且已被本仓库实测证明：**

- 宪法 4.5 记的社区风险**确实存在**，但它的**危险组合不是 Android 16**，而是
  **API 33–35 的老设备 + targetSdk 36 + predictive back 被打开**；
- Expo SDK 57 的模板**默认写死 `android.predictiveBackGestureEnabled: false`**；
- ✅ **本仓库已实测证明该字段真的落进了 manifest**：`npx expo prebuild --platform android` 产物里
  `AndroidManifest.xml` 的 `<application>` 上确实有 **`android:enableOnBackInvokedCallback="false"`**；
- ⛔ **`Expo Go` 不能用来测返回键**（Expo 官方 PR 明说该字段对 Expo Go 无效，必须 development build）；
- ⚠️ **两条必须继续守住的线**：① 不吃默认值（SDK 曾预告要翻转它）② API 33–35 老机型必须真机验。

---

## 1. 一手证据

| # | 事实 | 来源 |
|---|---|---|
| 1 | **SDK 57 模板自带** `"android": { "predictiveBackGestureEnabled": false }` | 本仓库 `app/app.json`（`create-expo-app` 产物，可复现） |
| 2 | Expo 官方文档原文：*"…Enable your app to use the predictive back gesture on Android 13 (API level 33) and later. **Default to false.** … update the `android:enableOnBackInvokedCallback` value in AndroidManifest.xml."* → **`app.json` 字段就是该 manifest 属性的官方映射** | [Expo v57 config](https://docs.expo.dev/versions/v57.0.0/config/app/#predictivebackgestureenabled) |
| 3 | **✅ 本仓库实测**：prebuild 产物 `android/app/src/main/AndroidManifest.xml` 的 `<application>` 含 **`android:enableOnBackInvokedCallback="false"`** | 2026-10-02 本地 `npx expo prebuild --platform android --no-install` |
| 4 | 上游 issue **仍 open**，标签 `Issue accepted` / `Upstream: React Native Screens`；Expo 员工原话：**"我现在唯一能建议的修复就是设 `predictiveBackGestureEnabled=false`"** | [expo/expo#39092](https://github.com/expo/expo/issues/39092) |
| 5 | 危险组合与平台相关：`enableOnBackInvokedCallback="true"` 时 **API 33–35** 收不到 `hardwareBackPress` → 返回键回桌面；**Android 16 不受影响**（⚠️ 社区根因，非官方） | [react/react-native#58407](https://github.com/react/react-native/issues/58407) |
| 6 | RN 0.86 的 JS 层**没有**改用 `OnBackInvokedDispatcher`：`BackHandler.android.js` 仍只订阅 `hardwareBackPress`，无订阅者时 `exitApp()` | v0.86.0 源码 |
| 7 | RN 0.86 release notes 里返回键相关**只有两条**：**"BackHandler resume fix on API 36+"**（从后台恢复后回调失效 → `onHostResume` 重新注册）与事件带 `timeStamp`；**全文无 predictive back 字样** | [RN 0.86](https://reactnative.dev/blog/2026/06/11/react-native-0.86) |
| 8 | `react-native-screens` 维护者：在 Fragment 层做 predictive back 需要 FragmentManager 返回栈，**"很可能永远不会在 rns v4 做"** | [rns#2540](https://github.com/software-mansion/react-native-screens/discussions/2540) |
| 9 | **`predictiveBackGestureEnabled` 对 Expo Go 无效**，必须 development build | [expo/expo#39841](https://github.com/expo/expo/pull/39841) |
| 10 | SDK 54 changelog 曾预告"计划在 SDK 55 或 56 默认开启" → **默认值将来可能翻转** | [SDK 54 changelog](https://expo.dev/changelog/sdk-54) |

---

## 2. 本仓库已做的四件事

| # | 动作 | 落地位置 |
|---|---|---|
| 1 | **显式写死** `predictiveBackGestureEnabled: false`（⛔ 不吃默认值） | `app/app.json`，并由测试 `TC-P0-09-5A` 守住 |
| 2 | **把"字段真的进 manifest"做成可执行断言** | 本文件 §3 的命令；P0-09 §5-I4 |
| 3 | 备用 config plugin **写进仓库但刻意不启用**（一旦断言失败就挂上） | `app/plugins/withDisablePredictiveBack.js`；测试断言它**不在** `plugins` 数组里 |
| 4 | 导航壳**不做任何依赖 predictive back 的设计**；返回策略是纯逻辑（`resolveBackAction`） | `app/src/features/navigation/backPolicy.ts`；测试断言全仓 0 处订阅系统返回键事件 |

**代价（如实记录）**：`false` 的固有代价是**没有返回预览（peek）动画** —— 本机感略有损失。这是该逃生舱的已知代价，接受。

---

## 3. 可复现的验证命令

```bash
cd app
npm run prebuild:android                     # 生成 android/（gitignored，宪法 11.1）
# 断言：产物 manifest 必须含 android:enableOnBackInvokedCallback="false"
findstr /C:"enableOnBackInvokedCallback" android\app\src\main\AndroidManifest.xml
```
> 2026-10-02 实测输出（摘录）：
> `<application … android:enableOnBackInvokedCallback="false" …>`

---

## 4. ⛔ 必须真机才能定的五项（**当前不得当已成立**）

| # | 待验证 | 通过判据 | 失败判据 |
|---|---|---|---|
| 1 | 各 Tab 内二级页返回 | 逐级弹栈，**回到进入前的滚动位置** | 直接退出 / 回到列表顶部 |
| 2 | Tab 内到栈底再按一次 | 交给系统（是否退出由系统决定） | 直接退出而我们没有心理预期 → 需加"再按一次退出"提示 |
| 3 | **发布中心内**按返回 | 只关闭发布中心，**底栏选中态不变**（4.9.2-④） | 底栏跳到别的格 |
| 4 | **从后台恢复后**返回键是否仍有效 | 有效（RN 0.86 修的就是 API 36+ 这一条） | 失效 → 记录并按 §5 升级 |
| 5 | 对照组：临时置 `true`，在 **API 33–35** 设备复现"返回键直接退出"，并在 Android 16 上确认不受影响 | 复现/不复现与证据 5 一致 | 与证据 5 不符 → 更新本文件 |

**⛔ 机型矩阵必须含 API 33 / 34 / 35 老设备 + Android 16，且必须是 development build / release build，不是 Expo Go。**

---

## 5. 若真机出现"返回键直接退出"

按顺序处置（⛔ 任何情况下**不得劫持** `KEYCODE_BACK`，宪法 4.4.2）：

1. 确认 `app.json` 字段仍在（测试会守）；
2. 确认 prebuild 产物 manifest 含 `=false`（§3 命令）；
3. 若字段没落地 → 把 `plugins/withDisablePredictiveBack.js` 加进 `app.json` 的 `plugins`，重新 prebuild；
4. 仍失败 → 检查 `react-native-screens` 是否为 SDK 57 钉版 `~4.26.0`；
5. 以上都无效 → **升级为 ADR**，并重新评估导航壳（`expo-router` 原生 Tabs 的返回行为）。

---

## 6. 未取到一手来源的两条（**如实标注**）

1. **Android 官方对 `android:enableOnBackInvokedCallback` 的逐字定义**（默认值随 targetSdk 的规则、targetSdk 36 下 opt-out 是否仍被尊重）：本次只确认 Android 16 行为变更页存在 `#predictive-back` 小节，**正文未读到**。
2. **RN 0.86 的注册点（`ReactActivity` / `AndroidVersion.isAtLeastTargetSdk36()`）**：该判断出自 0.84.1 / 0.87.1 的社区报告；0.86 tag 下只逐字确认了 `ReactDelegate.kt` 与 JS `BackHandler.android.js`，**注册点未逐行核实**。

---

## 7. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立。判定"默认安全（已实测 manifest）"；10 条证据；4 项已做动作；5 项真机待办；2 条未取原文 |
