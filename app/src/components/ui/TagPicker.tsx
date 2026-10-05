/**
 * TagPicker（C21）—— 标签输入：**枚举与自由文本是同一个组件的两个 `source` 形态**
 * （组件定义 §2.2 / §9.14-①）
 *
 * 为什么不拆成两个组件：`enum` 与 `free` 的差别**只是选项来源与校验规则**，
 * 而输入方式、chips 回显、`max` / `maxLength`、删除叉、a11y **全部相同**
 * —— 拆开就是"同语义多层"（9.14-① 明令只留一层）。
 *
 * ⛔ 限额由**页面注入**（P-02 帖子标签 ≤3；P-05 二手 ≤10 × ≤20 字；P-09 课评白名单 ≤8，§3.2.2-③）。
 * a11y（§7.3）：`textbox` + 已选 chip **可单独删除并播报**（标签是"移除标签 X"）。
 */

import * as React from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type TagSource = 'enum' | 'free';

/** 去空白 + 截到单标签上限（纯函数） */
export function normalizeTag(raw: string, maxLength: number | undefined): string {
  const trimmed = raw.trim();
  return typeof maxLength === 'number' && maxLength > 0 ? trimmed.slice(0, maxLength) : trimmed;
}

/** 还能不能再加（达到 `max` 就停手，⛔ 不是事后报错） */
export function canAddTag(value: readonly string[], max: number | undefined): boolean {
  if (typeof max !== 'number' || max <= 0) return true;
  return value.length < max;
}

/** 是否重复（重复不报错，静默忽略 —— 重复添加不是用户的"错误"） */
export function isDuplicateTag(value: readonly string[], candidate: string): boolean {
  return value.includes(candidate);
}

export type TagPickerProps = {
  label: string;
  value: readonly string[];
  onChange?: (next: string[]) => void;
  source?: TagSource;
  /** `enum` 形态的白名单（⛔ 必须来自 `shared/constants/*`，不得在 App 内复制枚举，§3.2.2-①） */
  options?: readonly string[];
  max?: number;
  maxLength?: number;
  placeholder?: string;
  errorText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function TagPicker({
  label,
  value,
  onChange,
  source = 'free',
  options = [],
  max,
  maxLength,
  placeholder,
  errorText,
  disabled = false,
  style,
  testID,
}: TagPickerProps): React.ReactElement {
  const theme = useTheme();
  const [draft, setDraft] = React.useState('');
  const hasError = typeof errorText === 'string' && errorText.length > 0;
  const atMax = !canAddTag(value, max);

  const add = (raw: string): void => {
    const tag = normalizeTag(raw, maxLength);
    if (tag === '' || atMax || isDuplicateTag(value, tag)) return;
    onChange?.([...value, tag]);
    setDraft('');
  };

  const remove = (tag: string): void => {
    onChange?.(value.filter((item) => item !== tag));
  };

  const remaining = source === 'enum' ? options.filter((option) => !value.includes(option)) : [];

  return (
    <View style={[{ gap: theme.space('space_2') }, style]}>
      <Text role="label" colorToken={disabled ? 'text-disabled' : 'text-secondary'}>
        {label}
      </Text>

      {/* 已选回显：chips + 可单独删除（a11y 标签是"移除标签 X"） */}
      {value.length > 0 ? (
        <View
          testID={testID ? `${testID}-selected` : undefined}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}
        >
          {value.map((tag) => (
            <Pressable
              key={tag}
              testID={testID ? `${testID}-remove-${tag}` : undefined}
              onPress={disabled ? undefined : () => remove(tag)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`移除标签 ${tag}`}
              style={{
                paddingHorizontal: theme.space('space_3'),
                borderRadius: theme.radius('radius_full'),
                backgroundColor: theme.color['bg-brand-soft'].value,
              }}
            >
              <Text role="label" colorToken="text-brand">
                {`${tag} ×`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* `enum`：白名单里还没选的，点一下加入 */}
      {source === 'enum' && !atMax
        ? remaining.map((option) => (
            <Pressable
              key={option}
              onPress={disabled ? undefined : () => add(option)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={option}
              style={{ minHeight: theme.touchTarget }}
            >
              <Text role="body" colorToken="text-secondary">
                {`+ ${option}`}
              </Text>
            </Pressable>
          ))
        : null}

      {/* `free`：自由输入（回车加入） */}
      {source === 'free' ? (
        <TextInput
          testID={testID}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => add(draft)}
          editable={!disabled && !atMax}
          placeholder={atMax ? undefined : placeholder}
          placeholderTextColor={theme.color['text-muted'].value}
          maxLength={maxLength}
          allowFontScaling
          returnKeyType="done"
          blurOnSubmit={false}
          accessibilityLabel={hasError ? `${label}，${errorText}` : label}
          accessibilityState={{ disabled: disabled || atMax }}
          style={{
            minHeight: theme.touchTarget,
            paddingHorizontal: theme.space('space_3'),
            borderRadius: theme.radius('radius_medium'),
            borderWidth: theme.borderWidth('border_width_hairline'),
            borderColor: theme.color[hasError ? 'state-danger' : 'border-subtle'].value,
            backgroundColor: theme.color['bg-sunken'].value,
            color: theme.color[disabled || atMax ? 'text-disabled' : 'text-primary'].value,
          }}
        />
      ) : null}

      {hasError ? (
        <Text role="caption" colorToken="text-danger">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
