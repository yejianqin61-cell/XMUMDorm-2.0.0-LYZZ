/**
 * Surface（A01）—— **全 App 唯一的可见底色出口**（组件定义 §2.1 原子层硬规则②）
 *
 * ⛔ 业务代码不得写 `backgroundColor`；要底色就包一层 `Surface`。
 * ⛔ 暗色层级**由表面色表达、不用阴影**（宪法 2.4-3）→ 本组件**不提供** elevation / shadow prop。
 *
 * 变体只做文档点名的 5 个；其余 `*-soft` 令牌（accent / success / warning / danger）
 * **等有真实消费者时再加** —— ⛔ 不预先铺开无人引用的 API（宪法 9.1 与"组件库写了 0 引用"的教训）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { BorderWidthKey, RadiusKey, SpaceKey } from '@/design-system/px';
import type { DarkColorTokenName } from '@/design-system/tokens';

export type SurfaceVariant = 'canvas' | 'surface' | 'raised' | 'sunken' | 'brandSoft';

/** 变体 → 语义底色令牌（⛔ 不取调色板档位，宪法 2.3） */
export const SURFACE_VARIANT_TOKEN: Record<SurfaceVariant, DarkColorTokenName> = {
  canvas: 'bg-canvas',
  surface: 'bg-surface',
  raised: 'bg-raised',
  sunken: 'bg-sunken',
  brandSoft: 'bg-brand-soft',
};

export type SurfaceProps = {
  variant?: SurfaceVariant;
  /** 圆角档位；`'none'` = 不加圆角（整屏 / 整段） */
  rounded?: RadiusKey | 'none';
  /** 描边档位；`'none'` = 无描边。⛔ 不提供阴影替代方案 */
  bordered?: 'subtle' | 'strong' | 'none';
  /** 内边距档位；`'none'` = 不加（由内部布局自己管） */
  padding?: SpaceKey | 'none';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
};

export function Surface({
  variant = 'surface',
  rounded = 'radius_medium',
  bordered = 'none',
  padding = 'none',
  style,
  children,
  testID,
}: SurfaceProps): React.ReactElement {
  const theme = useTheme();
  const borderColor: DarkColorTokenName | null =
    bordered === 'subtle' ? 'border-subtle' : bordered === 'strong' ? 'border-strong' : null;

  const borderStyle: ViewStyle | null =
    borderColor === null
      ? null
      : {
          borderWidth: theme.borderWidth(
            (bordered === 'strong'
              ? 'border_width_brutal'
              : 'border_width_hairline') as BorderWidthKey
          ),
          borderColor: theme.color[borderColor].value,
        };

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.color[SURFACE_VARIANT_TOKEN[variant]].value,
        },
        rounded === 'none' ? null : { borderRadius: theme.radius(rounded) },
        borderStyle,
        padding === 'none' ? null : { padding: theme.space(padding) },
        style,
      ]}
    >
      {children}
    </View>
  );
}
