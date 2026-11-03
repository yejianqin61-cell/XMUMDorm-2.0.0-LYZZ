/**
 * 阶段 2 · 文字海报渲染：与信息流 / 详情共用同一个组件
 *
 * 守护（任务书 §8.4 / §9 / §11）：
 *   · 卡片只换文字区，不换外壳；颜色 / 对齐 / 字阶来自模板配置；
 *   · 正文**完整渲染**（没有 numberOfLines 截断）；
 *   · 原生排版回报的行数超过模板容量时，按配置链回退到更适合阅读的模板；
 *   · 未指定模板时按正文**确定性**推荐（两处渲染得到同一模板）。
 */

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { act, type RenderResult } from '@testing-library/react-native';

import { darkColors } from '@/design-system/tokens';
import { resolveFontMetrics } from '@/design-system/typography';
import { WallPosterBody } from '@/features/campus/WallPosterBody';
import { WallFreePostText } from '@/features/campus/WallFreePostBody';
import { WALL_POSTER_TEMPLATE_LIST } from '@/features/campus/wallPosterTemplates';
import { renderApp } from './helpers/renderApp';

const SHORT_ZH = '有没有人知道学校哪里最适合自习？';
const LONG_ZH =
  '最近在整理这学期的时间表，发现真正完整空出来的晚上其实没有几个。白天上课、下午社团、晚上赶作业，周末还要补实验报告。\n\n很想问问大家是怎么安排休息的？我现在基本靠周日睡到中午补回来，但周一又会特别困。有没有更稳定的办法？';

/** 一个树里放五种模板：既省 renderApp 的"一例一渲染"，也能同屏比较 */
function AllTemplates({ content }: { content: string }): React.ReactElement {
  return (
    <>
      {WALL_POSTER_TEMPLATE_LIST.map((template) => (
        <WallPosterBody
          key={template.id}
          content={content}
          templateId={template.id}
          allowFallback={false}
        />
      ))}
    </>
  );
}

/** 模拟原生排版回报（真实的 `onTextLayout` 在 Jest 里不会触发） */
async function reportMeasuredLines(view: RenderResult, count: number): Promise<void> {
  const text = view.getByTestId('wall-free-text');
  const handler = text.props.onTextLayout;
  expect(typeof handler).toBe('function');
  await act(async () => {
    handler({
      nativeEvent: {
        lines: Array.from({ length: count }, (_, index) => ({ index, height: 32 })),
      },
    });
  });
}

describe('阶段 2 · 海报渲染', () => {
  it('短中文自动落到蓝色居中：居中 + 品牌文字色 + headline 字阶', async () => {
    const view = await renderApp(<WallPosterBody content={SHORT_ZH} />);

    expect(view.getByTestId('wall-poster-blueCenter')).toBeTruthy();
    const style = StyleSheet.flatten(view.getByTestId('wall-free-text').props.style);
    expect(style.textAlign).toBe('center');
    expect(style.color).toBe(darkColors['text-brand'].value);
    expect(style.fontSize).toBe(resolveFontMetrics('headline').size);
  });

  it('显式模板优先：深蓝使用主色填充 + 白字，不再按正文重选', async () => {
    const view = await renderApp(
      <WallPosterBody content="Anyone up for a slow run tonight?" templateId="deepBlue" />
    );

    expect(view.getByTestId('wall-poster-deepBlue')).toBeTruthy();
    const frame = StyleSheet.flatten(view.getByTestId('wall-poster-deepBlue').props.style);
    expect(frame.backgroundColor).toBe(darkColors['action-primary'].value);
    const style = StyleSheet.flatten(view.getByTestId('wall-free-text').props.style);
    expect(style.color).toBe(darkColors['text-on-fill'].value);
  });

  it('正文完整渲染：没有 numberOfLines，原文一字不改', async () => {
    const view = await renderApp(<WallPosterBody content={LONG_ZH} />);
    const text = view.getByText(LONG_ZH);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.children).toBe(LONG_ZH);
  });

  it('长文不会自动落到蓝色居中 / 深蓝（真实推荐遵守硬约束）', async () => {
    const view = await renderApp(<WallPosterBody content={LONG_ZH} />);

    expect(view.queryByTestId('wall-poster-blueCenter')).toBeNull();
    expect(view.queryByTestId('wall-poster-deepBlue')).toBeNull();
    expect(
      view.queryByTestId('wall-poster-minimalLeft') ??
        view.queryByTestId('wall-poster-plainEssay')
    ).toBeTruthy();
  });

  it('实测行数超限时自动回退：蓝色居中 → 极简左对齐', async () => {
    const view = await renderApp(<WallPosterBody content={SHORT_ZH} templateId="blueCenter" />);
    expect(view.getByTestId('wall-poster-blueCenter')).toBeTruthy();

    await reportMeasuredLines(view, 12);

    expect(view.getByTestId('wall-poster-minimalLeft')).toBeTruthy();
    expect(view.queryByTestId('wall-poster-blueCenter')).toBeNull();
    // 回退只换版式：原文仍是完整的一段
    expect(view.getByText(SHORT_ZH)).toBeTruthy();
  });

  it('关闭回退时如实展示所选模板（预览"全部模板"用）', async () => {
    const view = await renderApp(
      <WallPosterBody content={SHORT_ZH} templateId="blueCenter" allowFallback={false} />
    );

    await reportMeasuredLines(view, 12);

    expect(view.getByTestId('wall-poster-blueCenter')).toBeTruthy();
    expect(view.queryByTestId('wall-poster-minimalLeft')).toBeNull();
  });

  it('五种模板都能渲染，且各自的底色来自语义令牌', async () => {
    const view = await renderApp(<AllTemplates content={SHORT_ZH} />);

    const frames = new Map(
      WALL_POSTER_TEMPLATE_LIST.map((template) => [
        template.id,
        StyleSheet.flatten(view.getByTestId(`wall-poster-${template.id}`).props.style),
      ])
    );
    const colors = [...frames.values()].map((frame) => frame.backgroundColor);
    expect(colors).toContain(darkColors['bg-brand-soft'].value);
    expect(colors).toContain(darkColors['bg-sunken'].value);
    expect(colors).toContain(darkColors['bg-accent-soft'].value);
    expect(colors).toContain(darkColors['action-primary'].value);
    // 简洁随笔：不铺底色，融进卡片 / 页面画布（⛔ 不是一块白色内框）
    expect(frames.get('plainEssay')?.backgroundColor).toBeUndefined();
  });

  it('确定性：同一段文字两处渲染得到同一模板', async () => {
    const view = await renderApp(
      <>
        <WallPosterBody content={SHORT_ZH} testID="first" />
        <WallPosterBody content={SHORT_ZH} testID="second" />
      </>
    );
    expect(view.getAllByTestId('wall-poster-blueCenter')).toHaveLength(2);
  });

  it('详情入口复用同一渲染器（页面正文不是另一套版式）', async () => {
    const view = await renderApp(<WallFreePostText content={SHORT_ZH} />);
    expect(view.getByTestId('wall-free-text-block')).toBeTruthy();
    expect(view.getByTestId('wall-poster-blueCenter')).toBeTruthy();
    expect(view.getByTestId('wall-free-text')).toBeTruthy();
  });
});
