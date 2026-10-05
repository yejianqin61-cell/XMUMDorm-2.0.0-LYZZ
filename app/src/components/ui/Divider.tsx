/**
 * Divider（A05）—— 分隔线（组件定义 §2.1；Discord 社区感的"分组"手段）
 *
 * 三种形态：
 *   - `subtle`（默认）：`border-subtle` 1px，列表行之间；
 *   - `strong`：`border-strong` **2px**，分区之间（Neo-Brutalism 的白名单用法之一）；
 *   - `inset`：`subtle` + 左侧内缩——用于"左侧有头像/图标"的列表，让线不与图标打架。
 *
 * ⛔ 分隔线是**独立的语义元素**，不是"加个 border" —— 常量规范里 `border-subtle` 与
 *    `bg-surface` 的对比度不足以承载"可见的分隔"，所以这里统一走 `Divider`，
 *    避免各处自己写 `borderBottomWidth` 写出不同粗细（宪法 1.4）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { SpaceKey } from '@/design-system/px';

export type DividerVariant = 'subtle' | 'strong' | 'inset';

export type DividerProps = {
  variant?: DividerVariant;
  /** 垂直分隔线（`row` 布局内的竖线）；默认水平 */
  vertical?: boolean;
  /** 内缩量（默认 `space_4`，与列表行左内边距对齐） */
  inset?: SpaceKey;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Divider({
  variant = 'subtle',
  vertical = false,
  inset = 'space_4',
  style,
  testID,
}: DividerProps): React.ReactElement {
  const theme = useTheme();
  const isStrong = variant === 'strong';
  const thickness = theme.borderWidth(
    isStrong ? 'border_width_brutal' : 'border_width_hairline'
  );
  const insetValue = variant === 'inset' ? theme.space(inset) : 0;

  // ⚠️ 令牌表达式**就写在 `backgroundColor` 右边**（不先赋给局部变量）：
  //    这样"底色只能来自令牌"的源码扫描能直接判定，⛔ 不留"看起来像裸色"的写法。
  //    代价是两处重复，换来的是这条宪法级规则**可被机器检查**。
  const lineStyle: ViewStyle = vertical
    ? {
        width: thickness,
        alignSelf: 'stretch',
        backgroundColor: isStrong
          ? theme.color['border-strong'].value
          : theme.color['border-subtle'].value,
      }
    : {
        height: thickness,
        alignSelf: 'stretch',
        backgroundColor: isStrong
          ? theme.color['border-strong'].value
          : theme.color['border-subtle'].value,
        marginLeft: insetValue,
      };

  return <View testID={testID} style={[lineStyle, style]} />;
}
