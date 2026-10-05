/**
 * Badge（A08）—— 徽标 / 角标（组件定义 §2.1；**Neo-Brutalism 白名单第 2 类**）
 *
 * 白名单用法（组件定义 §5.2）：`border.strong` **2px** + **硬偏移**（右下加粗描边）+ 高对比色块。
 * ⛔ 只允许出现在角标 / 状态徽标上，**不得**用在卡底 / 正文 / 列表行 / 弹层容器。
 * ⛔ 硬偏移**不是阴影** —— 用 `borderRightWidth/borderBottomWidth` 加粗实现，
 *    因此**不违反**宪法 2.4-3（暗色层级不用阴影）。
 *
 * 文案纪律（组件定义 §5.4）：**数字或 ≤6 汉字**，⛔ 不写句子（"有 3 条新消息哦"）。
 * ⛔ 不提供 `status` 的纯色版：状态徽标**必须同时有图标或文字**（宪法 2.1.1：不得仅靠色块）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { Text } from './Text';

export type BadgeTone = 'danger' | 'brand' | 'accent' | 'success' | 'warning' | 'neutral';

type ToneSpec = {
  fill: DarkColorTokenName;
  /** 填充上的文字令牌：**必须**与该填充的实测承载能力匹配（2.3 逐令牌实测） */
  onFill: DarkColorTokenName;
};

/**
 * 色调 → 填充 / 承载文字。
 * ⚠️ 这三条映射都踩在**实测过的组合**上：
 *   · `action-primary` 载白字 7.41:1（`text-on-fill` 的 minReason 明确只允许它）；
 *   · `action-accent`（美团黄）**只承载深墨**（`text-on-accent`），白字 on 它 1.61:1 是红线；
 *   · `state-*` 填充在暗色下很亮 → 用 `text-on-state`（深墨）。
 */
const TONE: Record<BadgeTone, ToneSpec> = {
  danger: { fill: 'state-danger', onFill: 'text-on-state' },
  success: { fill: 'state-success', onFill: 'text-on-state' },
  warning: { fill: 'state-warning', onFill: 'text-on-state' },
  brand: { fill: 'action-primary', onFill: 'text-on-fill' },
  accent: { fill: 'action-accent', onFill: 'text-on-accent' },
  neutral: { fill: 'bg-raised', onFill: 'text-primary' },
};

export type BadgeProps = {
  /** 角标数字。`>max` 显示 `${max}+`；`0` 或负值**不渲染**（调用方不必自己判） */
  count?: number;
  /** 文案型徽标（≤6 汉字 / 数字）。与 `count` 二选一，`count` 优先 */
  text?: string;
  tone?: BadgeTone;
  /** 数字上限（默认 99） */
  max?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function formatBadgeCount(count: number, max: number): string {
  if (!Number.isFinite(count)) return '';
  return count > max ? `${max}+` : String(count);
}

export function Badge({
  count,
  text,
  tone = 'danger',
  max = 99,
  style,
  testID,
}: BadgeProps): React.ReactElement | null {
  const theme = useTheme();

  const label = typeof count === 'number' ? formatBadgeCount(count, max) : (text ?? '');
  // 空标签 / 0 角标一律不渲染 —— 把"该不该显示"的判断收在这里，页面不必各判一次
  if (label === '' || (typeof count === 'number' && count <= 0)) return null;

  const spec = TONE[tone];
  const offset = theme.borderWidth('border_width_brutal');

  return (
    <View
      testID={testID}
      style={[
        {
          paddingHorizontal: theme.space('space_1'),
          paddingVertical: theme.space('space_1'),
          borderRadius: theme.radius('radius_small'),
          backgroundColor: theme.color[spec.fill].value,
          // 硬偏移（NB 白名单用法）：右下各加粗一次，**不是阴影**
          borderRightWidth: offset,
          borderBottomWidth: offset,
          borderColor: theme.color['border-strong'].value,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text role="caption" emphasis="strong" colorToken={spec.onFill} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
