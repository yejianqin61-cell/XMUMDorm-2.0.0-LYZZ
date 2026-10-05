/**
 * MultiSelect（C09）—— 多值选择 + **已选回显**（组件定义 §2.2 / §3.1）
 *
 * §3.1 的反例写得很直白：**❌ 复选后不给回显**。所以本组件的默认形态就是
 * "选项列表 + 已选 chips 回显"，`display` 只是决定回显放在哪。
 *
 * 形态：`inline`（≤7 项，就地列表）· `sheet`（>7 项）· `chips`（只回显已选，配合外部触发器）。
 * ⚠️ 与 `C07 Select` 同一条现状：**`sheet` 的容器是 `O07 PickerSheet`，尚未落地**。
 *    本版把 `sheet` 也按**就地列表**渲染（⛔ 不自绘浮层），`O07` 落地后换内部呈现即可。
 *
 * ⛔ 上限（`max`）由**页面注入**（P-05 的分类与宿舍区各有自己的限额，§3.2.2-③）；
 *    达到上限后**未选项变为不可选**（而不是事后报错）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Check from 'lucide-react-native/icons/check';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type MultiSelectOption = { value: string; label: string };
export type MultiSelectDisplay = 'inline' | 'sheet' | 'chips';

/** 某个选项此刻是否可点（纯函数，供测试）：已选的一直可点（用来取消） */
export function isOptionEnabled(
  selected: readonly string[],
  optionValue: string,
  max: number | undefined
): boolean {
  if (selected.includes(optionValue)) return true;
  if (typeof max !== 'number' || max <= 0) return true;
  return selected.length < max;
}

export type MultiSelectProps = {
  label: string;
  options: readonly MultiSelectOption[];
  value: readonly string[];
  onChange?: (next: string[]) => void;
  display?: MultiSelectDisplay;
  /** 最多可选几项（页面注入） */
  max?: number;
  errorText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  display = 'inline',
  max,
  errorText,
  disabled = false,
  style,
  testID,
}: MultiSelectProps): React.ReactElement {
  const theme = useTheme();
  const hasError = typeof errorText === 'string' && errorText.length > 0;
  const selectedOptions = options.filter((option) => value.includes(option.value));

  const toggle = (optionValue: string): void => {
    if (!isOptionEnabled(value, optionValue, max)) return;
    onChange?.(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue]
    );
  };

  return (
    <View style={[{ gap: theme.space('space_2') }, style]}>
      <Text role="label" colorToken={disabled ? 'text-disabled' : 'text-secondary'}>
        {label}
      </Text>

      {/* 已选回显：`chips` 形态只渲染这一段；其余形态上下都有 */}
      {selectedOptions.length > 0 ? (
        <View
          testID={testID ? `${testID}-selected` : undefined}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}
        >
          {selectedOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={disabled ? undefined : () => toggle(option.value)}
              disabled={disabled}
              accessibilityRole="button"
              // §7.3：已选 chip **可单独删除并播报**
              accessibilityLabel={`移除${option.label}`}
              style={{
                paddingHorizontal: theme.space('space_3'),
                borderRadius: theme.radius('radius_full'),
                backgroundColor: theme.color['bg-brand-soft'].value,
              }}
            >
              <Text role="label" colorToken="text-brand">
                {`${option.label} ×`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {display === 'chips' ? null : (
        <View
          style={{
            borderRadius: theme.radius('radius_medium'),
            borderWidth: theme.borderWidth('border_width_hairline'),
            borderColor: theme.color[hasError ? 'state-danger' : 'border-subtle'].value,
            backgroundColor: theme.color['bg-surface'].value,
            overflow: 'hidden',
          }}
        >
          {options.map((option) => {
            const isSelected = value.includes(option.value);
            const enabled = !disabled && isOptionEnabled(value, option.value, max);
            return (
              <Pressable
                key={option.value}
                testID={testID ? `${testID}-option-${option.value}` : undefined}
                onPress={enabled ? () => toggle(option.value) : undefined}
                disabled={!enabled}
                accessibilityRole="checkbox"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: isSelected, disabled: !enabled }}
                style={{
                  minHeight: theme.touchTarget,
                  paddingHorizontal: theme.space('space_3'),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text role="body" colorToken={enabled ? 'text-primary' : 'text-disabled'}>
                  {option.label}
                </Text>
                {/* 勾选态**不得只靠颜色**：选中给图标，未选则什么都不给（差异不是颜色） */}
                {isSelected ? <Icon source={Check} size="body" tint="brand" /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {hasError ? (
        <Text role="caption" colorToken="text-danger">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
