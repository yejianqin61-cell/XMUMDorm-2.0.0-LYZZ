/**
 * 底栏配置 —— **五格的唯一定义处**（宪法 4.1 / 4.9）
 *
 * 为什么把"配置"和"渲染"分开：
 * - 五格是**冻结的骨架**（宪法 15.4），必须只有一处定义，任何第二处硬编码都视为返工；
 * - 动作型格位的语义（点了**不切页**）是纯逻辑，可以脱离原生容器单测 —— 这正好绕开
 *   "原生 Tabs 在 Jest 里跑不起来"的问题，使**行为**仍然可验。
 *
 * ⛔ 三条红线：
 *   1. **第六格禁令**（4.9.4）：底栏上限 5 格，五格已用满；
 *   2. **不得自绘 Tab 栏**（4.3）：本文件不产生任何视觉，图标是**平台图标名**；
 *   3. **发布入口唯一**（4.9.3）：第 5 格是唯一入口，⛔ 不得另加 FAB。
 */

import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { MessageKey } from '@/i18n';

export type TabKey = 'square' | 'tools' | 'campus' | 'me' | 'publish';

/**
 * 平台原生图标名（第 2 层；⛔ 不是 Lucide 组件，宪法 16.1 / 4.9.6）。
 * ⚠️ **类型即校验**：`AndroidSymbol` / `SFSymbol` 是穷举联合 → 图标名写错是**编译期错误**，
 *    不会像字符串那样静默变成空白图标。
 * ⚠️ SF Symbol 名仍属【提案】（须用 Apple SF Symbols app 核对，TODO TD-34）；
 *    Android / Material Symbols 名已核实存在（宪法 16.6-3）。
 */
export type PlatformIcon = {
  android: AndroidSymbol;
  ios: SFSymbol;
};

export type TabDefinition = {
  key: TabKey;
  /** expo-router 的 Trigger name（= `src/app/(tabs)/` 下的文件名） */
  route: string;
  /** 深链 path 段（宪法 4.8.2：二级 Tab 可深链，一级亦须稳定） */
  path: string;
  titleKey: MessageKey;
  /** 读屏标签（第 5 格必须读"发布"，⛔ 不是"加号"，宪法 4.9.7） */
  a11yLabelKey: MessageKey;
  icon: PlatformIcon;
  /** 动作型格位：没有内容区、不参与选中态、不进返回栈（4.9.1） */
  isAction: boolean;
  /** 是否绘制可见文字标签（第 5 格 = false，登记为 6.3 的显式例外） */
  labelVisible: boolean;
};

/**
 * 五格（顺序即底栏从左到右的顺序）。
 * 四个导航格的 Material Symbols 名已逐个核实存在（宪法 16.6-3）；**SF Symbol 名仍属【提案】**。
 */
export const TAB_DEFINITIONS: readonly TabDefinition[] = [
  {
    key: 'square',
    route: 'index',
    path: '/',
    titleKey: 'tab.square',
    a11yLabelKey: 'tab.square',
    icon: { android: 'grid_view', ios: 'square.grid.2x2' },
    isAction: false,
    labelVisible: true,
  },
  {
    key: 'tools',
    route: 'tools',
    path: '/tools',
    titleKey: 'tab.tools',
    a11yLabelKey: 'tab.tools',
    icon: { android: 'handyman', ios: 'wrench.and.screwdriver' },
    isAction: false,
    labelVisible: true,
  },
  {
    key: 'campus',
    route: 'campus',
    path: '/campus',
    titleKey: 'tab.campus',
    a11yLabelKey: 'tab.campus',
    icon: { android: 'forum', ios: 'bubble.left.and.bubble.right' },
    isAction: false,
    labelVisible: true,
  },
  {
    key: 'me',
    route: 'me',
    path: '/me',
    titleKey: 'tab.me',
    a11yLabelKey: 'tab.me',
    icon: { android: 'person', ios: 'person.crop.circle' },
    isAction: false,
    labelVisible: true,
  },
  {
    key: 'publish',
    // ⚠️ 原生 Tabs 的 Trigger **必须**有一个存在的路由名 → 这个路由只做重定向，
    //    真正的发布中心在 `src/app/publish-center.tsx`（见 nativeTabs.tsx 注释）
    route: 'publish',
    path: '/publish',
    titleKey: 'tab.publish',
    a11yLabelKey: 'tab.publish',
    icon: { android: 'add', ios: 'plus' },
    isAction: true,
    labelVisible: false,
  },
];

/** 第 5 格的 key（多处判断要一致，避免散落的字面量） */
export const ACTION_TAB_KEY: TabKey = 'publish';

/** 发布中心的真实路由（⛔ 与占位路由 `(tabs)/publish` 不是同一个） */
export const PUBLISH_CENTER_ROUTE = '/publish-center';
export const MAILBOX_ROUTE = '/mailbox';

/** 底栏高度（不含 insets）—— 【提案】，须真机校准；S5 靠它而不是靠 insets.bottom */
export const TAB_BAR_HEIGHT = 56;

/**
 * 格子数量守卫（**机器可判的第六格禁令**）。
 * ⛔ 不要通过"改这个数"来加格：4.9.4 是硬上限。
 */
export const MAX_TAB_SLOTS = 5;

export function getTabDefinition(key: TabKey): TabDefinition | undefined {
  return TAB_DEFINITIONS.find((tab) => tab.key === key);
}

/** 按深链 path 找一级格（深链进来时用于校正栈底，宪法 4.4.1） */
export function getTabByPath(path: string): TabDefinition | undefined {
  return TAB_DEFINITIONS.find((tab) => tab.path === path);
}

export function assertTabBarInvariants(): void {
  if (TAB_DEFINITIONS.length > MAX_TAB_SLOTS) {
    throw new Error(`底栏格数 ${TAB_DEFINITIONS.length} 超过硬上限 ${MAX_TAB_SLOTS}（宪法 4.9.4 第六格禁令）`);
  }
  const actions = TAB_DEFINITIONS.filter((tab) => tab.isAction);
  if (actions.length !== 1) {
    throw new Error(`动作型格位必须恰好 1 个，当前 ${actions.length} 个`);
  }
  if (actions[0].labelVisible) {
    throw new Error('第 5 格不得有可见文字标签（骨架规范 §2.4 的例外）');
  }
  if (TAB_DEFINITIONS.some((tab) => !tab.isAction && !tab.labelVisible)) {
    throw new Error('只有第 5 格可以没有文字标签；四个导航格必须显示标签');
  }
}

export type PublishSlotMode = 'action' | 'fab';

export type TabBarConfig = {
  slots: readonly TabDefinition[];
  /** 降级路径 B 的 FAB 是否出现（默认 false：入口唯一，宪法 4.9.3） */
  fabVisible: boolean;
  tabBarHeight: number;
};

/**
 * 按 R2 结论构造底栏配置。
 * - `action`（首选）：第 5 格是动作型格位（`disabled` + `tabPress`，见 nativeTabs.tsx）
 * - `fab`（**降级路径 B**，仅当 R2 判定原生容器做不到时启用）：回到四格 + 发布 FAB
 *   → ⛔ 必须请所有者重新裁决（宪法 4.9.9），不得自行切换
 */
export function buildTabBarConfig(mode: PublishSlotMode): TabBarConfig {
  if (mode === 'action') {
    return { slots: TAB_DEFINITIONS, fabVisible: false, tabBarHeight: TAB_BAR_HEIGHT };
  }
  return {
    slots: TAB_DEFINITIONS.filter((tab) => !tab.isAction),
    fabVisible: true,
    tabBarHeight: TAB_BAR_HEIGHT,
  };
}

export type TabPressIntent =
  | { type: 'navigate'; tab: TabKey; switchTab: true }
  | { type: 'openPublish'; tab: TabKey; switchTab: false };

/**
 * 点击某格的**语义**（纯逻辑）：这是"动作型格位"最核心的一条 ——
 * 点第 5 格**不切换 Tab**，只打开发布中心（宪法 4.9.2）。
 */
export function resolveTabPress(key: TabKey): TabPressIntent {
  const tab = getTabDefinition(key);
  if (tab?.isAction) {
    return { type: 'openPublish', tab: key, switchTab: false };
  }
  return { type: 'navigate', tab: key, switchTab: true };
}
