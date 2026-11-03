/**
 * 阶段 2 · 文字海报实验页（节点 A 的实机预览入口）
 *
 * 守住：样本可切换、候选可切换、「换一批」真的换、长文只给有效模板且"全部模板"
 * 如实标出不适合的模板（⛔ 不把五种模板都说成推荐）。
 */

import * as React from 'react';
import { fireEvent, waitFor, type RenderResult } from '@testing-library/react-native';

import { WallPosterLab } from '@/features/campus/WallPosterLab';
import {
  WALL_POSTER_TEMPLATE_LIST,
  type WallPosterTemplateId,
} from '@/features/campus/wallPosterTemplates';
import { WALL_POSTER_LAB_CASES } from '@/features/campus/wallPosterLabCases';
import { renderApp } from './helpers/renderApp';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
    setParams: jest.fn(),
  }),
}));

function candidateIds(view: RenderResult): WallPosterTemplateId[] {
  return WALL_POSTER_TEMPLATE_LIST.map((template) => template.id).filter(
    (id) => view.queryByTestId(`wall-poster-candidate-${id}`) !== null
  );
}

describe('阶段 2 · 文字海报实验页', () => {
  it('样本齐全，默认展示短中文的候选与预览卡', async () => {
    const view = await renderApp(<WallPosterLab />);

    await waitFor(() => expect(view.getByTestId('wall-poster-lab')).toBeTruthy());
    for (const item of WALL_POSTER_LAB_CASES) {
      expect(view.getByTestId(`wall-poster-case-${item.key}`)).toBeTruthy();
    }
    expect(candidateIds(view)).toHaveLength(3);
    // 预览卡与"全部模板"都在：整页同时存在多个 wall-free-body
    expect(view.getAllByTestId('wall-free-body').length).toBeGreaterThanOrEqual(6);
  });

  it('「换一批」优先给出不同候选组合', async () => {
    const view = await renderApp(<WallPosterLab />);
    await waitFor(() => expect(view.getByTestId('wall-poster-reroll')).toBeTruthy());

    const before = candidateIds(view);
    fireEvent.press(view.getByTestId('wall-poster-reroll'));

    await waitFor(() => expect(candidateIds(view)).not.toEqual(before));
    expect(candidateIds(view)).toHaveLength(3);
  });

  it('切到长中文：只留下能容纳长文的模板，全部模板里标出"不推荐"', async () => {
    const view = await renderApp(<WallPosterLab />);
    await waitFor(() => expect(view.getByTestId('wall-poster-case-longZh')).toBeTruthy());

    fireEvent.press(view.getByTestId('wall-poster-case-longZh'));

    await waitFor(() => expect(candidateIds(view).sort()).toEqual(['minimalLeft', 'plainEssay']));
    expect(view.queryByTestId('wall-poster-candidate-blueCenter')).toBeNull();
    // 全部模板仍然逐张展示，并如实标注不适合（蓝色居中 + 长文）
    expect(view.getByText('蓝色居中 · 不推荐')).toBeTruthy();
    expect(view.getByText('简洁随笔 · 适用')).toBeTruthy();
  });
});
