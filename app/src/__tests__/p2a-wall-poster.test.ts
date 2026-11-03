/**
 * 阶段 2 · 文字海报：文字分析 / 模板约束 / 评分 / 候选（纯函数，可测）
 *
 * 守住的口径（任务书 §7–§8）：
 *   · 用**显示宽度**分档，不是字符数（中文一字≈两个英文列）；
 *   · 长文、多段落、长 URL **不会**被推荐成居中 / 大字模板；
 *   · 同一段文字的推荐**确定**（重开 App / 详情页不得换版式）；
 *   · 候选最多 3 个、可用模板不足时**不硬凑**；"换一批"优先给不同组合；
 *   · 五种模板的底色 / 文字色必须是两套主题都存在的 textSafe 语义令牌，
 *     且正文对比度 ≥ 4.5（模板自带底色，不能只靠全局 text-primary 的对比度）。
 */

import { darkColors, lightColors } from '@/design-system/tokens';
import {
  analyzeWallText,
  estimateWallPosterLines,
  generateWallPosterCandidates,
  rankWallPosterTemplates,
  recommendWallPoster,
  wallPosterFallback,
  wallPosterSeed,
} from '@/features/campus/wallPosterLayout';
import {
  WALL_POSTER_TEMPLATE_LIST,
  WALL_POSTER_TEMPLATE_IDS,
  WALL_POSTER_VERSION,
  wallPosterBandFor,
  wallPosterTemplate,
  type WallPosterTemplateId,
} from '@/features/campus/wallPosterTemplates';

const SHORT_ZH = '有没有人知道学校哪里最适合自习？';
const LONG_ZH =
  '最近在整理这学期的时间表，发现真正完整空出来的晚上其实没有几个。白天上课、下午社团、晚上赶作业，周末还要补实验报告。\n\n很想问问大家是怎么安排休息的？我现在基本靠周日睡到中午补回来，但周一又会特别困。有没有更稳定的办法？';
const LONG_EN = 'a'.repeat(300);
const LONG_URL = 'https://a-very-long-example-domain.test/path/to/a/deeply/nested/page';

describe('阶段 2 · 文字特征分析', () => {
  it('中文 / 英文 / 数字 / 空格都按显示列计算', () => {
    const profile = analyzeWallText('A3 通宵');
    expect(profile.chars).toBe(5);
    expect(profile.columns).toBe(7); // A(1)+3(1)+空格(1)+通(2)+宵(2)
    expect(profile.cjk).toBe(2);
    expect(profile.latin).toBe(1);
    expect(profile.digits).toBe(1);
    expect(profile.hasMixedScript).toBe(true);
  });

  it('Emoji 计入列宽与 emoji 数量，但不污染中英文判定', () => {
    const profile = analyzeWallText('好吃 🍗🍚');
    expect(profile.emoji).toBe(2);
    expect(profile.hasEmoji).toBe(true);
    expect(profile.columns).toBe(9); // 好2+吃2+空格1+两个 Emoji 各 2
    expect(profile.cjk).toBe(2);
    expect(profile.latin).toBe(0);
    expect(profile.hasMixedScript).toBe(false);
  });

  it('分段与硬换行分开统计（空行才是一段）', () => {
    const profile = analyzeWallText('第一段\n\n第二段\n第三段');
    expect(profile.paragraphs).toBe(2);
    expect(profile.lineBreaks).toBe(3);
  });

  it('URL 与长英文词被识别（居中模板的主要风险）', () => {
    const profile = analyzeWallText(`看看这个 ${LONG_URL}`);
    expect(profile.hasUrl).toBe(true);
    expect(profile.longestToken).toBeGreaterThan(40);
  });

  it('长度档按列宽切：≤52 短 / ≤170 中 / 更长即长', () => {
    expect(wallPosterBandFor(52)).toBe('short');
    expect(wallPosterBandFor(53)).toBe('medium');
    expect(wallPosterBandFor(170)).toBe('medium');
    expect(wallPosterBandFor(171)).toBe('long');
    expect(analyzeWallText(LONG_ZH).columns).toBeGreaterThan(170);
  });
});

describe('阶段 2 · 模板硬约束', () => {
  it('长文不会进入 A / C / D（蓝底居中、暖纸、深蓝大字）', () => {
    const ranked = rankWallPosterTemplates(LONG_ZH);
    const byId = new Map(ranked.map((item) => [item.templateId, item]));
    expect(byId.get('blueCenter')?.eligible).toBe(false);
    expect(byId.get('warmPaper')?.eligible).toBe(false);
    expect(byId.get('deepBlue')?.eligible).toBe(false);
    expect(byId.get('minimalLeft')?.eligible).toBe(true);
    expect(byId.get('plainEssay')?.eligible).toBe(true);
  });

  it('超长英文（过宽）连极简也装不下时，只剩简洁随笔', () => {
    const ranked = rankWallPosterTemplates(LONG_EN);
    const eligible = ranked.filter((item) => item.eligible).map((item) => item.templateId);
    expect(eligible).toEqual(['plainEssay']);
  });

  it('多段落会排除居中 / 深蓝（它们只适合 1–2 段）', () => {
    const ranked = rankWallPosterTemplates('一\n\n二\n\n三\n\n四');
    const byId = new Map(ranked.map((item) => [item.templateId, item]));
    expect(byId.get('blueCenter')?.eligible).toBe(false);
    expect(byId.get('deepBlue')?.eligible).toBe(false);
    expect(byId.get('warmPaper')?.eligible).toBe(false); // 最多 3 段
    expect(byId.get('minimalLeft')?.eligible).toBe(true);
  });

  it('长 URL 不会塞进居中 / 大字模板', () => {
    const profile = analyzeWallText(`链接：${LONG_URL}`);
    const ranked = rankWallPosterTemplates(`链接：${LONG_URL}`);
    const byId = new Map(ranked.map((item) => [item.templateId, item]));
    expect(profile.longestToken).toBeGreaterThan(wallPosterTemplate('blueCenter').limits.maxTokenLength);
    expect(byId.get('blueCenter')?.eligible).toBe(false);
    expect(byId.get('deepBlue')?.eligible).toBe(false);
  });

  it('每种模板都声明了可检查的容量边界与回退链', () => {
    for (const template of WALL_POSTER_TEMPLATE_LIST) {
      expect(template.version).toBe(WALL_POSTER_VERSION);
      expect(template.limits.maxLines).toBeGreaterThan(0);
      expect(template.limits.maxColumns).toBeGreaterThanOrEqual(template.limits.minColumns);
      // 回退链最多两步，且最终站是 plainEssay（不能形成环）
      let current: WallPosterTemplateId = template.id;
      const visited = new Set<WallPosterTemplateId>([current]);
      for (let step = 0; step < 3; step += 1) {
        const next = wallPosterFallback(current);
        if (next === null) break;
        expect(visited.has(next)).toBe(false);
        visited.add(next);
        current = next;
      }
      if (template.id === 'plainEssay') {
        expect(wallPosterFallback('plainEssay')).toBeNull();
      } else {
        expect(visited.has('plainEssay')).toBe(true);
      }
    }
  });
});

describe('阶段 2 · 推荐确定性', () => {
  it('短中文稳定推荐蓝色居中（分数并列时按视觉轻 × 配置顺序收敛）', () => {
    const first = recommendWallPoster(SHORT_ZH);
    const second = recommendWallPoster(SHORT_ZH);
    expect(first.templateId).toBe('blueCenter');
    expect(second.templateId).toBe(first.templateId);
    expect(second.version).toBe(first.version);
    expect(second.band).toBe('short');
  });

  it('同一段长文每次得到同一模板（详情 / 重开不得重新摇）', () => {
    expect(recommendWallPoster(LONG_ZH).templateId).toBe(recommendWallPoster(LONG_ZH).templateId);
  });

  it('推荐只从通过硬约束的模板里出', () => {
    for (const content of [SHORT_ZH, LONG_ZH, LONG_EN, LONG_URL, '一\n\n二\n\n三\n\n四']) {
      const recommended = recommendWallPoster(content);
      const ranked = rankWallPosterTemplates(content);
      const target = ranked.find((item) => item.templateId === recommended.templateId);
      expect(target?.eligible).toBe(true);
    }
  });
});

describe('阶段 2 · 候选生成与换一批', () => {
  it('短中文给 3 个互不重复的有效候选', () => {
    const candidates = generateWallPosterCandidates(SHORT_ZH);
    expect(candidates).toHaveLength(3);
    expect(new Set(candidates.map((item) => item.templateId)).size).toBe(3);
    const ranked = rankWallPosterTemplates(SHORT_ZH);
    for (const candidate of candidates) {
      expect(ranked.find((item) => item.templateId === candidate.templateId)?.eligible).toBe(true);
    }
  });

  it('长文只给 2 个候选，不硬凑第三个', () => {
    const candidates = generateWallPosterCandidates(LONG_ZH);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((item) => item.templateId).sort()).toEqual(['minimalLeft', 'plainEssay']);
  });

  it('同种子结果稳定（可复现）', () => {
    const a = generateWallPosterCandidates(SHORT_ZH, { seed: 12345 });
    const b = generateWallPosterCandidates(SHORT_ZH, { seed: 12345 });
    expect(b.map((item) => item.templateId)).toEqual(a.map((item) => item.templateId));
  });

  it('换一批优先给未出现过的组合', () => {
    const first = generateWallPosterCandidates(SHORT_ZH, { seed: wallPosterSeed(SHORT_ZH) });
    const second = generateWallPosterCandidates(SHORT_ZH, {
      seed: (wallPosterSeed(SHORT_ZH) + 7919) >>> 0,
      exclude: first.map((item) => item.templateId),
    });
    expect(second).toHaveLength(3);
    expect(second.some((item) => !first.some((old) => old.templateId === item.templateId))).toBe(
      true
    );
  });

  it('候选数量不会超过可用模板数', () => {
    const candidates = generateWallPosterCandidates(LONG_EN, { count: 3 });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].templateId).toBe('plainEssay');
  });
});

describe('阶段 2 · 行数估算（渲染前的粗测）', () => {
  it('长文估算的行数大于短句', () => {
    const shortLines = estimateWallPosterLines(SHORT_ZH, 'blueCenter', 294);
    const longLines = estimateWallPosterLines(LONG_ZH, 'plainEssay', 294);
    expect(shortLines).toBeGreaterThanOrEqual(1);
    expect(longLines).toBeGreaterThan(shortLines);
  });

  it('宽度非法时不猜（返回 0，交给渲染期实测）', () => {
    expect(estimateWallPosterLines(SHORT_ZH, 'blueCenter', 0)).toBe(0);
    expect(estimateWallPosterLines(SHORT_ZH, 'blueCenter', Number.NaN)).toBe(0);
  });
});

describe('阶段 2 · 模板配色契约', () => {
  /** WCAG 2.x 相对亮度 */
  function luminance(hex: string): number {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
    const [r, g, b] = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a: string, b: string): number {
    const la = luminance(a);
    const lb = luminance(b);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  }

  it('五个模板 ID 固定、顺序固定（A–E）', () => {
    expect(WALL_POSTER_TEMPLATE_IDS).toEqual([
      'blueCenter',
      'minimalLeft',
      'warmPaper',
      'deepBlue',
      'plainEssay',
    ]);
  });

  it.each(['light', 'dark'] as const)('%s 主题：贴纸正文对比度 ≥ 4.5', (theme) => {
    const tokens = theme === 'light' ? lightColors : darkColors;
    for (const template of WALL_POSTER_TEMPLATE_LIST) {
      // plainEssay 不铺底色：它落在卡片 / 页面画布上，按 canvas 校验
      const background = tokens[template.backgroundToken ?? 'bg-canvas'];
      const text = tokens[template.textToken];
      expect(`${template.id}:${text.textSafe}`).toBe(`${template.id}:true`);
      expect(`${template.id}:${contrast(background.value, text.value) >= 4.5}`).toBe(
        `${template.id}:true`
      );
    }
  });

  it('深蓝是唯一 heavy 模板（信息流不得出现连续深色）', () => {
    const heavy = WALL_POSTER_TEMPLATE_LIST.filter((template) => template.fit.weight === 'heavy');
    expect(heavy.map((template) => template.id)).toEqual(['deepBlue']);
  });
});
