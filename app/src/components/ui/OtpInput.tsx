/**
 * OtpInput（C19）—— 定长验证码输入（组件定义 §2.2）
 *
 * 实现选择（重要）：**一个真实输入框 + 一排展示格**，而不是"每格一个输入框"。
 * 理由：
 *   - **粘贴**（§2.2 明确要求支持）在"一格一框"下要写一堆焦点搬运，且各家键盘行为不一致；
 *   - 系统短信/验证码自动填充只认**单个 `textContentType="oneTimeCode"` 的输入框**；
 *   - a11y 更简单：读屏只需要读**一个** textbox，而不是 6 个。
 * 展示格是**装饰**（隐藏出无障碍树），真值只由那个输入框承载。
 *
 * ⛔ 只允许数字（`number-pad` + 过滤非数字），且**超长直接截断**（不是事后报错）。
 */

import * as React from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Text } from './Text';

export type OtpLength = 4 | 6;

/** 只留数字并截到定长（纯函数，供测试与 onChange 共用） */
export function normalizeOtp(raw: string, length: OtpLength): string {
  return raw.replace(/\D/g, '').slice(0, length);
}

/** a11y 播报文案（§7.3：位数与"已输入 n 位"可播报） */
export function otpAnnouncement(label: string, value: string, length: OtpLength): string {
  return `${label}，${length} 位，已输入 ${value.length} 位`;
}

export type OtpInputProps = {
  label: string;
  value: string;
  onChangeText?: (next: string) => void;
  length?: OtpLength;
  errorText?: string;
  disabled?: boolean;
  /** 自动填充提示（iOS 短信验证码） */
  autoComplete?: 'one-time-code' | 'off';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function OtpInput({
  label,
  value,
  onChangeText,
  length = 6,
  errorText,
  disabled = false,
  autoComplete = 'one-time-code',
  style,
  testID,
}: OtpInputProps): React.ReactElement {
  const theme = useTheme();
  const hasError = typeof errorText === 'string' && errorText.length > 0;
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  return (
    <View style={[{ gap: theme.space('space_2') }, style]}>
      <Text role="label" colorToken={disabled ? 'text-disabled' : 'text-secondary'}>
        {label}
      </Text>

      <View style={{ flexDirection: 'row', gap: theme.space('space_2') }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {digits.map((digit, index) => (
          <View
            // 展示格是位置固定的装饰，index 作为 key 在这里是稳定的
            key={`otp-slot-${index}`}
            style={{
              flex: 1,
              minHeight: theme.space('space_12'),
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius('radius_medium'),
              borderWidth: theme.borderWidth('border_width_hairline'),
              borderColor: theme.color[
                hasError ? 'state-danger' : digit === '' ? 'border-subtle' : 'border-strong'
              ].value,
              backgroundColor: theme.color['bg-sunken'].value,
            }}
          >
            <Text role="title" colorToken="text-primary">
              {digit}
            </Text>
          </View>
        ))}
      </View>

      {/* 真实输入框：透明覆盖在展示格之上，负责键盘/粘贴/自动填充与 a11y */}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={(raw) => onChangeText?.(normalizeOtp(raw, length))}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        textContentType={autoComplete === 'one-time-code' ? 'oneTimeCode' : 'none'}
        autoComplete={autoComplete === 'one-time-code' ? 'sms-otp' : 'off'}
        allowFontScaling
        accessibilityLabel={
          hasError ? `${otpAnnouncement(label, value, length)}，${errorText}` : otpAnnouncement(label, value, length)
        }
        accessibilityState={{ disabled }}
        style={{
          // 视觉为 0 高度（值由上面的展示格呈现），但仍可聚焦与输入
          height: theme.space('space_1'),
          opacity: 0,
          color: theme.color['text-primary'].value,
        }}
      />

      {hasError ? (
        <Text role="caption" colorToken="text-danger">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
