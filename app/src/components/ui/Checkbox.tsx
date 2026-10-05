/**
 * Checkbox（C10）—— 布尔 / 多选（组件定义 §2.2 / §3.1）
 *
 * §3.1 的边界：**6–7 项互斥且在表单内 → 用本组件的 `group` 形态**
 * （⛔ 不要复活已删除的 `C11 RadioGroup`，也不要硬塞进 `C14` 的 2–5 项上限）。
 *
 * a11y（§7.3）：`role=checkbox`，必须暴露 `checked` 与 `checkedState`（`indeterminate` 用后者）；
 * **组内每项 label 独立**，且**整行可点**（不是只有那个小方块可点）。
 * ⛔ 选中态**不得只靠颜色**：勾号本身是符号。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Minus from 'lucide-react-native/icons/minus';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type CheckboxState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * 三态 → RN 的 `accessibilityState.checked`。
 *
 * ⚠️ **与组件定义 §7.3 的差异（如实标注）**：那一行写的是"必须暴露 `checked` 与 `checkedState`"，
 *    但 **`checkedState` 是 `react-native-web` 的写法**（对应 `aria-checked="mixed"`），
 *    **RN 本体没有这个字段** —— 传了会被丢掉，等于**没暴露**（那正是 §7.3 想避免的）。
 *    RN 的正确表达是 **`checked: boolean | 'mixed'`**。这里按 **RN 真实 API** 实现。
 */
export function checkboxAccessibility(state: CheckboxState): {
  checked: boolean | 'mixed';
} {
  if (state === 'indeterminate') return { checked: 'mixed' };
  return { checked: state === 'checked' };
}

export type CheckboxProps = {
  label: string;
  state?: CheckboxState;
  onPress?: () => void;
  disabled?: boolean;
  /** 组标题（`group` 形态用；单用时省略） */
  groupLabel?: string;
  /** 多选组（6–7 项互斥走这里；`state` 由调用方按组算） */
  options?: readonly { value: string; label: string; state: CheckboxState }[];
  onToggleOption?: (value: string) => void;
  errorText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Checkbox({
  label,
  state = 'unchecked',
  onPress,
  disabled = false,
  groupLabel,
  options,
  onToggleOption,
  errorText,
  style,
  testID,
}: CheckboxProps): React.ReactElement {
  const theme = useTheme();
  const hasError = typeof errorText === 'string' && errorText.length > 0;

  const box = (current: CheckboxState): React.ReactElement => (
    <View
      style={{
        width: theme.space('space_6'),
        height: theme.space('space_6'),
        borderRadius: theme.radius('radius_small'),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth('border_width_brutal'),
        borderColor: theme.color['border-strong'].value,
        backgroundColor: theme.color[
          current === 'unchecked' ? 'bg-sunken' : 'action-primary'
        ].value,
      }}
    >
      {/* 图标承担"选中/半选"的表达，⛔ 不只有颜色差 */}
      {current === 'checked' ? (
        <Icon source={Check} size="inline" tint="onFill" />
      ) : current === 'indeterminate' ? (
        <Icon source={Minus} size="inline" tint="onFill" />
      ) : null}
    </View>
  );

  if (options) {
    return (
      <View style={[{ gap: theme.space('space_2') }, style]}>
        {groupLabel ? (
          <Text role="label" colorToken="text-secondary">
            {groupLabel}
          </Text>
        ) : null}
        {options.map((option) => {
          const a11y = checkboxAccessibility(option.state);
          return (
            <Pressable
              key={option.value}
              testID={testID ? `${testID}-${option.value}` : undefined}
              onPress={disabled ? undefined : () => onToggleOption?.(option.value)}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityState={{ ...a11y, disabled }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: theme.space('space_3'),
                minHeight: theme.touchTarget,
              }}
            >
              {box(option.state)}
              <Text role="body" colorToken={disabled ? 'text-disabled' : 'text-primary'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
        {hasError ? (
          <Text role="caption" colorToken="text-danger">
            {errorText}
          </Text>
        ) : null}
      </View>
    );
  }

  const a11y = checkboxAccessibility(state);
  return (
    <View style={[{ gap: theme.space('space_1') }, style]}>
      <Pressable
        testID={testID}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ ...a11y, disabled }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: theme.space('space_3'),
          minHeight: theme.touchTarget,
        }}
      >
        {box(state)}
        <Text role="body" colorToken={disabled ? 'text-disabled' : 'text-primary'}>
          {label}
        </Text>
      </Pressable>
      {hasError ? (
        <Text role="caption" colorToken="text-danger">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
