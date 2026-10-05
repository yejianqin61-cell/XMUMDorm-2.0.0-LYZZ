/**
 * P1-03 · 字阶落地（关 TD-44）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：角色 ↔ 数值 1:1、单调性、M3 官方数值与会话内**独立内联**的官方表一致
 *   S-1 组件契约：`Text` 真的把字号/行高/字距渲染出来；`allowFontScaling` 与上限
 *   S-5 结构约束：`app/src` 内 0 处**数字**字号字面量；令牌源里 0 个数字字号；
 *                两条同源正则（尺子 + P0 测试）**必须成对**
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/design-system/theme';
import { Text } from '@/components/ui/Text';
import {
  LABEL_MAX_FONT_SCALE,
  TEXT_ROLES,
  resolveFontMetrics,
  type TextRole,
} from '@/design-system/typography';
import { scale } from '@/design-system/tokens';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SRC_ROOT = path.resolve(__dirname, '..');

/**
 * **独立的事实源**：M3 官方 15 档中的本项目所用 7 档。
 * 这份表是**故意内联**的（不 import 生成物）—— 否则就是"拿代码验证代码"（同义反复）。
 * 抄录自 AndroidX `TypeScaleTokens.kt`（`VERSION: v0_103`），访问日期 2026-10-02。
 */
const OFFICIAL_M3 = {
  displayLarge: { size: 57, lineHeight: 64, tracking: -0.2 },
  headlineLarge: { size: 32, lineHeight: 40, tracking: 0 },
  headlineSmall: { size: 24, lineHeight: 32, tracking: 0 },
  bodyMedium: { size: 14, lineHeight: 20, tracking: 0.2 },
  titleMedium: { size: 16, lineHeight: 24, tracking: 0.2 },
  bodySmall: { size: 12, lineHeight: 16, tracking: 0.4 },
} as const;

const ROLE_TO_M3: Record<TextRole, keyof typeof OFFICIAL_M3> = {
  display: 'displayLarge',
  title: 'headlineLarge',
  headline: 'headlineSmall',
  body: 'bodyMedium',
  label: 'titleMedium',
  caption: 'bodySmall',
  mono: 'bodyMedium',
};

function walkSrc(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('TC-P1-03-1A · 生成物里的数值逐字等于 M3 官方表（独立来源核对）', () => {
  it.each(Object.keys(ROLE_TO_M3) as TextRole[])('%s 的 size/lineHeight/tracking 与官方一致', (role) => {
    const m3 = ROLE_TO_M3[role];
    const official = OFFICIAL_M3[m3];
    const metrics = resolveFontMetrics(role);
    expect(metrics.m3).toBe(m3);
    expect(metrics.size).toBe(official.size);
    expect(metrics.lineHeight).toBe(official.lineHeight);
    expect(metrics.tracking).toBe(official.tracking);
  });

  it('生成物导出的是同一个对象（没有第二份表）', () => {
    // ⛔ 从 `scale`（非颜色令牌总表）取，不从 tokens.ts 单独 import —— 令牌层入口只重导出既定面
    expect(scale.fontMetrics.font_metric_display.size).toBe(57);
  });
});

describe('TC-P1-03-2A · 角色 ↔ 数值 1:1', () => {
  it('7 个角色各有数值，且键集合与 TEXT_ROLES 一一对应', () => {
    expect(TEXT_ROLES).toHaveLength(7);
    expect(Object.keys(scale.fontMetrics)).toHaveLength(7);
    for (const role of TEXT_ROLES) {
      expect(resolveFontMetrics(role)).toBeDefined();
      expect(typeof resolveFontMetrics(role).size).toBe('number');
    }
  });
});

describe('TC-P1-03-3A · 字阶单调性（层级必须看得出来）', () => {
  const size = (role: TextRole): number => resolveFontMetrics(role).size;

  it('display > title > headline > label ≥ body > caption', () => {
    expect(size('display')).toBeGreaterThan(size('title'));
    expect(size('title')).toBeGreaterThan(size('headline'));
    expect(size('headline')).toBeGreaterThan(size('label'));
    expect(size('label')).toBeGreaterThanOrEqual(size('body'));
    expect(size('body')).toBeGreaterThan(size('caption'));
  });

  it('label 不小于 body（CTA 文字不得小于正文）', () => {
    expect(size('label')).toBeGreaterThanOrEqual(size('body'));
  });
});

describe('TC-P1-03-4A · Text 真的把数值渲染出来', () => {
  const renderText = (role: TextRole, props: Record<string, unknown> = {}) =>
    render(
      <ThemeProvider source="dark" systemScheme="dark">
        <Text role={role} testID="t" {...props}>
          字号
        </Text>
      </ThemeProvider>
    );

  it.each(['display', 'title', 'headline', 'body', 'label', 'caption', 'mono'] as TextRole[])(
    'role=%s 渲染出 size / lineHeight / letterSpacing',
    async (role) => {
      const { getByTestId } = await renderText(role);
      const metrics = resolveFontMetrics(role);
      expect(getByTestId('t')).toHaveStyle({
        fontSize: metrics.size,
        lineHeight: metrics.lineHeight,
        letterSpacing: metrics.tracking,
      });
    }
  );

  it('mono 仍开 tabular-nums（不为此换字体，2.5-6）', async () => {
    const { getByTestId } = await renderText('mono');
    expect(getByTestId('t')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });
});

describe('TC-P1-03-5A · 2.5-7：allowFontScaling 开启，且关键布局有上限', () => {
  const renderText = (role: TextRole, props: Record<string, unknown> = {}) =>
    render(
      <ThemeProvider source="dark" systemScheme="dark">
        <Text role={role} testID="t" {...props}>
          缩放
        </Text>
      </ThemeProvider>
    );

  it('⛔ 不关掉缩放；role=label（按钮/Tab/表单标签，容器高固定）有上限', async () => {
    const { getByTestId } = await renderText('label');
    const node = getByTestId('t');
    expect(node.props.allowFontScaling).toBe(true);
    expect(node.props.maxFontSizeMultiplier).toBe(LABEL_MAX_FONT_SCALE);
  });

  it('长文角色不设上限（应当能无限放大）', async () => {
    const { getByTestId } = await renderText('body');
    expect(getByTestId('t').props.allowFontScaling).toBe(true);
    expect(getByTestId('t').props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('调用点可以覆盖上限', async () => {
    const { getByTestId } = await renderText('body', { maxFontSizeMultiplier: 2 });
    expect(getByTestId('t').props.maxFontSizeMultiplier).toBe(2);
  });
});

describe('TC-P1-03-6A · 令牌源里 0 个数字字号（只有 M3 档位名）', () => {
  it('每个 --font-metric-* 的值都是字母组成的 M3 档位名', () => {
    const css = fs.readFileSync(path.join(REPO_ROOT, 'tokens/design-tokens.css'), 'utf8');
    const lines = css.split(/\r?\n/).filter((l) => /^\s*--font-metric-/.test(l));
    expect(lines).toHaveLength(7);
    for (const line of lines) {
      const value = line.split(':')[1]?.replace(/;.*$/, '').trim() ?? '';
      expect(value).toMatch(/^[A-Za-z]+$/);
    }
  });
});

describe('TC-P1-03-7A · 生成器内置了 M3 官方表（含来源与访问日期）', () => {
  const gen = fs.readFileSync(path.join(REPO_ROOT, 'scripts/gen-tokens.js'), 'utf8');

  it('表里有 15 档', () => {
    const table = gen.split('const M3_TYPE_SCALE = {')[1]?.split('};')[0] ?? '';
    const entries = table.match(/\{ size: \d+, lineHeight: \d+, weight: \d+, tracking: -?[\d.]+ \}/g) ?? [];
    expect(entries).toHaveLength(15);
  });

  it('注明了一手来源 URL 与访问日期（宪法 15.2-1：不得凭记忆写官方数值）', () => {
    expect(gen).toContain('TypeScaleTokens.kt');
    expect(gen).toContain('访问日期');
    expect(gen).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('自校验函数存在，且被 main 调用（角色↔数值 1:1 / 单调性）', () => {
    expect(gen).toContain('function validateFontMetrics');
    expect(gen).toContain('validateFontMetrics(scales)');
    expect(gen).toContain('字阶单调性被破坏');
  });
});

describe('TC-P1-03-8A · 口径成对：尺子与 P0 测试必须同时收紧为「只拦数字」', () => {
  const rulerSrc = fs.readFileSync(path.join(REPO_ROOT, 'scripts/design-debt-report.js'), 'utf8');
  const p0Src = fs.readFileSync(path.join(SRC_ROOT, '__tests__/p0-02-tokens.test.ts'), 'utf8');

  /** 取出的是**JS 源码里的字符串字面量内容**（含 `\\s` 这种转义），需还原成真正的正则源 */
  const rawPattern = rulerSrc.match(/fontSizeLiterals'[\s\S]{0,200}?src: '([^']+)'/)?.[1] ?? '';
  const pattern = rawPattern.replace(/\\\\/g, '\\');
  const rulerRe = new RegExp(pattern);

  it('尺子里的正则确实是「fontSize 后跟数字」', () => {
    expect(pattern).toBe('fontSize\\s*:\\s*[0-9]');
  });

  it('⛔ 不可退让点：裸数字 `fontSize: 16` 仍必须被拦', () => {
    expect(rulerRe.test('{ fontSize: 16 }')).toBe(true);
    expect(rulerRe.test('fontSize:16')).toBe(true);
    expect(rulerRe.test('fontSize:  0')).toBe(true);
  });

  it('合规写法（取生成物数值）不被误拦', () => {
    expect(rulerRe.test('{ fontSize: metrics.size }')).toBe(false);
    expect(rulerRe.test('{ fontSize: resolveFontMetrics(role).size }')).toBe(false);
  });

  it('P0 测试里的 FONT_SIZE_RE 与尺子**同源同口径**（防止只改一处）', () => {
    const m = p0Src.match(/const FONT_SIZE_RE = \/(.+?)\/;/);
    expect(m).not.toBeNull();
    expect(new RegExp(m![1]).source).toBe(rulerRe.source);
  });
});

describe('TC-P1-03-9A · app/src 内 0 处数字字号字面量（新口径下仍为 0）', () => {
  const pattern = (
    fs
      .readFileSync(path.join(REPO_ROOT, 'scripts/design-debt-report.js'), 'utf8')
      .match(/fontSizeLiterals'[\s\S]{0,200}?src: '([^']+)'/)![1]
  ).replace(/\\\\/g, '\\');
  const rulerRe = new RegExp(pattern);

  it('逐文件扫描，命中数必须为 0', () => {
    const offenders: string[] = [];
    for (const file of walkSrc(SRC_ROOT)) {
      const text = fs.readFileSync(file, 'utf8');
      if (rulerRe.test(text)) offenders.push(path.relative(REPO_ROOT, file));
    }
    expect(offenders).toEqual([]);
  });
});
