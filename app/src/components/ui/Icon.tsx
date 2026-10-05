/**
 * Icon（A06）—— **两层图标体系第 1 层的唯一出口**（组件定义 §2.1.1；宪法第 16 条）
 *
 * ⛔ 四条硬规则（16.5），本文件是它们的**唯一落点**：
 *   1. **只允许逐图标子路径导入**：调用方写 `import Mail from 'lucide-react-native/icons/mail'`
 *      —— 本组件收的是**已导入的组件**，因此结构上不可能出现 barrel 导入；
 *   2. **描边宽度全局只在 `LucideProvider` 设一次**（根布局取 2）→ 本组件**不暴露**该 prop；
 *      ⛔ 调用点也不得自行传描边宽度（`P0-05` 的源码扫描守着这一条，故本注释不写该标识符）
 *   3. **尺寸只接受档位**：`inline|body|default|large|hero`（令牌 `icon-size-*`），⛔ 不收裸数字；
 *   4. **a11y 二选一由 `label` 强制**：传 → 进无障碍树；不传 → **隐藏出无障碍树**。
 *      ⛔ 不用 `aria-hidden` 当隐藏手段（Lucide 的 `hasA11yProp` 会把任何 `aria-*` 判为"有语义"，
 *      **反而把它暴露给读屏**）。
 *
 * 第 2 层（原生 Tab 栏 / 导航栏项 / 系统菜单）**不是本组件** —— 那些图标以**平台图标名**
 * 交给原生容器（组件定义 §6.1）。
 */

import * as React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { IconSizeKey } from '@/design-system/px';
import type { DarkColorTokenName } from '@/design-system/tokens';

/** Lucide 图标组件的**最小结构**（只声明我们真正传的两个 prop） */
export type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
}>;

export type IconSizeTier = 'inline' | 'body' | 'default' | 'large' | 'hero';

export const ICON_SIZE_TIER: Record<IconSizeTier, IconSizeKey> = {
  inline: 'icon_size_inline',
  body: 'icon_size_body',
  default: 'icon_size_default',
  large: 'icon_size_large',
  hero: 'icon_size_hero',
};

/**
 * 图标语义色。
 * ⚠️ 这里**一律取 `text-*` / `icon-*` 系**（它们经 `textSafe` 或 ≥3:1 的 icon 门），
 *    ⛔ 不取 `state-*` 这类**填充**令牌当描边色 —— 填充令牌的对比度是按"承载文字"验的，
 *    拿来当图标色会让 3:1 这条门失去依据。
 */
export type IconTint =
  | 'primary'
  | 'secondary'
  | 'brand'
  | 'disabled'
  | 'danger'
  | 'success'
  | 'warning'
  | 'onFill';

const TINT_TOKEN: Record<IconTint, DarkColorTokenName> = {
  primary: 'icon-primary',
  secondary: 'icon-secondary',
  brand: 'icon-brand',
  disabled: 'icon-disabled',
  danger: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  onFill: 'text-on-fill',
};

export type IconProps = {
  /** 已逐图标导入的 Lucide 组件（16.5-1） */
  source: IconComponent;
  size?: IconSizeTier;
  tint?: IconTint;
  /** 传 → 进无障碍树并读这个标签；不传 → **隐藏出无障碍树**（16.5-4） */
  label?: string;
  testID?: string;
};

export function Icon({
  source: IconSource,
  size = 'default',
  tint = 'primary',
  label,
  testID,
}: IconProps): React.ReactElement {
  const theme = useTheme();
  const color = theme.color[TINT_TOKEN[tint]].value;
  const px = theme.iconSize(ICON_SIZE_TIER[size]);
  const decorative = label === undefined;

  return (
    <View
      testID={testID}
      // 有 label → 作为一个"图像"进入无障碍树；无 label → 连同子树一起隐藏
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      <IconSource size={px} color={color} />
    </View>
  );
}
