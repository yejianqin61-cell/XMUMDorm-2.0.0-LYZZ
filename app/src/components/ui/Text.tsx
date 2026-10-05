/**
 * 文本（A02）—— 全 App 唯一的文字渲染组件。
 *
 * **P1-03（关 TD-44）**：字号现在来自 `resolveFontMetrics(role)` —— 数值由生成器内置的
 * **M3 官方校验表**产出（`tokens/generated/native-tokens.ts` 的 `fontMetrics`）。
 * ⛔ 本文件里**不得出现字号数字**：`design-debt-report.js` 的 `fontSize 数值字面量`
 * 指标 + `p0-02-tokens.test.ts` 会拦（P1-03 把口径从"出现键名"收紧为"写数字"）。
 *
 * 纪律：
 * - 7.1 / 2.5-7 默认 `allowFontScaling`（⛔ 不关掉 Dynamic Type）；
 *   **关键布局**（按钮 / Tab / 表单标签，即 `role='label'`）给 `maxFontSizeMultiplier`
 *   上限，因为它们的容器高度是固定的 —— 但 ⛔ 不靠关掉缩放来解决放不下。
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
  LABEL_MAX_FONT_SCALE,
  numericVariant,
  resolveFontMetrics,
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
  /**
   * 字号放大上限（宪法 2.5-7）。不传时：`role='label'` 用 `LABEL_MAX_FONT_SCALE`
   * （容器高度固定），其余角色**不设上限**（长文应当能无限放大）。
   */
  maxFontSizeMultiplier?: number;
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
  maxFontSizeMultiplier,
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

  const metrics = resolveFontMetrics(role);
  const fontVariant = numericVariant(role);
  const scaleCap =
    maxFontSizeMultiplier ?? (role === 'label' ? LABEL_MAX_FONT_SCALE : undefined);

  return (
    <RNText
      testID={testID}
      accessibilityRole={accessibilityRole}
      numberOfLines={numberOfLines}
      // 2.5-7：显式开启（RN 默认就是 true，写出来是为了"这是我们的决定"）
      allowFontScaling
      maxFontSizeMultiplier={scaleCap}
      style={[
        {
          color: token?.value,
          // 2.5-②：字号**不在这里写数字**，取的是生成期分端生成的 M3 数值
          fontSize: metrics.size,
          lineHeight: metrics.lineHeight,
          letterSpacing: metrics.tracking,
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
