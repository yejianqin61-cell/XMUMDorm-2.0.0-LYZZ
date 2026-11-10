import {
  canTryWallLayout, generateWallPosterCandidates, isWallPosterStyle, wallPosterKey, wallPosterStyle,
} from '@/features/campus/wallPosterLayout';
import { WALL_COLOR_IDS, wallPalette } from '@/features/campus/wallPosterTemplates';

describe('万能墙样式', () => {
  it('优先读取已存方案，旧版布局迁移与未知版本回退均可重复', () => {
    const saved = { version: 2, layoutId: 'quote', colorId: 'oat' } as const;
    expect(wallPosterStyle(41, saved, 'deepBlue')).toBe(saved);
    expect(wallPosterStyle(41, undefined, 'deepBlue').layoutId).toBe('emphasis');
    expect(wallPosterStyle(41, undefined, 'unknown' as never)).toEqual(wallPosterStyle(41));
    expect(isWallPosterStyle({ ...saved, version: 1 })).toBe(false);
    expect(isWallPosterStyle({ ...saved, colorId: 'red' })).toBe(false);
    const distribution = Object.fromEntries(WALL_COLOR_IDS.map((color) => [color, 0]));
    for (let id = 1; id <= 900; id++) distribution[wallPosterStyle(id).colorId]++;
    for (const count of Object.values(distribution)) expect(count).toBeGreaterThan(120);
  });

  it('在全部有效组合用完前不重复，并保留可用布局的多样性', () => {
    const seen: string[] = [];
    for (let round = 0; round < 6; round++) {
      const batch = generateWallPosterCandidates(['natural', 'emphasis', 'quote'], 8, seen);
      const keys = batch.map(wallPosterKey);
      expect(new Set(keys).size).toBe(3);
      for (const key of keys) expect(seen).not.toContain(key);
      if (round === 0) expect(new Set(batch.map((style) => style.layoutId)).size).toBe(3);
      seen.push(...keys);
    }
    expect(generateWallPosterCandidates(['natural'], 8, []).every((style) => style.layoutId === 'natural')).toBe(true);
  });

  it('段落分隔直接使用自然表达，问号不决定布局', () => {
    expect(canTryWallLayout('第一段。\n\n第二段。', 'quote')).toBe(false);
    expect(canTryWallLayout('第一段。\n\n第二段。', 'natural')).toBe(true);
    expect(canTryWallLayout('学校哪里最适合自习？', 'emphasis')).toBe(true);
  });

  it('令牌化前后六色盘逐项一致（视觉不变）', () => {
    // 令牌化前 WALL_COLORS 的六组值；令牌化后只换存放位置，不改色。
    const legacy = {
      light: {
        mist: ['#E8F0F6', '#A9BDCC'], slate: ['#E4EBF2', '#A7B7C8'],
        oat: ['#F3EDE0', '#CBB990'], khaki: ['#EEE8DA', '#C5B38D'],
        sage: ['#E9F0E9', '#A8BDA7'], teal: ['#E3EEEB', '#A0BAB4'],
      },
      dark: {
        mist: ['#263647', '#7394AE'], slate: ['#293B47', '#819CAC'],
        oat: ['#3B352C', '#AA966C'], khaki: ['#38352C', '#A69A77'],
        sage: ['#2C3C37', '#829C88'], teal: ['#293A39', '#749D96'],
      },
    } as const;
    for (const scheme of ['light', 'dark'] as const) {
      for (const id of WALL_COLOR_IDS) {
        const palette = wallPalette(id, scheme);
        const actual = [palette.background, palette.accent].map((value) => value.toLowerCase());
        const expected = legacy[scheme][id].map((value) => value.toLowerCase());
        expect(actual).toEqual(expected);
        expect(palette.ink.toLowerCase()).toBe(scheme === 'dark' ? '#e8ebee' : '#25323d');
        expect(palette.muted.toLowerCase()).toBe(scheme === 'dark' ? '#bbc7ce' : '#4a5966');
      }
    }
  });

  it('六种底色上的正文和互动文字均满足 AA 对比度', () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((index) => {
        const n = parseInt(hex.slice(index, index + 2), 16) / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return r * 0.2126 + g * 0.7152 + b * 0.0722;
    };
    for (const id of WALL_COLOR_IDS) {
      for (const scheme of ['light', 'dark'] as const) {
        const color = wallPalette(id, scheme);
        for (const ink of [color.ink, color.muted]) {
          const values = [luminance(color.background), luminance(ink)];
          expect((Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)).toBeGreaterThan(4.5);
        }
      }
    }
  });
});
