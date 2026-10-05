/**
 * SearchField（C06）—— 检索输入（组件定义 §2.2）
 *
 * 两种形态：`inline`（页内，随内容滚动）/ `full`（检索页，独占一行、常驻）。
 *
 * 与 `C04 Input` 的分工（§3.3.1）：**C06 只做检索**，不做表单字段 ——
 * 因此它**没有标签**（检索框的语义由图标 + 占位文案表达），也**不做字段级错误**。
 * ⛔ 表格/列表里的"筛选"不是它（那是 `K20 FilterChips`，§3.1 反例清单）。
 */

import * as React from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { Pressable } from './Pressable';

export type SearchFieldAppearance = 'inline' | 'full';

export type SearchFieldProps = {
  value: string;
  onChangeText?: (next: string) => void;
  placeholder?: string;
  appearance?: SearchFieldAppearance;
  /** 提交检索（键盘回车 / 点搜索图标） */
  onSubmit?: () => void;
  /** 清除按钮的读屏标签（默认"清除"） */
  clearLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  appearance = 'inline',
  onSubmit,
  clearLabel = '清除',
  style,
  testID,
}: SearchFieldProps): React.ReactElement {
  const theme = useTheme();
  const hasText = value.length > 0;

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_2'),
          paddingHorizontal: theme.space('space_3'),
          minHeight: theme.touchTarget,
          backgroundColor: theme.color['bg-sunken'].value,
          borderRadius: theme.radius('radius_full'),
        },
        appearance === 'full' ? { alignSelf: 'stretch' } : null,
        style,
      ]}
    >
      {/* 装饰性图标：不给 label → 不进无障碍树（A06 的 a11y 二选一） */}
      <Icon source={Search} size="body" tint="secondary" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color['text-muted'].value}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        allowFontScaling
        accessibilityLabel={placeholder ?? '搜索'}
        accessibilityRole="search"
        style={{ flex: 1, color: theme.color['text-primary'].value }}
      />
      {hasText ? (
        <Pressable
          onPress={() => onChangeText?.('')}
          accessibilityLabel={clearLabel}
          testID={testID ? `${testID}-clear` : undefined}
        >
          <Icon source={X} size="body" tint="secondary" />
        </Pressable>
      ) : null}
    </View>
  );
}
