import type { MessageKey } from '@/i18n';
import { colorsFor, type DarkColorTokenName } from '@/design-system/tokens';

/**
 * 万能墙六色盘。颜色值**只**落在 `tokens/design-tokens.css` 的
 * `--color-wall-*-bg / --color-wall-*-accent` 与 `--color-wall-ink / -muted`，
 * 这里只保留语义名与令牌名；⛔ 不写 hex。
 */
export const WALL_COLORS = {
  mist: { name: 'wall.poster.color.mist' },
  slate: { name: 'wall.poster.color.slate' },
  oat: { name: 'wall.poster.color.oat' },
  khaki: { name: 'wall.poster.color.khaki' },
  sage: { name: 'wall.poster.color.sage' },
  teal: { name: 'wall.poster.color.teal' },
} as const satisfies Record<string, { name: MessageKey }>;

export type WallColorId = keyof typeof WALL_COLORS;
export const WALL_COLOR_IDS = Object.keys(WALL_COLORS) as WallColorId[];

export type WallPaletteTokens = {
  background: DarkColorTokenName;
  accent: DarkColorTokenName;
  ink: DarkColorTokenName;
  muted: DarkColorTokenName;
};

/** 六色盘 → 语义令牌名（组件持 `useTheme()` 时用这一份直接取 `theme.color[...]`）。 */
export function wallPaletteTokens(colorId: WallColorId): WallPaletteTokens {
  return {
    background: `wall-${colorId}-bg` as DarkColorTokenName,
    accent: `wall-${colorId}-accent` as DarkColorTokenName,
    ink: 'wall-ink',
    muted: 'wall-muted',
  };
}

/**
 * 六色盘 → 当前主题的色值。
 * 仅给测试、预览页等非渲染路径复用；渲染层必须直接 `theme.color[...]`，
 * 否则会踩 `p1-04-atoms` 的“底色只能来自令牌”约定。
 */
export function wallPalette(colorId: WallColorId, scheme: 'light' | 'dark') {
  const tokens = wallPaletteTokens(colorId);
  const colors = colorsFor(scheme);
  return {
    background: colors[tokens.background].value,
    accent: colors[tokens.accent].value,
    ink: colors[tokens.ink].value,
    muted: colors[tokens.muted].value,
  };
}

// Every density is chosen from one measurement at 16sp. The displayed text
// never feeds its smaller line count back into this decision.
export function wallNaturalMetrics(lines: number, long: boolean) {
  if (lines >= 7 || (lines === 0 && long)) return { size: 14.5, lineHeight: 22, top: 4 };
  if (lines >= 5) return { size: 15, lineHeight: 22, top: 4 };
  if (lines >= 3) return { size: 15.5, lineHeight: 23, top: 3 };
  return { size: 16, lineHeight: 24, top: 2 };
}

export const WALL_LAYOUTS = {
  natural: { name: 'wall.poster.layout.natural', maxLines: 0, inset: 0, top: 2, bottom: 0, size: 16, lineHeight: 24 },
  emphasis: { name: 'wall.poster.layout.emphasis', maxLines: 2, inset: 6, top: 9, bottom: 5, size: 19, lineHeight: 28 },
  quote: { name: 'wall.poster.layout.quote', maxLines: 3, inset: 12, top: 4, bottom: 3, size: 17, lineHeight: 25 },
} as const satisfies Record<string, {
  name: MessageKey; maxLines: number; inset: number; top: number; bottom: number;
  size: number; lineHeight: number;
}>;

export type WallLayoutId = keyof typeof WALL_LAYOUTS;
export const WALL_LAYOUT_IDS = Object.keys(WALL_LAYOUTS) as WallLayoutId[];

export type WallPosterStyle = {
  version: 2;
  layoutId: WallLayoutId;
  colorId: WallColorId;
};

export type WallPosterTemplateId = 'blueCenter' | 'minimalLeft' | 'warmPaper' | 'plainEssay' | 'deepBlue';
