/**
 * MetricRow（`K10`）—— 横向指标行（组件定义 §2.3；用它的页：`T-01` `M-01`）
 *
 * 它是**容器**：一行放 2–4 个 `K09 StatTile`（或任意等宽单元），彼此之间用 `A05 Divider` 分开。
 * 为什么需要它：`T-01`/`M-01` 顶部的"三个数字"如果各页各写一遍 flex 布局，
 * 间距与分隔线一定会漂移（宪法 1.4「一改全部改」）。
 *
 * ⛔ 组件内 0 文案；⛔ 不写死单元数量（由 children 决定）。
 * ⛔ 视觉只来自令牌。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { Divider } from './Divider';

export type MetricRowProps = {
  /** 等宽单元（通常是 `K09 StatTile`）。只放**同一层级**的指标，⛔ 不塞操作 */
  children: React.ReactNode;
  /** 单元之间是否画分隔线（默认画：两个数字挨着容易读成一个） */
  divided?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MetricRow({
  children,
  divided = true,
  style,
  testID,
}: MetricRowProps): React.ReactElement {
  const theme = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      testID={testID}
      // 横向排布 + 不靠颜色区分层级：分隔线是**独立视觉元素**（不是底色深浅）
      style={[{ flexDirection: 'row', alignItems: 'stretch', gap: theme.space('space_2') }, style]}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && divided ? <Divider vertical /> : null}
          {item}
        </React.Fragment>
      ))}
    </View>
  );
}
