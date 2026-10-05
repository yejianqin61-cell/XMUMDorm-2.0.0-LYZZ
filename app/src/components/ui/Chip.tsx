/**
 * Chip（A09）—— 可点 / 可删的小标签（组件定义 §2.1）
 *
 * 变体：`static`（只展示）· `selectable`（可选中的筛选态）· `removable`（带删除叉）。
 *
 * ⚠️ **没有单独的 `filter` 变体**：组件定义把 `filter` 列为第 4 个变体，但"筛选 Chip"
 *    与 `selectable` 的**视觉完全相同**，真正的差别是**语义位置**（导航 Tab ≠ 筛选 Chips，
 *    宪法 4.8.1-R4）—— 那由布局层保证，不需要第二个变体。⛔ 不为同名不同义铺一份重复 API。
 *
 * 两条硬性纪律：
 *   - 删除叉**必须有独立可读标签**（"移除标签 X"），⛔ 不能只叫"删除"（组件定义 §5.4）；
 *   - 删除叉的命中区 ≥44pt/48dp（宪法 7.1）—— 视觉可以小，命中区不行。
 */

import * as React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Text } from './Text';

export type ChipVariant = 'static' | 'selectable' | 'removable';

export type ChipProps = {
  /** 标签文案（≤6 汉字，组件定义 §5.4） */
  label: string;
  variant?: ChipVariant;
  /** 仅 `selectable` 有意义 */
  selected?: boolean;
  onPress?: () => void;
  /** 仅 `removable` 有意义；**必须**给，用来拼可读标签 */
  onRemove?: () => void;
  /** 删除叉的读屏标签里用到的对象名（如标签名）。⛔ 缺省时用 label */
  removeTargetName?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Chip({
  label,
  variant = 'static',
  selected = false,
  onPress,
  onRemove,
  removeTargetName,
  disabled = false,
  style,
  testID,
}: ChipProps): React.ReactElement {
  const theme = useTheme();

  const isInteractive = variant === 'selectable' && !disabled;
  const fillToken = selected && variant === 'selectable' ? 'action-primary' : 'bg-sunken';
  const textToken = selected && variant === 'selectable' ? 'text-on-fill' : 'text-secondary';

  const container: StyleProp<ViewStyle> = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space('space_1'),
      paddingHorizontal: theme.space('space_3'),
      // 命中区下限（7.1）：视觉高度可以更小，但可点区域不得更小
      minHeight: theme.touchTarget,
      borderRadius: theme.radius('radius_full'),
      backgroundColor: theme.color[fillToken].value,
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ];

  const body = (
    <View style={container}>
      <Text role="label" colorToken={textToken} numberOfLines={1}>
        {label}
      </Text>
      {variant === 'removable' ? (
        <Pressable
          testID={testID ? `${testID}-remove` : undefined}
          onPress={disabled ? undefined : onRemove}
          disabled={disabled}
          accessibilityRole="button"
          // ⛔ 不能只读"删除"：必须说清删的是哪一个
          accessibilityLabel={`移除${removeTargetName ?? label}`}
          hitSlop={theme.space('space_2')}
          style={{
            minWidth: theme.touchTarget,
            minHeight: theme.touchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text role="label" colorToken={textToken}>
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!isInteractive) return <View testID={testID}>{body}</View>;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={container}
    >
      <Text role="label" colorToken={textToken} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
