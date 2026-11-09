import {
  WALL_COLOR_IDS, WALL_LAYOUT_IDS, WALL_LAYOUTS,
  type WallLayoutId, type WallPosterStyle, type WallPosterTemplateId,
} from './wallPosterTemplates';

const LEGACY_LAYOUTS: Record<WallPosterTemplateId, WallLayoutId> = {
  blueCenter: 'emphasis',
  minimalLeft: 'natural',
  warmPaper: 'quote',
  plainEssay: 'natural',
  deepBlue: 'emphasis',
};

export function wallPosterSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  }
  return hash >>> 0;
}

export function isWallPosterStyle(value: unknown): value is WallPosterStyle {
  if (!value || typeof value !== 'object') return false;
  const style = value as WallPosterStyle;
  return style.version === 2 &&
    WALL_LAYOUT_IDS.includes(style.layoutId) && WALL_COLOR_IDS.includes(style.colorId);
}

export function wallPosterStyle(
  id: number,
  saved?: WallPosterStyle,
  legacy?: WallPosterTemplateId
): WallPosterStyle {
  if (isWallPosterStyle(saved)) return saved;
  const seed = wallPosterSeed(String(id));
  return {
    version: 2,
    layoutId: legacy && Object.hasOwn(LEGACY_LAYOUTS, legacy) ? LEGACY_LAYOUTS[legacy] : 'natural',
    colorId: WALL_COLOR_IDS[seed % WALL_COLOR_IDS.length],
  };
}

export function canTryWallLayout(content: string, layoutId: WallLayoutId): boolean {
  if (layoutId === 'natural') return true;
  return content.trim().length > 0 && !isLongWallText(content) &&
    content.split(/\r\n|\r|\n/).length <= WALL_LAYOUTS[layoutId].maxLines;
}

export function isLongWallText(content: string): boolean {
  return Array.from(content).length > 120 || /\n\s*\n/.test(content);
}

export function wallPosterKey(style: WallPosterStyle): string {
  return `${style.layoutId}:${style.colorId}`;
}

export function generateWallPosterCandidates(
  layouts: readonly WallLayoutId[],
  seed: number,
  seen: readonly string[]
): WallPosterStyle[] {
  // Each rotation spans all three color families before their second shades.
  const colors = [WALL_COLOR_IDS[0], WALL_COLOR_IDS[2], WALL_COLOR_IDS[4],
    WALL_COLOR_IDS[1], WALL_COLOR_IDS[3], WALL_COLOR_IDS[5]];
  const pool = colors.flatMap((_, index) => layouts.map((layoutId, slot): WallPosterStyle => ({
    version: 2,
    layoutId,
    colorId: colors[(seed + index + slot) % colors.length],
  })));
  const unseen = pool.filter((style) => !seen.includes(wallPosterKey(style)));
  const available = unseen.length > 0 ? unseen : pool;
  const batch: WallPosterStyle[] = [];
  const ordered = [
    ...layouts.flatMap((layoutId) => available.find((style) => style.layoutId === layoutId) ?? []),
    ...available,
  ];
  for (const style of ordered) {
    if (!batch.includes(style)) batch.push(style);
    if (batch.length === 3) break;
  }
  return batch;
}
