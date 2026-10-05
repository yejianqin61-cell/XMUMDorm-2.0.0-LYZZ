/**
 * SegmentedControl（C14）—— 2–5 项互斥、平级切换（组件定义 §2.2 / §3.1）
 *
 * §3.1 把它放在**选型阶梯的第一格**：2–5 项互斥且需常驻可见 → 用本组件，
 * ⛔ 不要"藏进 `C07 Select`"（多一次点击）。
 *
 * ⛔ **项数上限是硬规则**：>5 项时本组件在 dev 下**报出来**（不静默降级成滑块），
 *    因为超过 5 项的正确出路是换组件（6–7 → `C10` group；>7 → `C07`），而不是挤一挤。
 *
 * ⚠️ 与 `K22 SegmentedTabs` / `TopTabStrip` 的区别：那两个是**页内/页面级导航**；
 *    本组件是**表单控件**（值参与提交）。⛔ 不把它当导航用（4.8.1-R4：导航 Tab ≠ 筛选/控件）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

/** 项数上下限（§2.2：2–5 项） */
export const SEGMENTED_MIN_ITEMS = 2;
export const SEGMENTED_MAX_ITEMS = 5;

export function isSegmentedCountValid(count: number): boolean {
  return count >= SEGMENTED_MIN_ITEMS && count <= SEGMENTED_MAX_ITEMS;
}

export type SegmentedOption = { value: string; label: string; count?: number };

export type SegmentedControlProps = {
  options: readonly SegmentedOption[];
  value: string;
  onChange?: (next: string) => void;
  /** `textWithCount` 形态：标签后带数量（如筛选结果数） */
  withCount?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SegmentedControl({
  options,
  value,
  onChange,
  withCount = false,
  disabled = false,
  style,
  testID,
}: SegmentedControlProps): React.ReactElement {
  const theme = useTheme();

  if (__DEV__ && !isSegmentedCountValid(options.length)) {
    // ⛔ 不静默：超过 5 项的正确出路是换组件（§3.1）
    console.warn(
      `[SegmentedControl] 项数 ${options.length} 超出 ${SEGMENTED_MIN_ITEMS}–${SEGMENTED_MAX_ITEMS}；` +
        '6–7 项请用 C10 Checkbox group，>7 项请用 C07 Select'
    );
  }

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          padding: theme.space('space_1'),
          gap: theme.space('space_1'),
          borderRadius: theme.radius('radius_medium'),
          backgroundColor: theme.color['bg-sunken'].value,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const label = withCount && typeof option.count === 'number'
          ? `${option.label} ${option.count}`
          : option.label;
        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            onPress={disabled ? undefined : () => onChange?.(option.value)}
            disabled={disabled}
            // 互斥选择：`radio` 比 `tab` 准确（后者是导航语义，4.8.1-R4）
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: isSelected, disabled }}
            style={{
              flex: 1,
              minHeight: theme.touchTarget,
              borderRadius: theme.radius('radius_small'),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSelected
                ? theme.color['action-primary'].value
                : undefined,
            }}
          >
            <Text
              role="label"
              emphasis={isSelected ? 'strong' : 'regular'}
              colorToken={isSelected ? 'text-on-fill' : 'text-secondary'}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
