/**
 * Stack（A03）—— 一维布局原语（组件定义 §2.1）
 *
 * 为什么需要它：宪法 1.4 / 2.4 要求"间距只允许取令牌档位，⛔ 不得屏内写魔法数字"。
 * 有了 `Stack`，页面就不必自己拼 `flexDirection` + `gap`，也就没有机会写 `gap: 12`。
 *
 * ⛔ 本组件**不设底色**（那是 `Surface` 的事，原子层硬规则②）。
 * ⛔ 不提供 `margin` —— 外边距由父级的 `gap` 或 `Spacer` 表达，避免外边距塌陷式的隐式布局。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { SpaceKey } from '@/design-system/px';

export type StackDirection = 'row' | 'column';

/** 交叉轴对齐（`stretch` = 子项拉满，等价于 CSS 的 stretch） */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';

/** 主轴分布 */
export type StackJustify = 'start' | 'center' | 'end' | 'between';

const ALIGN: Record<StackAlign, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY: Record<StackJustify, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

export type StackProps = {
  direction?: StackDirection;
  /** 子项间距档位（⛔ 不收数字 —— 那正是本组件要消灭的写法） */
  gap?: SpaceKey;
  align?: StackAlign;
  justify?: StackJustify;
  /** 是否占满可用空间（`flex: 1`）；默认 false，由调用方决定 */
  flex?: boolean;
  /** 换行（仅 `row` 有意义） */
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
};

export function Stack({
  direction = 'column',
  gap,
  align = 'stretch',
  justify = 'start',
  flex = false,
  wrap = false,
  style,
  children,
  testID,
}: StackProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: direction,
          alignItems: ALIGN[align],
          justifyContent: JUSTIFY[justify],
        },
        flex ? { flex: 1 } : null,
        wrap ? { flexWrap: 'wrap' } : null,
        gap === undefined ? null : { gap: theme.space(gap) },
        style,
      ]}
    >
      {children}
    </View>
  );
}
