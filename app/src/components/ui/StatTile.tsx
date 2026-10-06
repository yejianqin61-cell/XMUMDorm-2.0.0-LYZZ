/**
 * StatTile（`K09`）—— 指标格：数字 + 标签 + 可选图标（组件定义 §2.3）
 *
 * 三条纪律：
 *   1. **`0` 要显示**：它和"拿不到"是两件事 —— 拿不到才走 `placeholder`（⛔ 不显示 `NaN`）；
 *   2. **图标不得承担唯一语义**（16.2-4）：图标必须有，标签也必须有；
 *   3. 组件内 **0 文案**：标签与占位都由页面给词条。
 *
 * ⛔ 视觉只来自令牌（`theme.*`）；⛔ 不写 `#hex` / `fontSize:` 数字（尺子会拦）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

export type StatTileVariant = 'sm' | 'md';

export type StatTileProps = {
  /** 数值。`null`/`undefined` = **拿不到**（走 `placeholder`）；`0` 是有效值 */
  value: string | number | null | undefined;
  label: string;
  /** `value` 拿不到时的占位文案（页面给词条）。不给就只显示标签 */
  placeholder?: string;
  icon?: IconComponent;
  variant?: StatTileVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** 数值 → 显示文本（纯规则的一部分，可被用例直接断言） */
export function statTileText(
  value: string | number | null | undefined,
  placeholder?: string
): string {
  if (value === null || value === undefined) return placeholder ?? '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : (placeholder ?? '');
  }
  return value;
}

export function StatTile({
  value,
  label,
  placeholder,
  icon,
  variant = 'sm',
  style,
  testID,
}: StatTileProps): React.ReactElement {
  const theme = useTheme();
  const isMd = variant === 'md';

  return (
    <View
      testID={testID}
      style={[
        {
          flex: 1,
          gap: theme.space('space_1'),
          padding: isMd ? theme.space('space_4') : theme.space('space_3'),
          backgroundColor: theme.color['bg-surface'].value,
          borderRadius: theme.radius('radius_medium'),
          borderWidth: theme.borderWidth('border_width_hairline'),
          borderColor: theme.color['border-subtle'].value,
        },
        style,
      ]}
    >
      {icon ? <Icon source={icon} size={isMd ? 'body' : 'inline'} tint="secondary" /> : null}
      <Text
        role={isMd ? 'title' : 'headline'}
        emphasis="strong"
        colorToken="text-primary"
        numberOfLines={1}
        testID={testID ? `${testID}-value` : undefined}
      >
        {statTileText(value, placeholder)}
      </Text>
      <Text
        role="label"
        colorToken="text-secondary"
        numberOfLines={1}
        testID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
