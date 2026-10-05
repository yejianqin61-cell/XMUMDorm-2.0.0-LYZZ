/**
 * Switch（C12）—— 即时生效的布尔（组件定义 §2.2）
 *
 * 与 `C10 Checkbox` 的分工（§3.1 的精神）：**勾选是"稍后提交"，开关是"立刻生效"**。
 * 因此本组件**没有 `onSubmit` 语义** —— `onValueChange` 触发即生效，
 * ⛔ 不要用它做表单里的"是否同意"（那是 `C10`）。
 *
 * a11y（§7.3）：`role=switch` + `checked`；**开关文案即 label**（左侧文字与开关是同一件事）。
 * 实现用平台原语 `Switch`（⛔ 不自绘 —— 自绘会丢掉系统的手势与触感），
 * 颜色**只给令牌**：轨道/滑块色按平台 API 传语义令牌值。
 */

import * as React from 'react';
import { Switch as RNSwitch, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Text } from './Text';

export type SwitchProps = {
  label: string;
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  /** 副说明（≤30 汉字，§3.6）；⛔ 不写"说明性旁白" */
  hint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Switch({
  label,
  value,
  onValueChange,
  disabled = false,
  hint,
  style,
  testID,
}: SwitchProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space('space_3'),
          minHeight: theme.touchTarget,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: theme.space('space_1') }}>
        <Text role="body" colorToken={disabled ? 'text-disabled' : 'text-primary'}>
          {label}
        </Text>
        {hint ? (
          <Text role="caption" colorToken="text-muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <RNSwitch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        trackColor={{
          false: theme.color['bg-sunken'].value,
          true: theme.color['action-primary'].value,
        }}
        thumbColor={theme.color['bg-surface'].value}
      />
    </View>
  );
}
