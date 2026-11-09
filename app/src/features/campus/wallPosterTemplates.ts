import type { MessageKey } from '@/i18n';

export const WALL_COLORS = {
  mist: { background: '#E8F0F6', accent: '#A9BDCC', darkBackground: '#263647', darkAccent: '#7394AE', name: 'wall.poster.color.mist' },
  slate: { background: '#E4EBF2', accent: '#A7B7C8', darkBackground: '#293B47', darkAccent: '#819CAC', name: 'wall.poster.color.slate' },
  oat: { background: '#F3EDE0', accent: '#CBB990', darkBackground: '#3B352C', darkAccent: '#AA966C', name: 'wall.poster.color.oat' },
  khaki: { background: '#EEE8DA', accent: '#C5B38D', darkBackground: '#38352C', darkAccent: '#A69A77', name: 'wall.poster.color.khaki' },
  sage: { background: '#E9F0E9', accent: '#A8BDA7', darkBackground: '#2C3C37', darkAccent: '#829C88', name: 'wall.poster.color.sage' },
  teal: { background: '#E3EEEB', accent: '#A0BAB4', darkBackground: '#293A39', darkAccent: '#749D96', name: 'wall.poster.color.teal' },
} as const satisfies Record<string, { background: string; accent: string; darkBackground: string; darkAccent: string; name: MessageKey }>;

export type WallColorId = keyof typeof WALL_COLORS;
export const WALL_COLOR_IDS = Object.keys(WALL_COLORS) as WallColorId[];
export const WALL_INK = '#25323D';
export const WALL_MUTED_INK = '#4A5966';

export function wallPalette(colorId: WallColorId, scheme: 'light' | 'dark') {
  const color = WALL_COLORS[colorId];
  return scheme === 'dark'
    ? { background: color.darkBackground, accent: color.darkAccent, ink: '#E8EBEE', muted: '#BBC7CE' }
    : { background: color.background, accent: color.accent, ink: WALL_INK, muted: WALL_MUTED_INK };
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
