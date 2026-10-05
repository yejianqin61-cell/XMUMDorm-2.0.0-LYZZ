/**
 * 发布条目的图标映射（**静态**，第 1 层 / Lucide）
 *
 * 为什么要一张静态表：宪法 16.5-1 ⛔ 禁止 barrel 导入，Metro 也需要静态可分析的导入；
 * 因此不能按字符串 `require`。代价是**新增一类发布要动两处**（注册表 + 本表），
 * 所以 `publish` 的测试里有一条断言：**注册表里每个图标名都必须在本表里有对应实现**
 * —— 少一处就会红，不会静默变成空白图标。
 */

import type * as React from 'react';
import Megaphone from 'lucide-react-native/icons/megaphone';
import Ghost from 'lucide-react-native/icons/ghost';
import Users from 'lucide-react-native/icons/users';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Bike from 'lucide-react-native/icons/bike';
import Car from 'lucide-react-native/icons/car';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';

export type PublishIconComponent = React.ComponentType<{ size?: number; color?: string }>;

/** 图标名（注册表里的裸 kebab-case 名）→ 逐图标导入的组件 */
export const PUBLISH_ICONS: Record<string, PublishIconComponent> = {
  megaphone: Megaphone,
  ghost: Ghost,
  users: Users,
  'shopping-bag': ShoppingBag,
  bike: Bike,
  car: Car,
  'circle-question-mark': CircleQuestionMark,
};

export function getPublishIcon(name: string): PublishIconComponent | undefined {
  return PUBLISH_ICONS[name];
}

/** 本表覆盖的图标名（测试用它做覆盖面断言） */
export function publishIconNames(): readonly string[] {
  return Object.keys(PUBLISH_ICONS);
}
