/**
 * Spacer（A04）—— 弹性或定值留白（组件定义 §2.1）
 *
 * 两种用法（**互斥**，同传时以 `size` 为准）：
 *   - `size`：**定值**留白，取间距令牌档位（如把两个块推开 16）；
 *   - 默认（`flex`）：**弹性**留白，把两侧内容顶到两端（"左标题 + 右动作"的经典写法）。
 *
 * ⛔ 不提供任意数字 —— 间距只能取令牌档位（宪法 2.4）。
 */

import * as React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { SpaceKey } from '@/design-system/px';

export type SpacerProps = {
  /** 定值留白档位；给了它就**不再**弹性 */
  size?: SpaceKey;
  /** 方向：`row` 里留白占宽度，`column` 里占高度（默认 `column`） */
  direction?: 'row' | 'column';
  testID?: string;
};

export function Spacer({
  size,
  direction = 'column',
  testID,
}: SpacerProps): React.ReactElement {
  const theme = useTheme();

  if (size !== undefined) {
    const value = theme.space(size);
    return (
      <View
        testID={testID}
        style={direction === 'row' ? { width: value } : { height: value }}
      />
    );
  }

  return <View testID={testID} style={{ flex: 1 }} />;
}
