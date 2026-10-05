/**
 * Skeleton（A10）—— 骨架占位（组件定义 §2.1）
 *
 * 为什么必须有它：宪法 **10.3**"加载时先给东西看"，⛔ 不是"转圈 + 加载中…"。
 * 骨架让首屏在数据到达前就有**版式**，感知等待显著短于同长度的空白。
 *
 * 形态：`text`（一行文字）· `list`（列表行）· `card`（卡片）· `media`（图片区）。
 * ⚠️ 组件定义还列了 `grid`（宫格）—— **P1-04 不做**：内测里没有它的消费者，
 *    ⛔ 不预先铺开无引用的 API（宪法 9.1；"组件库写了 0 引用"的教训）。
 *
 * 尺寸**只取间距令牌**（⛔ 不写裸数字，宪法 16.3/2.4）；`height`/`width` 可覆盖。
 * ⚠️ 令牌源里**没有**"骨架专色"（令牌规范 §四未登记该缺口）→ 先用 `bg-sunken`，
 *    并登记为缺口：若将来定义了骨架专色，只改这一个文件。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { RadiusKey, SpaceKey } from '@/design-system/px';

export type SkeletonKind = 'text' | 'list' | 'card' | 'media';

type KindSpec = {
  height: SpaceKey;
  radius: RadiusKey;
  /** 是否占满可用宽度 */
  fullWidth: boolean;
};

const KIND: Record<SkeletonKind, KindSpec> = {
  text: { height: 'space_3', radius: 'radius_small', fullWidth: true },
  list: { height: 'space_12', radius: 'radius_small', fullWidth: true },
  card: { height: 'space_12', radius: 'radius_medium', fullWidth: true },
  media: { height: 'space_12', radius: 'radius_medium', fullWidth: true },
};

export type SkeletonProps = {
  kind?: SkeletonKind;
  /** 覆盖高度档位 */
  height?: SpaceKey;
  /** 固定宽度档位（不给则按 kind 决定是否占满） */
  width?: SpaceKey;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * 一行骨架的**可测规格**（纯函数，供测试断言，也供调用方复用）
 */
export function skeletonSpec(kind: SkeletonKind): KindSpec {
  return KIND[kind];
}

export function Skeleton({
  kind = 'text',
  height,
  width,
  style,
  testID,
}: SkeletonProps): React.ReactElement {
  const theme = useTheme();
  const spec = KIND[kind];

  const box: StyleProp<ViewStyle> = [
    {
      height: theme.space(height ?? spec.height),
      borderRadius: theme.radius(spec.radius),
      // ⚠️ 骨架专色缺口：暂用 sunken（缺口已登记）
      backgroundColor: theme.color['bg-sunken'].value,
    },
    width !== undefined
      ? { width: theme.space(width) }
      : spec.fullWidth
        ? { alignSelf: 'stretch' }
        : null,
    style,
  ];

  return <View testID={testID} style={box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
