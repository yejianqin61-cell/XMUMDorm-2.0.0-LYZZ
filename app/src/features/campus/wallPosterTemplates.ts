/**
 * 万能墙 · 自由帖**文字海报模板表**（阶段 2 · 节点 A）
 *
 * 为什么是配置表：五种模板的差异只有「底色 / 文字色 / 对齐 / 间距 / 字阶 / 容量」六件事，
 * 评分、过滤、回退都必须读**同一份配置**。⛔ 不允许在渲染或推荐里散落 `if (id === …)`。
 *
 * 三条边界：
 *  1. **颜色只引用语义令牌**（`bg-brand-soft` / `accent-text` …），⛔ 本文件不出现色值；
 *     同一模板在亮 / 暗两套主题下各自由令牌解析，不在这里按主题分支。
 *  2. **字号只引用字阶角色**（headline / label / body），⛔ 本文件与渲染层都不写字号数字。
 *     加新字号属于令牌层变更（宪法 2.5），本阶段不做。
 *  3. **容量是硬约束**：`limits` 描述"能安全容纳什么"，渲染后仍要用真实行数复核（§8.4），
 *     所以这里只给边界，不负责测量。
 *
 * 版本：模板 ID + `version` 是阶段 2-B 的持久化契约（同一篇帖子重开不得换模板）。
 * 本阶段还没有写库，但版本号现在就要定，避免上线后无据可依。
 */

import type { TextColorToken } from '@/components/ui/Text';
import type { RadiusKey, SpaceKey } from '@/design-system/px';
import type { DarkColorTokenName } from '@/design-system/tokens';
import type { TextEmphasis, TextRole } from '@/design-system/typography';
import type { MessageKey } from '@/i18n';

/** 模板契约版本：改动版式语义（不是改文案 / 微调间距）时 +1 */
export const WALL_POSTER_VERSION = 1;

export const WALL_POSTER_TEMPLATE_IDS = [
  'blueCenter',
  'minimalLeft',
  'warmPaper',
  'deepBlue',
  'plainEssay',
] as const;

export type WallPosterTemplateId = (typeof WALL_POSTER_TEMPLATE_IDS)[number];

/** 文字长度档（按**显示宽度**，不是字符数：中文一字约等于两个英文列） */
export type WallPosterLengthBand = 'short' | 'medium' | 'long';

/** 显示宽度分档阈值（列）：≤52 短、≤170 中、更长即长 */
export const WALL_POSTER_BAND_EDGES = { short: 52, medium: 170 } as const;

/**
 * 海报正文的字号放大上限。
 *
 * 为什么不是无限放大：海报的底色块 / 内边距是固定的，系统字号被拉到极大时
 * 文字会从色块里溢出来（宪法 2.5-7 要求"可放大"，不是"必须无限放大"）。
 * 2.0 覆盖 Android「大」档，仍保留 1.5 倍以上的可读提升；超限时由行数复核触发回退。
 */
export const WALL_POSTER_MAX_FONT_SCALE = 2;

export type WallPosterTypeStyle = {
  role: TextRole;
  emphasis: TextEmphasis;
};

export type WallPosterTemplate = {
  id: WallPosterTemplateId;
  version: number;
  /** 模板名（位置：预览实验页的标签，不进入帖子卡片） */
  nameKey: MessageKey;
  /**
   * 底色：语义 surface / fill 令牌。
   * `null` = **不加底色**（只有「简洁随笔」：正文直接坐在卡片的白色 / 详情页画布上，
   * 这样信息流与详情都能"融成一层"，不会在浅灰画布上多出一块没有圆角的白条）。
   */
  backgroundToken: DarkColorTokenName | null;
  /** 文字色：必须是 textSafe 的语义令牌（对比度由 p2a-wall-poster 用例复核） */
  textToken: TextColorToken;
  align: 'left' | 'center';
  paddingX: SpaceKey | 'none';
  paddingY: SpaceKey;
  radius: RadiusKey | 'none';
  /** 三档长度各自消费的字阶角色 */
  typography: Record<WallPosterLengthBand, WallPosterTypeStyle>;
  limits: {
    /** 显示宽度下限（列） */
    minColumns: number;
    /** 显示宽度上限（列） */
    maxColumns: number;
    /** 允许的段落数（空行分段；超过就不是海报而是文章） */
    maxParagraphs: number;
    /** 安全行数上限：真实排版超过它 → 自动回退 */
    maxLines: number;
    /** 单个不可断词（URL / 长英文词）的字符上限，超了就不适合居中/大字 */
    maxTokenLength: number;
  };
  /** 评分参数：全是可解释的加减分，不做语义理解 */
  fit: {
    /** 理想显示宽度区间（列） */
    idealColumns: readonly [number, number];
    /** 纯英文的亲和度 */
    latinAffinity: number;
    /** 中英混排的亲和度 */
    mixedAffinity: number;
    /** 含 Emoji 的亲和度 */
    emojiAffinity: number;
    /** 每多一个段落的分值（负数 = 越分段越不适合） */
    paragraphAffinity: number;
    /** 每个硬换行的扣分（负数在实现里取绝对值处理） */
    newlinePenalty: number;
    /** 出现长英文词 / URL 的扣分 */
    longTokenPenalty: number;
    /** 信息流里的视觉重量：阶段 2-B 用它避免连续深色卡 */
    weight: 'light' | 'medium' | 'heavy';
  };
  /** 实测行数超限时的下一站（必须能容纳更多文字，链条最终落到 plainEssay） */
  fallback: WallPosterTemplateId;
};

const TEMPLATES: Record<WallPosterTemplateId, WallPosterTemplate> = {
  /** A · 蓝色居中：短句、提问、一句感想 */
  blueCenter: {
    id: 'blueCenter',
    version: WALL_POSTER_VERSION,
    nameKey: 'wall.poster.template.blueCenter',
    backgroundToken: 'bg-brand-soft',
    textToken: 'text-brand',
    align: 'center',
    paddingX: 'space_4',
    paddingY: 'space_6',
    radius: 'radius_medium',
    typography: {
      short: { role: 'headline', emphasis: 'strong' },
      medium: { role: 'label', emphasis: 'regular' },
      long: { role: 'body', emphasis: 'regular' },
    },
    limits: {
      minColumns: 2,
      maxColumns: 72,
      maxParagraphs: 2,
      maxLines: 6,
      maxTokenLength: 18,
    },
    fit: {
      idealColumns: [8, 44],
      latinAffinity: 2,
      mixedAffinity: 2,
      emojiAffinity: 6,
      paragraphAffinity: -8,
      newlinePenalty: 6,
      longTokenPenalty: 20,
      weight: 'light',
    },
    fallback: 'minimalLeft',
  },

  /** B · 极简左对齐：普通问题、分享、中等长度 */
  minimalLeft: {
    id: 'minimalLeft',
    version: WALL_POSTER_VERSION,
    nameKey: 'wall.poster.template.minimalLeft',
    backgroundToken: 'bg-sunken',
    textToken: 'text-primary',
    align: 'left',
    paddingX: 'space_4',
    paddingY: 'space_4',
    radius: 'radius_medium',
    typography: {
      short: { role: 'label', emphasis: 'regular' },
      medium: { role: 'label', emphasis: 'regular' },
      long: { role: 'body', emphasis: 'regular' },
    },
    limits: {
      minColumns: 4,
      maxColumns: 420,
      maxParagraphs: 8,
      maxLines: 24,
      maxTokenLength: 40,
    },
    fit: {
      idealColumns: [40, 240],
      latinAffinity: 2,
      mixedAffinity: 6,
      emojiAffinity: 0,
      paragraphAffinity: 2,
      newlinePenalty: 0,
      longTokenPenalty: 6,
      weight: 'light',
    },
    fallback: 'plainEssay',
  },

  /** C · 暖纸留白：感想、短句、校园生活记录 */
  warmPaper: {
    id: 'warmPaper',
    version: WALL_POSTER_VERSION,
    nameKey: 'wall.poster.template.warmPaper',
    backgroundToken: 'bg-accent-soft',
    textToken: 'accent-text',
    align: 'left',
    paddingX: 'space_6',
    paddingY: 'space_8',
    radius: 'radius_medium',
    typography: {
      short: { role: 'headline', emphasis: 'regular' },
      medium: { role: 'label', emphasis: 'regular' },
      long: { role: 'body', emphasis: 'regular' },
    },
    limits: {
      minColumns: 2,
      maxColumns: 150,
      maxParagraphs: 3,
      maxLines: 10,
      maxTokenLength: 24,
    },
    fit: {
      idealColumns: [6, 80],
      latinAffinity: 4,
      mixedAffinity: 4,
      emojiAffinity: 4,
      paragraphAffinity: -4,
      newlinePenalty: 3,
      longTokenPenalty: 12,
      weight: 'light',
    },
    fallback: 'minimalLeft',
  },

  /** D · 深蓝强调：短观点、英文短标题。视觉最重，推荐时压低出现频率 */
  deepBlue: {
    id: 'deepBlue',
    version: WALL_POSTER_VERSION,
    nameKey: 'wall.poster.template.deepBlue',
    backgroundToken: 'action-primary',
    textToken: 'text-on-fill',
    align: 'left',
    paddingX: 'space_6',
    paddingY: 'space_6',
    radius: 'radius_medium',
    typography: {
      short: { role: 'headline', emphasis: 'strong' },
      medium: { role: 'label', emphasis: 'strong' },
      long: { role: 'body', emphasis: 'regular' },
    },
    limits: {
      minColumns: 2,
      maxColumns: 64,
      maxParagraphs: 2,
      maxLines: 5,
      maxTokenLength: 16,
    },
    fit: {
      idealColumns: [4, 40],
      latinAffinity: 10,
      mixedAffinity: 2,
      emojiAffinity: 4,
      paragraphAffinity: -10,
      newlinePenalty: 8,
      longTokenPenalty: 20,
      weight: 'heavy',
    },
    fallback: 'minimalLeft',
  },

  /** E · 简洁随笔：长文、多段落；与白色外壳融合，不做内框 */
  plainEssay: {
    id: 'plainEssay',
    version: WALL_POSTER_VERSION,
    nameKey: 'wall.poster.template.plainEssay',
    backgroundToken: null,
    textToken: 'text-primary',
    align: 'left',
    paddingX: 'none',
    paddingY: 'space_2',
    radius: 'none',
    typography: {
      short: { role: 'label', emphasis: 'regular' },
      medium: { role: 'body', emphasis: 'regular' },
      long: { role: 'body', emphasis: 'regular' },
    },
    limits: {
      minColumns: 1,
      maxColumns: 100000,
      maxParagraphs: 999,
      maxLines: 999,
      maxTokenLength: 100000,
    },
    fit: {
      idealColumns: [150, 900],
      latinAffinity: 0,
      mixedAffinity: 2,
      emojiAffinity: -2,
      paragraphAffinity: 3,
      newlinePenalty: 0,
      longTokenPenalty: 2,
      weight: 'light',
    },
    fallback: 'plainEssay',
  },
};

export const WALL_POSTER_TEMPLATES = TEMPLATES;

/** 按配置顺序读取五种模板（预览页 / 测试都走这里，⛔ 不各自维护一份列表） */
export const WALL_POSTER_TEMPLATE_LIST: readonly WallPosterTemplate[] = WALL_POSTER_TEMPLATE_IDS.map(
  (id) => TEMPLATES[id]
);

export function wallPosterTemplate(id: WallPosterTemplateId): WallPosterTemplate {
  return TEMPLATES[id];
}

/** 显示宽度 → 长度档（只看列宽，避免"20 个英文 = 20 个中文"的误判） */
export function wallPosterBandFor(columns: number): WallPosterLengthBand {
  if (columns <= WALL_POSTER_BAND_EDGES.short) return 'short';
  if (columns <= WALL_POSTER_BAND_EDGES.medium) return 'medium';
  return 'long';
}

/** 某模板在给定长度档下应使用的字阶（配置的唯一出口） */
export function wallPosterTypeStyle(
  id: WallPosterTemplateId,
  band: WallPosterLengthBand
): WallPosterTypeStyle {
  return TEMPLATES[id].typography[band];
}
