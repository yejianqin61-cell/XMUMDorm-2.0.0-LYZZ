/**
 * 阶段A-05 · 全屏图片预览的安全区（D-1：补丙的 Modal）
 *
 * 覆盖层从唯一安全区容器取 insets：预览的关闭钮/保存钮/页码不被状态栏与手势条压住。
 * 不在 Screen 内时退回主题间距，不抛错（裸渲染用例也不变）。
 */
import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TreeholeMedia } from '@/features/campus/TreeholeMedia';
import { renderApp, TEST_METRICS } from './helpers/renderApp';

const urls = ['https://assets.example.test/a.png'];
const preview = async (view: Awaited<ReturnType<typeof renderApp>>) => {
  await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
  return view.getByTestId('treehole-media-preview-dialog');
};

describe('全屏预览安全区（阶段A-05）', () => {
  it('在 Screen 内：顶部与底部让出真实 inset', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />, {
      inScreen: true,
    });
    const dialog = await preview(view);
    const style = StyleSheet.flatten(dialog.props.style);
    expect(style.paddingTop).toBe(TEST_METRICS.insets.top);
    expect(style.paddingBottom).toBe(TEST_METRICS.insets.bottom);
  });

  it('不在 Screen 内：退回主题间距，不抛错', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    const dialog = await preview(view);
    const style = StyleSheet.flatten(dialog.props.style);
    expect(style.paddingTop).toBe(0);
    expect(style.paddingBottom).toBe(0);
    expect(view.getByTestId('treehole-media-preview-image')).toBeTruthy();
  });

  it('预览内关闭钮仍可用', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />, {
      inScreen: true,
    });
    await preview(view);
    await fireEvent.press(view.getByLabelText('关闭'));
    expect(view.queryByTestId('treehole-media-preview-image')).toBeNull();
  });
});
