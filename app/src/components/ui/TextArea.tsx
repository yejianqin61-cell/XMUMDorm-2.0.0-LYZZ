/**
 * TextArea（C05）—— 多行文本字段 + **own 字数计数器**（组件定义 §2.2 / §3.3.2）
 *
 * ⛔ **不得为计数器另建 `CharCounter`** —— 它是本组件的 `counter` 能力（§3.3.1 明令）。
 *
 * 计数器三条规则（§3.3.2）：
 *   1. 显示 `当前/上限`；
 *   2. **接近上限（≥90%）转警告色 + 警告图标** —— 宪法 2.1.1：⛔ 警告不得仅靠色块；
 *   3. **超限禁止输入**（`maxLength` 硬截），⛔ 不是事后报错。
 *
 * ⛔ 上限由**页面注入**（万能墙 60/300/1000、指南 800、课评 3000、私信 1200 都是页面的事，§3.2.2-③）。
 */

import * as React from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { inputAccessibilityLabel } from './Input';
import { Text } from './Text';

export type CounterState = 'normal' | 'near' | 'over';

/** 计数器状态（纯函数，供测试与渲染共用） */
export function counterState(length: number, max: number | undefined): CounterState {
  if (typeof max !== 'number' || max <= 0) return 'normal';
  if (length > max) return 'over';
  return length / max >= 0.9 ? 'near' : 'normal';
}

/** 计数器文案（`当前/上限`；无上限时只报当前） */
export function counterLabel(length: number, max: number | undefined): string {
  return typeof max === 'number' && max > 0 ? `${length}/${max}` : String(length);
}

export type TextAreaProps = {
  value: string;
  onChangeText?: (next: string) => void;
  label: string;
  placeholder?: string;
  /** 自动增高（2–8 行）或固定高度 */
  grow?: 'auto' | 'fixed';
  /** 是否显示计数器 */
  counter?: boolean;
  maxLength?: number;
  errorText?: string;
  required?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** 自动增高的行数上下限（§2.2：2–8 行）——行数不是"尺寸"，是**文本行**的语义上限 */
const AUTO_GROW_MIN_ROWS = 2;
const AUTO_GROW_MAX_ROWS = 8;

export function TextArea({
  value,
  onChangeText,
  label,
  placeholder,
  grow = 'auto',
  counter = false,
  maxLength,
  errorText,
  required = false,
  disabled = false,
  onBlur,
  style,
  testID,
}: TextAreaProps): React.ReactElement {
  const theme = useTheme();
  const hasError = typeof errorText === 'string' && errorText.length > 0;
  const state = counterState(value.length, maxLength);
  // 与 C04 共用同一个标签构造器：错误文案必须**是 label 的一部分**（§7.3）
  const a11yLabel = inputAccessibilityLabel(label, {
    required,
    errorText: hasError ? errorText : undefined,
  });

  return (
    <View style={[{ gap: theme.space('space_1') }, style]}>
      <Text role="label" colorToken={disabled ? 'text-disabled' : 'text-secondary'}>
        {required ? `${label} *` : label}
      </Text>
      <View
        style={{
          backgroundColor: theme.color['bg-sunken'].value,
          borderRadius: theme.radius('radius_medium'),
          borderWidth: theme.borderWidth('border_width_hairline'),
          borderColor: theme.color[hasError ? 'state-danger' : 'border-subtle'].value,
          paddingHorizontal: theme.space('space_3'),
          paddingVertical: theme.space('space_2'),
        }}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={theme.color['text-muted'].value}
          multiline
          numberOfLines={grow === 'auto' ? AUTO_GROW_MAX_ROWS : AUTO_GROW_MIN_ROWS}
          maxLength={maxLength}
          onBlur={onBlur}
          allowFontScaling
          accessibilityLabel={counter ? `${a11yLabel}，${counterLabel(value.length, maxLength)}` : a11yLabel}
          accessibilityState={{ disabled }}
          style={{ color: theme.color['text-primary'].value, minHeight: theme.space('space_12') }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          {hasError ? (
            <Text role="caption" colorToken="text-danger">
              {errorText}
            </Text>
          ) : null}
        </View>
        {counter ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}>
            {/* 2.1.1：警告**必须同时有图标与文案** —— 用第 1 层图标，
                ⛔ 不用 ⚠ 这类文本字符（既不是我们的图标体系，也擦边"Emoji 图标"红线） */}
            {state === 'normal' ? null : (
              <Icon
                source={TriangleAlert}
                size="inline"
                tint={state === 'over' ? 'danger' : 'warning'}
                testID={testID ? `${testID}-counter-warning` : undefined}
              />
            )}
            <Text
              role="caption"
              colorToken={
                state === 'over'
                  ? 'text-danger'
                  : state === 'near'
                    ? 'text-warning'
                    : 'text-muted'
              }
            >
              {counterLabel(value.length, maxLength)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
