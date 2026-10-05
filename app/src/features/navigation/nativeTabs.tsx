/**
 * 原生底栏适配层（R2 结论的落地）
 *
 * **选定的路径 (a)：`expo-router/unstable-native-tabs`**（已核实：57 线存在；稳定入口
 * `expo-router/native-tabs` 要等 58 → 选后者等于弃用 SDK 57）。
 *
 * **动作型格位怎么实现（这是 R2 spike 的核心结论）**：
 *   `NativeTabs.Trigger` **没有 `onPress`**，且 `tabPress` 事件的 `canPreventDefault` 为 `false`
 *   → `e.preventDefault()` **无效**。真正能拦住导航的是 `disabled`：
 *   官方描述 *"If `true`, the tab is shown but cannot be selected by tapping it in the tab bar"*，
 *   实现里映射为 `preventNativeSelection`，被挡下时导航器**仍会 emit `tabPress` 并带
 *   `data.isPrevented = true`**，随后**不** dispatch `JUMP_TO` → **选中态与返回栈都不变**。
 *   → 因此：`disabled` + `listeners.tabPress` 回调里打开发布中心 = 骨架规范 §3.2 的六条行为。
 *
 * ⚠️ 仍待真机（必须用 development build，⛔ Expo Go 的 Tab/返回键行为不可信）：
 *   1. Android 侧 `disabled` 是否同样拒绝选中并发 `isPrevented` 事件（若不触发 → 改试 `screenListeners`）；
 *   2. `<NativeTabs.Trigger.Label hidden />` 是否**只**隐藏第 5 格的文字（Material 的
 *      `labelVisibilityMode` 本是整条 BottomNavigationView 的属性）。
 *
 * ⛔ 任何情况下**不得**退回自绘 Tab 栏（宪法 4.3）。
 */

import * as React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import {
  buildTabBarConfig,
  type PublishSlotMode,
  type TabKey,
} from './tabConfig';

/** 事件的 `data.isPrevented` 是"被 disabled 挡下"的信号；类型在 unstable API 里较松，故防御式读取 */
export function readIsPrevented(event: unknown): boolean {
  const data = (event as { data?: { isPrevented?: boolean } } | null)?.data;
  return data?.isPrevented === true;
}

export type NativeTabBarProps = {
  /** `action`（首选）或 `fab`（**降级 B**，须所有者重新裁决后才可切） */
  mode?: PublishSlotMode;
  /** 已取好的词条（⛔ 不在本层取词：取词依赖 Provider，放在布局层更清楚，也便于测试） */
  labels: Record<TabKey, string>;
  /** 第 5 格被点击（已被 `disabled` 拦下导航）→ 打开发布中心 */
  onActionPress: () => void;
};

export function NativeTabBar({
  mode = 'action',
  labels,
  onActionPress,
}: NativeTabBarProps): React.ReactElement {
  const config = buildTabBarConfig(mode);

  return (
    <NativeTabs>
      {config.slots.map((tab) => (
        <NativeTabs.Trigger
          key={tab.key}
          name={tab.route}
          disabled={tab.isAction}
          accessibilityLabel={labels[tab.key]}
          listeners={
            tab.isAction
              ? {
                  tabPress: () => {
                    // 只有动作型格位会走到这里；导航已被 `disabled` 拦下（选中态不变）
                    onActionPress();
                  },
                }
              : undefined
          }
        >
          <NativeTabs.Trigger.Icon sf={tab.icon.ios} md={tab.icon.android} />
          {tab.labelVisible ? (
            <NativeTabs.Trigger.Label>{labels[tab.key]}</NativeTabs.Trigger.Label>
          ) : (
            // 第 5 格：只有加号，**无可见文字标签**（所有者原话："一个加号按钮"）
            // ⚠️ 必须**静态**隐藏：动态切换 `hidden` 会重挂载导航器并重置 state
            <NativeTabs.Trigger.Label hidden />
          )}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
