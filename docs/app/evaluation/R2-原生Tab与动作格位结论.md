# R2 结论 · 原生 Tab 栏与"动作型格位"（SDK 57）

**日期**：2026-10-02　**版本**：v1.0
**性质**：**evaluation 层**（判定记录）。对应 [P0-05 子任务](../task/phase-0/P0-05-五格底栏导航壳.md) 与 [P0-06](../task/phase-0/P0-06-二级顶部Tab条.md)。
**判定对象**：宪法 4.3 要求"导航壳交给原生容器"，而第 5 格是**动作型 Tab**（点了**不切页**，打开发布中心、底栏选中态不变、不进返回栈）—— **SDK 57 的原生 Tab 容器能不能承载这种"非目的地格位"？**

---

## 0. 一句话结论

**能 —— 选 (a) `expo-router/unstable-native-tabs`，机制是 Trigger 的 `disabled`。**
官方语义正好等于我们要的东西：*"If `true`, the tab is shown but cannot be selected by tapping it in the tab bar"*。
被挡下时导航器**仍会 emit `tabPress` 并带 `data.isPrevented = true`**，随后**不** dispatch `JUMP_TO`
→ **选中态与返回栈都不变**。

⛔ **三条容易做错的**：① `Trigger` **没有 `onPress`**；② `tabPress` 的 `canPreventDefault` 是 **`false`**，`e.preventDefault()` **无效**；③ **候选 (c) 在 SDK 57 上根本不存在**。

---

## 1. 三条候选的实测对比（解包 `expo-router@57.0.24` + `react-native-bottom-tabs@1.4.0` 读源码）

| 能力 | (a) `expo-router/unstable-native-tabs` | (b) `react-native-bottom-tabs@1.4.0` | (c) `expo-router/native-tabs` |
|---|---|---|---|
| SDK 57 是否存在 | ✅ 存在（`build/native-tabs/`） | ✅ 独立包 | ❌ **不存在**：稳定入口是 **58.0.1** 才加的（CHANGELOG + PR #50119）→ 选它=弃用 SDK 57 |
| 动作型格位 | ✅ **`disabled`**（`preventNativeSelection: options.disabled`，iOS/Android 同源）；`disabled` 加入于 **56.2.0**，`isPrevented` 语义于 **56.2.10** 补齐 | ✅ 路由级 `options.preventsDefault: true`（官方原文 *"Prevents automatic tab switching"*；UIKit `shouldSelect` 返回 false，但 `onSelect` 仍触发） | — |
| 拦截 press 的 API | ⛔ 无 `onPress`；`tabPress` 的 **`canPreventDefault: false`** → `preventDefault()` 无效；**可见但不可选 = `disabled`** | ⛔ 无 `onPress`；`navigation.addListener('tabPress', e => e.preventDefault())` 官方标注 **iOS 26+ 不推荐** → 应改静态 `preventsDefault` | — |
| 位置 | **主包内** | ⚠️ `preventsDefault` **不在主包**，在 `@bottom-tabs/react-navigation`（要换掉 expo-router 的 tab 容器） | — |
| 图标 | iOS `sf=` · Android **`md=`**（Material Symbols 名，**需 `expo-symbols`**，缺了会静默无图标）· 另有 `drawable=` / `src=` | `tabBarIcon: () => ({ sfSymbol })` 或图片源；**Android 无 Material 名**，需自备 drawable | — |
| 单格隐藏文字 | ✅ `<Trigger.Label hidden />`（iOS 路径已确认把 `options.title` 置空）；Android 另有 per-Trigger `labelVisibilityMode='unlabeled'`（**待真机确认**） | ❌ 只有**导航器级** `labeled: boolean`，**无 per-tab 开关** | — |
| 风险 | `unstable-` 前缀 = API 可能随时改；⚠️ **动态切换 `hidden` 会重挂载导航器并重置 state** | iOS 26+ 切换动画/静态 props 的延迟 issue #383；引入一个第三方**原生依赖**（升级需重建） | — |

**决定**：**(a)**。(b) 只作为"真机第 3/4 条失败"时的 Plan B（记录在案，⛔ 当前不引入）。

---

## 2. 已落地的实现形状

```tsx
// features/navigation/nativeTabs.tsx
<NativeTabs.Trigger
  name="publish"                                   // ⚠️ 必须指向一个存在的路由
  disabled                                          // ← 动作型格位的官方开关
  accessibilityLabel={labels.publish}               // ← 读屏必须读"发布"，不是"加号"（4.9.7）
  listeners={{ tabPress: () => onActionPress() }}   // ← 被挡下时仍会 emit
>
  <NativeTabs.Trigger.Icon sf="plus" md="add" />     {/* md 需 expo-symbols */}
  <NativeTabs.Trigger.Label hidden />                {/* 只有加号无文字（6.3 的显式例外） */}
</NativeTabs.Trigger>
```

**两条由本结论直接推出的结构要求**：
1. **`Trigger` 必须有一个存在的路由名** → 因此有 `app/src/app/(tabs)/publish.tsx`（**只做重定向**的占位路由）。
2. ⚠️ **`disabled` 挡不住深链**（官方注明 JS 侧 `router.push` / `<Link />` 仍能进）→ 上面那条重定向是**必需**的，否则深链 `/publish` 会进死路由并污染返回栈。
3. 真正的发布中心在 `/publish-center`（**与占位路由不是同一个**），发布表单在 `/publish/[type]`。

---

## 3. ⛔ 必须真机才能定的四条（**用 development build，⛔ Expo Go 的 Tab/返回键行为不可信**）

| # | 待验证 | 通过判据 | 失败判据 → 处置 |
|---|---|---|---|
| 1 | 点第 5 格后当前页内容与**底栏选中态** | 完全不变 | 整屏切换 / 选中态跳到第 5 格 |
| 2 | 弹出后按系统返回 / 侧滑 | 关掉发布中心，**落回原 Tab** | 停在第 5 格 |
| 3 | **Android 侧** `disabled` 是否同样拒绝选中并 emit 带 `isPrevented` 的 `tabPress` | 触发；不触发则改试 `screenListeners` | 仍不触发 → 放弃 (a) → 切 Plan B (b) |
| 4 | `<Trigger.Label hidden />` 是否**只**隐藏第 5 格文字（另四格文字仍在） | 其余四格正常 | 一起被隐藏（Material 的 `labelVisibilityMode` 是整条 BottomNavigationView 的属性）→ 改用空标题方案 |

> ⚠️ 若第 3/4 条失败且 Plan B 也不可用 → **降级路径 B**：四格 + 发布 FAB，**必须请所有者重新裁决**（宪法 4.9.9），⛔ **任何情况下不得自绘 Tab 栏**。

---

## 4. 未取到一手来源的部分（**如实标注**）

- `react-native-bottom-tabs` 在 **SDK 57 + New Architecture** 上的稳定性**没有找到官方声明**（第三方包，靠 peer 与 codegen 配置推断）。
- Android 侧 per-Trigger `labelVisibilityMode` 是否按 item 生效：源码只做了取值校验，**未找到"按 item 下发"的证据** → 已列为真机第 4 条。

---

## 5. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-02 | 首次建立。判定"选 (a)，机制 = `disabled`"；三候选 9 项能力实测对比；(c) 在 SDK 57 不存在；4 项真机待办；2 条未取原文 |
