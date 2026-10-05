/**
 * Card（K08）—— 内容卡容器（组件定义 §2.3）
 *
 * ⛔ **Neo-Brutalism 明确不得用于卡底**（§5.2 反例列：卡底/正文/列表行/导航壳/弹层容器/表单控件）。
 *    所以本文件里**没有** 2px 描边 + 硬偏移，也**没有**任何阴影（宪法 2.4-3：
 *    暗色层级由表面色表达）。
 *
 * 变体：`plain`（无描边）· `outlined`（`border-subtle` 细描边）· `interactive`（整卡可点）。
 * `interactive` 用 `A12 Pressable` 包一层，**整卡语义必须是一条**（§7.3 对 `K17` 的同源要求：
 * 不能把卡内 8 个元素都读出来）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { SpaceKey } from '@/design-system/px';
import { Pressable } from './Pressable';
import { Surface } from './Surface';

export type CardVariant = 'plain' | 'outlined' | 'interactive';

export type CardProps = {
  variant?: CardVariant;
  /** 内边距档位（默认 `space_4`；传 `'none'` 由内部自己管） */
  padding?: SpaceKey | 'none';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
};

export function Card({
  variant = 'plain',
  padding = 'space_4',
  onPress,
  accessibilityLabel,
  style,
  children,
  testID,
}: CardProps): React.ReactElement {
  const theme = useTheme();
  const isInteractive = variant === 'interactive';
  const body = (
    <View style={[{ gap: theme.space('space_2') }, padding === 'none' ? null : { padding: theme.space(padding) }]}>
      {children}
    </View>
  );

  if (!isInteractive) {
    return (
      <Surface
        testID={testID}
        rounded="radius_large"
        bordered={variant === 'outlined' ? 'subtle' : 'none'}
        style={style}
      >
        {body}
      </Surface>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[{ borderRadius: theme.radius('radius_large') }, style]}
    >
      <Surface rounded="radius_large" bordered="subtle">
        {body}
      </Surface>
    </Pressable>
  );
}
