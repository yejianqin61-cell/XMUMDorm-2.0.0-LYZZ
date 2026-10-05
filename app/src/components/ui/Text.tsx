/**
 * 文本（A02）—— 全 App 唯一的文字渲染组件。
 *
 * ⚠️ **本组件不含绝对字号**（宪法 2.5-②：字阶数值必须"分端生成"，而 M3 官方字阶须人工读取
 * → 缺口登记 TD-44，见 `design-system/typography.ts`）。层级当前只由
 * **字重 + 颜色令牌** 表达。⛔ 也不允许调用点传 `fontSize`（尺子会拦）。
 *
 * 纪律：
 * - 7.1 默认 `allowFontScaling`（系统字号放大必须生效，⛔ 不关掉 Dynamic Type）
 * - 2.3 承载文字的颜色令牌必须 `textSafe`；不是就在 dev 下报出来（⛔ 不静默）
 * - 6.2 ⛔ 不用截断掩盖"放不下"——`numberOfLines` 只用于**列表摘要**，不用于标签
 */

import * as React from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { ColorToken, DarkColorTokenName } from '@/design-system/tokens';
import {
  numericVariant,
  resolveFontWeight,
  type TextEmphasis,
  type TextRole,
} from '@/design-system/typography';

/** 语义色令牌名（生成物里逐个列出，⛔ 不能传调色板档位） */
export type TextColorToken = DarkColorTokenName;

export type TextProps = {
  role?: TextRole;
  emphasis?: TextEmphasis;
  colorToken?: TextColorToken;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
  /** 无障碍角色（默认按 role 推断） */
  accessibilityRole?: RNTextProps['accessibilityRole'];
};

export function Text({
  role = 'body',
  emphasis = 'regular',
  colorToken = 'text-primary',
  align,
  numberOfLines,
  children,
  style,
  testID,
  accessibilityRole = 'text',
}: TextProps): React.ReactElement {
  const theme = useTheme();
  const token: ColorToken | undefined = theme.color[colorToken];

  if (__DEV__ && token && !token.textSafe) {
    // ⛔ 不静默：不可承载正文的令牌被用来渲染文字时必须暴露（宪法 2.3 / 10.4）
    console.warn(`[Text] 令牌 ${colorToken} 的 textSafe=false，不应用来承载文字`);
  }

  const fontVariant = numericVariant(role);

  return (
    <RNText
      testID={testID}
      accessibilityRole={accessibilityRole}
      numberOfLines={numberOfLines}
      style={[
        {
          color: token?.value,
          fontWeight: resolveFontWeight(emphasis) as TextStyle['fontWeight'],
          textAlign: align,
        },
        fontVariant ? { fontVariant: [fontVariant] } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
