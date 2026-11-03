/**
 * 万能墙 · 自由帖**文字分析 + 模板适配**（阶段 2 · 节点 A）
 *
 * 流程（§8）：`分析文字特征 → 硬约束过滤 → 适配评分 → 生成候选 → 渲染后复测`。
 * 本文件负责前三步与渲染前的行数估算；**真实行数复核**在 `WallPosterBody` 里
 * 通过原生 `onTextLayout` 完成（⛔ 不靠字符数假装测过）。
 *
 * 全部是纯函数：
 *   - 同一段文字**永远**得到同一个推荐（`recommendWallPoster`）→ 阶段 2-B 的样式稳定；
 *   - 只有"候选三选"带**有限权重随机**（`generateWallPosterCandidates`），种子可注入，
 *     换一批用 `exclude` 优先给未出现过的有效组合。
 */

import { resolveFontMetrics } from '@/design-system/typography';
import {
  WALL_POSTER_TEMPLATES,
  WALL_POSTER_TEMPLATE_LIST,
  wallPosterBandFor,
  wallPosterTemplate,
  wallPosterTypeStyle,
  type WallPosterLengthBand,
  type WallPosterTemplateId,
} from './wallPosterTemplates';

export type WallTextProfile = {
  /** 原始正文（不做 trim：用户换行要保留） */
  content: string;
  /** 码点数量（中文 / 英文 / Emoji 各计 1） */
  chars: number;
  /** 视觉列宽：全角 / Emoji 记 2，半角记 1 —— 分档与容量都看它 */
  columns: number;
  cjk: number;
  latin: number;
  digits: number;
  emoji: number;
  spaces: number;
  /** 空行分段的段落数（至少 1，正文非空时） */
  paragraphs: number;
  /** 硬换行数量（含空行） */
  lineBreaks: number;
  hasMixedScript: boolean;
  hasEmoji: boolean;
  hasUrl: boolean;
  /** 最长的不可断词（英文词 / URL）的字符数 */
  longestToken: number;
};

const ZERO_WIDTH = new Set([0xfe0f, 0xfe0e, 0x200d]);

/** Emoji 常用码位（⛔ 不用 `\p{…}`：Hermes 对 Unicode property escapes 支持不稳） */
function isEmojiCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x1f000 && cp <= 0x1f0ff) ||
    (cp >= 0x1f1e6 && cp <= 0x1f1ff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    cp === 0x2764 ||
    cp === 0x2b50 ||
    cp === 0x2705 ||
    cp === 0x274c
  );
}

/** 全角 / 宽字符（中文、假名、全角标点、Emoji） */
function isWideCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    isEmojiCodePoint(cp)
  );
}

function isCjkCodePoint(cp: number): boolean {
  return (
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3040 && cp <= 0x30ff) ||
    (cp >= 0xac00 && cp <= 0xd7a3)
  );
}

function isLatinCodePoint(cp: number): boolean {
  return (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x24f);
}

function isDigitCodePoint(cp: number): boolean {
  return cp >= 0x30 && cp <= 0x39;
}

/** 单字符估算宽度（以当前字阶的字号为单位，1 = 一个字号宽） */
function charWidthEm(cp: number): number {
  if (ZERO_WIDTH.has(cp)) return 0;
  if (isEmojiCodePoint(cp)) return 1.15;
  if (isCjkCodePoint(cp)) return 1;
  if (cp === 0x20 || cp === 0x09) return 0.3;
  if (isDigitCodePoint(cp)) return 0.56;
  if (isLatinCodePoint(cp)) return 0.54;
  if (cp < 0x80) return 0.4;
  if (isWideCodePoint(cp)) return 1;
  return 0.6;
}

const LONG_TOKEN_RE = /[A-Za-z0-9][A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*/g;
const URL_RE = /https?:\/\/|www\./i;

/** 文字特征分析（纯函数，稳定） */
export function analyzeWallText(content: string): WallTextProfile {
  let chars = 0;
  let columns = 0;
  let cjk = 0;
  let latin = 0;
  let digits = 0;
  let emoji = 0;
  let spaces = 0;

  for (const ch of content) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    chars += 1;
    if (cp === 0x0a) continue;
    if (ZERO_WIDTH.has(cp)) continue;
    columns += isWideCodePoint(cp) ? 2 : 1;
    if (isEmojiCodePoint(cp)) emoji += 1;
    else if (isCjkCodePoint(cp)) cjk += 1;
    else if (isLatinCodePoint(cp)) latin += 1;
    else if (isDigitCodePoint(cp)) digits += 1;
    else if (cp === 0x20 || cp === 0x09) spaces += 1;
  }

  const paragraphs = content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
  const lineBreaks = (content.match(/\n/g) ?? []).length;
  const tokens = content.match(LONG_TOKEN_RE) ?? [];
  const longestToken = tokens.reduce((max, token) => Math.max(max, token.length), 0);

  return {
    content,
    chars,
    columns,
    cjk,
    latin,
    digits,
    emoji,
    spaces,
    paragraphs: Math.max(1, paragraphs),
    lineBreaks,
    hasMixedScript: cjk > 0 && latin > 0,
    hasEmoji: emoji > 0,
    hasUrl: URL_RE.test(content),
    longestToken,
  };
}

export function wallPosterBandOf(profile: WallTextProfile): WallPosterLengthBand {
  return wallPosterBandFor(profile.columns);
}

export type WallPosterTemplateEvaluation = {
  templateId: WallPosterTemplateId;
  version: number;
  band: WallPosterLengthBand;
  eligible: boolean;
  score: number;
  /** 硬约束未通过的原因（只给开发 / 预览页，不进入用户文案） */
  blockedBy: readonly ('length' | 'paragraphs' | 'token')[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 硬约束：长度区间 / 段落上限 / 不可断词上限（⛔ 不在这里做"软偏好"） */
function hardConstraints(
  profile: WallTextProfile,
  id: WallPosterTemplateId
): readonly ('length' | 'paragraphs' | 'token')[] {
  const { limits } = WALL_POSTER_TEMPLATES[id];
  const blocked: ('length' | 'paragraphs' | 'token')[] = [];
  if (profile.columns < limits.minColumns || profile.columns > limits.maxColumns) blocked.push('length');
  if (profile.paragraphs > limits.maxParagraphs) blocked.push('paragraphs');
  if (profile.longestToken > limits.maxTokenLength) blocked.push('token');
  return blocked;
}

/**
 * 适配评分：0–100，全部来自模板配置的可解释项。
 *
 * 组成：基础分 + 理想宽度契合（40）+ 语种 / Emoji / 段落的亲和分
 *      − 硬换行 / 长英文词扣分。分数只用于**排序与加权**，不是"合格线"。
 */
export function scoreWallPosterTemplate(
  profile: WallTextProfile,
  id: WallPosterTemplateId
): number {
  const template = WALL_POSTER_TEMPLATES[id];
  const [lo, hi] = template.fit.idealColumns;
  const span = Math.max(1, hi - lo);

  let fitRatio: number;
  if (profile.columns < lo) fitRatio = 1 - (lo - profile.columns) / span;
  else if (profile.columns > hi) fitRatio = 1 - (profile.columns - hi) / span;
  else fitRatio = 1;

  let score = 50 + 40 * clamp(fitRatio, 0, 1);

  if (profile.cjk === 0 && profile.latin > 0) score += template.fit.latinAffinity;
  if (profile.hasMixedScript) score += template.fit.mixedAffinity;
  if (profile.emoji > 0) score += template.fit.emojiAffinity;
  if (profile.paragraphs > 1) {
    score += template.fit.paragraphAffinity * Math.min(3, profile.paragraphs - 1);
  }
  if (profile.lineBreaks > 0) {
    score -= template.fit.newlinePenalty * Math.min(3, profile.lineBreaks);
  }
  if (profile.longestToken > 14) score -= template.fit.longTokenPenalty;

  return Math.round(clamp(score, 0, 100));
}

export function evaluateWallPosterTemplate(
  profile: WallTextProfile,
  id: WallPosterTemplateId
): WallPosterTemplateEvaluation {
  const template = WALL_POSTER_TEMPLATES[id];
  const blockedBy = hardConstraints(profile, id);
  return {
    templateId: id,
    version: template.version,
    band: wallPosterBandOf(profile),
    eligible: blockedBy.length === 0,
    score: scoreWallPosterTemplate(profile, id),
    blockedBy,
  };
}

const WEIGHT_ORDER: Record<'light' | 'medium' | 'heavy', number> = {
  light: 0,
  medium: 1,
  heavy: 2,
};

/**
 * 五种模板的排序（供预览页"全部模板"与调试使用）。
 * 排序：可用的在前 → 分数高 → 视觉轻 → 配置顺序（稳定 tie-break）。
 */
export function rankWallPosterTemplates(content: string): WallPosterTemplateEvaluation[] {
  const profile = analyzeWallText(content);
  return WALL_POSTER_TEMPLATE_LIST.map((template) => evaluateWallPosterTemplate(profile, template.id)).sort(
    (a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (a.score !== b.score) return b.score - a.score;
      const weightA = WEIGHT_ORDER[WALL_POSTER_TEMPLATES[a.templateId].fit.weight];
      const weightB = WEIGHT_ORDER[WALL_POSTER_TEMPLATES[b.templateId].fit.weight];
      if (weightA !== weightB) return weightA - weightB;
      return WALL_POSTER_TEMPLATE_LIST.findIndex((t) => t.id === a.templateId) -
        WALL_POSTER_TEMPLATE_LIST.findIndex((t) => t.id === b.templateId);
    }
  );
}

export type WallPosterRecommendation = {
  templateId: WallPosterTemplateId;
  version: number;
  band: WallPosterLengthBand;
  score: number;
};

/**
 * **确定性**推荐：同一段文字永远得到同一模板。
 *
 * 为什么必须确定：阶段 2-B 把模板 ID 写进数据库之前，重开 App / 详情页回看也
 * 不能重新摇一次（§10 "排版结果必须稳定"）。随机只发生在发布前的候选生成。
 */
export function recommendWallPoster(content: string): WallPosterRecommendation {
  const ranked = rankWallPosterTemplates(content);
  const best = ranked[0] ?? {
    templateId: 'plainEssay' as WallPosterTemplateId,
    version: WALL_POSTER_TEMPLATES.plainEssay.version,
    band: 'medium' as WallPosterLengthBand,
    score: 0,
  };
  return {
    templateId: best.templateId,
    version: best.version,
    band: best.band,
    score: best.score,
  };
}

/** FNV-1a：给"换一批"提供稳定的基准种子（同一段文字的初始候选可复现） */
export function wallPosterSeed(content: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32：小、快、确定；只为"有限随机"服务，不做密码学用途 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const FIT_WEIGHT: Record<'light' | 'medium' | 'heavy', number> = {
  light: 1,
  medium: 0.8,
  // 深蓝是信息流里最重的底色：同样分数下出现概率更低（§六 D「不要过度使用」）
  heavy: 0.55,
};

/** 按分数加权、无放回地抽 `count` 个（随机只在这一步发生） */
function pickWeighted(
  pool: readonly WallPosterTemplateEvaluation[],
  count: number,
  random: () => number
): WallPosterTemplateEvaluation[] {
  const remaining = [...pool];
  const picked: WallPosterTemplateEvaluation[] = [];
  while (picked.length < count && remaining.length > 0) {
    const weights = remaining.map((item) => {
      const base = Math.max(1, item.score - 55);
      return base * FIT_WEIGHT[WALL_POSTER_TEMPLATES[item.templateId].fit.weight];
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let ticket = random() * total;
    let chosen = remaining.length - 1;
    for (let index = 0; index < remaining.length; index += 1) {
      ticket -= weights[index];
      if (ticket <= 0) {
        chosen = index;
        break;
      }
    }
    picked.push(remaining[chosen]);
    remaining.splice(chosen, 1);
  }
  return picked;
}

export type WallPosterCandidate = {
  templateId: WallPosterTemplateId;
  version: number;
  band: WallPosterLengthBand;
  score: number;
};

export type GenerateWallPosterCandidatesOptions = {
  /** 最多给几个（默认 3；可用模板不足时**少于 3 个也不硬凑**） */
  count?: number;
  /** 注入种子（测试 / "换一批"） */
  seed?: number;
  /** 上一批的模板：优先换掉（§8.3「换一批应优先提供不同组合」） */
  exclude?: readonly WallPosterTemplateId[];
};

/**
 * 生成发布前的候选排版（约 3 种）。
 *
 * 只从**通过硬约束**的模板里抽，且"换一批"会优先避开上一批；
 * 如果可用模板只有 1–2 种，就返回 1–2 种，⛔ 不用明显不合适的布局凑数。
 */
export function generateWallPosterCandidates(
  content: string,
  options: GenerateWallPosterCandidatesOptions = {}
): WallPosterCandidate[] {
  const profile = analyzeWallText(content);
  const ranked = rankWallPosterTemplates(content);
  const eligible = ranked.filter((item) => item.eligible);
  // plainEssay 的约束覆盖所有长度，理论上不会空；兜底避免"预览无方案"
  const pool = eligible.length > 0 ? eligible : ranked.slice(-1);
  const count = clamp(Math.floor(options.count ?? 3), 1, pool.length);
  const exclude = new Set(options.exclude ?? []);
  const baseSeed = options.seed ?? wallPosterSeed(content);

  let picked = pickWeighted(pool, count, createRandom(baseSeed));
  for (let attempt = 1; attempt < 6; attempt += 1) {
    // 没有上一批要避开，或已经换出新组合 → 结束
    if (exclude.size === 0 || picked.some((item) => !exclude.has(item.templateId))) break;
    picked = pickWeighted(pool, count, createRandom((baseSeed + attempt * 0x9e3779b1) >>> 0));
  }

  return picked
    .map<WallPosterCandidate>((item) => ({
      templateId: item.templateId,
      version: item.version,
      band: wallPosterBandOf(profile),
      score: item.score,
    }))
    .sort((a, b) => b.score - a.score);
}

/** 实测行数超限时的下一站；返回 `null` 表示已到最终站（plainEssay） */
export function wallPosterFallback(id: WallPosterTemplateId): WallPosterTemplateId | null {
  const next = wallPosterTemplate(id).fallback;
  return next === id ? null : next;
}

/**
 * 渲染前的行数估算（§8.1 "估计或实际渲染后的行数"）。
 *
 * ⚠️ 只是估算：中文 / 英文 / Emoji 的真实断行由平台排版决定，所以**不能**拿它
 *    决定截断或缩字号；渲染后仍由 `onTextLayout` 复核（§8.4）。
 *    这里用于测试、以及阶段 2-B 发布预览的初始提示。
 */
export function estimateWallPosterLines(
  content: string,
  id: WallPosterTemplateId,
  textWidth: number
): number {
  if (!Number.isFinite(textWidth) || textWidth <= 0) return 0;
  const profile = analyzeWallText(content);
  const band = wallPosterBandOf(profile);
  const size = resolveFontMetrics(wallPosterTypeStyle(id, band).role).size;

  let lines = 0;
  for (const paragraph of content.split('\n')) {
    if (paragraph.trim() === '') {
      lines += 1;
      continue;
    }
    let width = 0;
    for (const ch of paragraph) {
      const cp = ch.codePointAt(0);
      if (cp === undefined) continue;
      width += charWidthEm(cp) * size;
    }
    lines += Math.max(1, Math.ceil(width / textWidth));
  }
  return lines;
}
