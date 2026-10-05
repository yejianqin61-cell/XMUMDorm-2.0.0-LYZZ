/**
 * Input（C04）—— 单行文本字段（组件定义 §2.2 / §3.3.2）
 *
 * 解剖（§3.3.2）：**标签外置**（⛔ 不靠 placeholder 当标签）+ `Surface sunken` 底 +
 * `border.subtle` + 前缀/后缀 + 清除 + **错误就近显示**。
 * 外观变体 `underline`（＝口语里的"带下边框的文本输入框"）是**本组件的一个 prop**，
 * ⛔ 不是独立组件（§3.3.1）。
 *
 * ⛔ 键盘映射只有一处（`keyboardTypeFor`）：`email→email-address`、`number→numeric`、
 *    `tel→phone-pad`、`password` 走 `secureTextEntry`。
 * ⛔ 限额由**页面注入**（`maxLength`），⛔ 不写死在控件里（§3.2.2-③）。
 */

import * as React from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import X from 'lucide-react-native/icons/x';

import { useTheme } from '@/design-system/theme';
import type { BorderWidthKey } from '@/design-system/px';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type InputKind = 'text' | 'number' | 'email' | 'password' | 'tel';
export type InputAppearance = 'boxed' | 'underline';

/** 唯一的键盘映射点（§3.3.2） */
export function keyboardTypeFor(kind: InputKind): KeyboardTypeOptions | undefined {
  switch (kind) {
    case 'email':
      return 'email-address';
    case 'number':
      return 'numeric';
    case 'tel':
      return 'phone-pad';
    default:
      return 'default';
  }
}

/**
 * 输入框的可播报标签（§7.3 要求 `invalid` / `required` 可感知，且"**错误文本是 label 的一部分**"）。
 * ⚠️ RN 的 `AccessibilityState` **没有** `invalid` / `required` 这两个字段，
 *    所以这两件事只能通过 label 表达 —— 这就是本函数存在的理由（⛔ 不是可选的装饰）。
 */
export function inputAccessibilityLabel(
  label: string,
  options: { required?: boolean; errorText?: string } = {}
): string {
  const parts = [label];
  if (options.required) parts.push('必填');
  if (options.errorText) parts.push(options.errorText);
  return parts.join('，');
}

export type InputProps = {
  value: string;
  onChangeText?: (next: string) => void;
  label: string;
  placeholder?: string;
  kind?: InputKind;
  appearance?: InputAppearance;
  /** 前缀 / 后缀（如货币符号、单位）；⛔ 不做成图标库依赖 */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** 字段级错误文案（就近显示，§3.7） */
  errorText?: string;
  maxLength?: number;
  /** 有内容时显示清除按钮（图标为第 1 层 Lucide，逐图标子路径导入） */
  clearable?: boolean;
  /** 清除按钮的读屏标签（默认"清除"） */
  clearLabel?: string;
  required?: boolean;
  disabled?: boolean;
  editable?: boolean;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  kind = 'text',
  appearance = 'boxed',
  prefix,
  suffix,
  errorText,
  maxLength,
  clearable = false,
  clearLabel = '清除',
  required = false,
  disabled = false,
  editable = true,
  onBlur,
  style,
  testID,
}: InputProps): React.ReactElement {
  const theme = useTheme();
  const hasError = typeof errorText === 'string' && errorText.length > 0;
  const isEditable = editable && !disabled;

  const borderWidthKey: BorderWidthKey = hasError
    ? 'border_width_brutal'
    : 'border_width_hairline';
  const borderColorToken = hasError ? 'state-danger' : 'border-subtle';

  return (
    <View style={[{ gap: theme.space('space_1') }, style]}>
      <Text role="label" colorToken={disabled ? 'text-disabled' : 'text-secondary'}>
        {required ? `${label} *` : label}
      </Text>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space('space_2'),
            paddingHorizontal: theme.space('space_3'),
            minHeight: theme.touchTarget,
          },
          appearance === 'boxed'
            ? {
                backgroundColor: theme.color['bg-sunken'].value,
                borderRadius: theme.radius('radius_medium'),
                borderWidth: theme.borderWidth(borderWidthKey),
                borderColor: theme.color[borderColorToken].value,
              }
            : {
                // underline：只保留底边
                borderBottomWidth: theme.borderWidth(borderWidthKey),
                borderBottomColor: theme.color[borderColorToken].value,
              },
        ]}
      >
        {prefix}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={isEditable ? onChangeText : undefined}
          editable={isEditable}
          placeholder={placeholder}
          placeholderTextColor={theme.color['text-muted'].value}
          keyboardType={keyboardTypeFor(kind)}
          secureTextEntry={kind === 'password'}
          maxLength={maxLength}
          onBlur={onBlur}
          // 7.2：允许系统字号放大（⛔ 不关掉 Dynamic Type）
          allowFontScaling
          accessibilityLabel={inputAccessibilityLabel(label, {
            required,
            errorText: hasError ? errorText : undefined,
          })}
          accessibilityState={{ disabled }}
          style={{
            flex: 1,
            color: theme.color[isEditable ? 'text-primary' : 'text-disabled'].value,
          }}
        />
        {suffix}
        {clearable && isEditable && value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText?.('')}
            accessibilityLabel={clearLabel}
            testID={testID ? `${testID}-clear` : undefined}
          >
            <Icon source={X} size="body" tint="secondary" />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <Text role="caption" colorToken="text-danger">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
