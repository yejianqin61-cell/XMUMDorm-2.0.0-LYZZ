/**
 * 设计系统层出口。
 *
 * ⛔ 纪律：App 内**只能**从这里（或 `components/ui/**`）取视觉取值。
 *    有任何代码绕过本层直接读 `tokens/generated/*` 或写 hex/字号字面量，视为未完成（宪法 13.1）。
 */

export {
  colors,
  colorsFor,
  darkColors,
  lightColors,
  scale,
  platformSeed,
} from './tokens';
export type {
  ColorToken,
  TokenTheme,
  TokenUsage,
  ThemeColorTokens,
} from './tokens';

export {
  px,
  ms,
  space,
  radius,
  borderWidth,
  motionDuration,
} from './px';
export type { LengthTokenKey } from './px';

export { ThemeProvider, useTheme } from './theme';
export type { Theme, ThemeSource, ThemeProviderProps } from './theme';

export {
  TEXT_ROLES,
  TEXT_ROLE_INTENT,
  numericVariant,
  resolveFontWeight,
} from './typography';
export type { TextEmphasis, TextRole } from './typography';
