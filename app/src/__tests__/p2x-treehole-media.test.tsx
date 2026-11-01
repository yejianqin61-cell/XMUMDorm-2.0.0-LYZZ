/**
 * P2X TreeholeMedia（feed 静态 / detail 横向 swiper）
 *
 * 2026-10-31 所有者验收后的回归：
 * - 详情不再有灰盒衬底、不再 16:9 叠卡；图与正文同栏、自带 12 圆角；
 * - 翻页是**横向**的一页一张；首/末页继续滑只回弹（⛔ 不循环）；
 * - 单图不显示"第 X 张 / 共 X 张"；
 * - 全屏看图器同一套横向逻辑，且只有图与计数（没有帖子文字 / 评论）。
 */

import * as React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  resolveTreeholePage,
  resolveTreeholeSwipe,
  treeholeDetailAspect,
  treeholeDetailHeight,
  treeholeFeedAspect,
  treeholeMediaKey,
  TreeholeMedia,
} from '@/features/campus/TreeholeMedia';
import { renderApp } from './helpers/renderApp';

const urls = ['https://example.com/one.jpg', 'https://example.com/two.jpg', 'https://example.com/three.jpg'];

describe('P2X TreeholeMedia · 信息流', () => {
  /** 模拟列表给正文列量宽度（Jest 里没有真实布局，onLayout 不会自己触发） */
  const layout = (view: Awaited<ReturnType<typeof renderApp>>, width: number) =>
    fireEvent(view.getByTestId('treehole-media-feed'), 'layout', {
      nativeEvent: { layout: { width, height: 0, x: 0, y: 0 } },
    });

  it('列表三图按 3 列方格全部展示（不再用数量徽标代替第三张）', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="feed" />);
    // 2026-10-30：三图及以上 = 3 列方格，图本身圆角、无衬底
    expect(view.getByTestId('treehole-media-feed-image')).toBeTruthy();
    expect(view.getByTestId('treehole-media-feed-image-1')).toBeTruthy();
    expect(view.getByTestId('treehole-media-feed-image-2')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-count')).toBeNull();
    expect(view.getByTestId('treehole-media-feed-row')).toHaveStyle({ flexDirection: 'row', gap: 8 });
    // 量到正文列宽 320 后：(320 − 8×2) / 3 = 101.33 → 101，宽高相等 = 正方形
    await layout(view, 320);
    expect(view.getByTestId('treehole-media-feed-frame')).toHaveStyle({ width: 101, height: 101 });
    expect(view.getByTestId('treehole-media-feed-frame-2')).toHaveStyle({ width: 101, height: 101 });
    expect(view.queryByTestId('treehole-media-drag-area')).toBeNull();
  });

  it('列表两图各占一半、正方形、8dp 白缝，不套灰底画框', async () => {
    const view = await renderApp(
      <TreeholeMedia postId={7} urls={[urls[0], urls[1]]} mode="feed" />
    );
    expect(view.getByTestId('treehole-media-feed-image')).toBeTruthy();
    expect(view.getByTestId('treehole-media-feed-image-1')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-feed-image-2')).toBeNull();
    expect(view.queryByTestId('treehole-media-count')).toBeNull();
    expect(view.getByTestId('treehole-media-feed-row')).toHaveStyle({ flexDirection: 'row', gap: 8 });
    // 量到列宽 320 后：(320 − 8) / 2 = 156，宽高相等
    await layout(view, 320);
    const frame = view.getByTestId('treehole-media-feed-frame');
    expect(frame).toHaveStyle({ width: 156, height: 156, borderRadius: 12, overflow: 'hidden' });
    // 圆角裁在图片像素上，框本身没有底色 → 不再有灰盒衬底
    expect(JSON.stringify(frame.props.style)).not.toContain('backgroundColor');
    expect(view.getByTestId('treehole-media-feed-image').props.contentFit).toBe('cover');
  });

  it('双图格子不跟原图比例变形（2026-10-31 真机回归：曾渲染成 427×199 扁条）', async () => {
    const view = await renderApp(
      <TreeholeMedia postId={7} urls={[urls[0], urls[1]]} mode="feed" />
    );
    await layout(view, 320);
    // 两张 2000×600 的超宽原图加载完成，格子仍是 156×156（cover 裁切）
    await fireEvent(view.getByTestId('treehole-media-feed-image'), 'load', {
      nativeEvent: { source: { width: 2000, height: 600, url: urls[0] } },
    });
    expect(view.getByTestId('treehole-media-feed-frame')).toHaveStyle({ width: 156, height: 156 });
    expect(view.getByTestId('treehole-media-feed-frame-1')).toHaveStyle({ width: 156, height: 156 });
  });

  it('列表单图没有第二张与数量徽标', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="feed" />);
    expect(view.getByTestId('treehole-media-feed-image')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-feed-image-1')).toBeNull();
    expect(view.queryByTestId('treehole-media-count')).toBeNull();
  });

  it('列表单图左对齐 75% 宽、限高 320、按原图比例收敛，加载完成后移除骨架', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="feed" />);
    expect(view.getByTestId('treehole-media-feed')).toHaveStyle({
      width: '100%',
      alignItems: 'flex-start',
    });
    // 首帧（未量到列宽）用 75% 占位
    expect(view.getByTestId('treehole-media-feed-frame')).toHaveStyle({
      width: '75%',
      maxHeight: 320,
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
    });
    // 框上没有底色：图直接贴在帖子底上，不露灰边
    expect(JSON.stringify(view.getByTestId('treehole-media-feed-frame').props.style)).not.toContain(
      'backgroundColor'
    );
    expect(view.getByTestId('treehole-media-feed-image').props.contentFit).toBe('cover');
    expect(view.getByTestId('treehole-media-feed-image-loading', { includeHiddenElements: true })).toBeTruthy();
    // 量到正文列宽 320 → 图宽 240；默认 1:1 → 高 240
    await layout(view, 320);
    expect(view.getByTestId('treehole-media-feed-frame')).toHaveStyle({ width: 240, height: 240 });
    // 竖图 300×400 → 0.75 → 高 240/0.75 = 320（不再用固定 4:3 把竖图夹出灰边）
    // ⚠️ expo-image 的 onLoad 收口后是 { source }，但测试必须按 RN 原生事件形状触发（它内部再解包 nativeEvent）
    await fireEvent(view.getByTestId('treehole-media-feed-image'), 'load', { nativeEvent: { source: { width: 300, height: 400, url: urls[0] } } });
    expect(view.getByTestId('treehole-media-feed-frame')).toHaveStyle({ width: 240, height: 320 });
    expect(view.queryByTestId('treehole-media-feed-image-loading', { includeHiddenElements: true })).toBeNull();
    // 宽屏（列宽 480 → 图宽 360）时限高 320 生效
    await layout(view, 480);
    expect(view.getByTestId('treehole-media-feed-frame')).toHaveStyle({ width: 360, height: 320 });
  });

  it('列表一张失败不影响其他图，仍保留媒体入口', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="feed" />);
    await fireEvent(view.getByTestId('treehole-media-feed-image'), 'error', { nativeEvent: { error: 'offline' } });
    expect(view.getByTestId('treehole-media-feed-image-error')).toHaveTextContent(/图片不可用/);
    expect(view.queryByTestId('treehole-media-feed-image-loading', { includeHiddenElements: true })).toBeNull();
    await fireEvent(view.getByTestId('treehole-media-feed-image-1'), 'load', { nativeEvent: { source: { width: 100, height: 100, url: urls[0] } } });
    expect(JSON.stringify(view.getByTestId('treehole-media-feed-image-1').props.source)).toContain(urls[1]);
    expect(view.queryByTestId('treehole-media-feed-image-1-loading', { includeHiddenElements: true })).toBeNull();
  });

  it('单图比例收敛到 0.72–1.6，缺尺寸时用 1:1', () => {
    expect(treeholeFeedAspect()).toBe(1);
    expect(treeholeFeedAspect(300, 400)).toBe(0.75);
    expect(treeholeFeedAspect(100, 1000)).toBe(0.72);
    expect(treeholeFeedAspect(4000, 1000)).toBe(1.6);
  });

  it('无图不渲染媒体或骨架', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[]} mode="feed" />);
    expect(view.queryByTestId('treehole-media-feed')).toBeNull();
  });
});

describe('P2X TreeholeMedia · 详情横向 swiper', () => {
  const layout = (view: Awaited<ReturnType<typeof renderApp>>, width: number) =>
    fireEvent(view.getByTestId('treehole-media-carousel'), 'layout', {
      nativeEvent: { layout: { width, height: 0, x: 0, y: 0 } },
    });
  const loading = { includeHiddenElements: true } as const;

  it('图与正文同栏、无灰盒/内边距，页框自带 12 圆角并 cover 填满', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    const carousel = view.getByTestId('treehole-media-carousel');
    expect(carousel).toHaveStyle({ width: '100%', borderRadius: 12, overflow: 'hidden' });
    const carouselStyle = JSON.stringify(carousel.props.style);
    // ⛔ 不再有灰底画框与额外 padding
    expect(carouselStyle).not.toContain('backgroundColor');
    expect(carouselStyle).not.toContain('padding');

    await layout(view, 360);
    const page = view.getByTestId('treehole-media-page-0');
    expect(page).toHaveStyle({ width: 360, borderRadius: 12, overflow: 'hidden' });
    expect(JSON.stringify(page.props.style)).not.toContain('backgroundColor');
    // 一页一张：轨道宽 = 页宽 × 张数，横向排列
    expect(view.getByTestId('treehole-media-track')).toHaveStyle({
      width: 1080,
      flexDirection: 'row',
    });
    expect(view.getByTestId('treehole-media-detail-image').props.contentFit).toBe('cover');
  });

  it('按首图原始比例定高；超长图夹到 9:16（全屏再看全图）', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    await layout(view, 360);
    // 首帧：4:3 占位 → 高 270
    expect(view.getByTestId('treehole-media-carousel')).toHaveStyle({ height: 270 });
    // 首图 300×400（0.75）→ 高 360 / 0.75 = 480
    await fireEvent(view.getByTestId('treehole-media-detail-image'), 'load', {
      nativeEvent: { source: { width: 300, height: 400, url: urls[0] } },
    });
    expect(view.getByTestId('treehole-media-carousel')).toHaveStyle({ height: 480 });
    // 后续图切换不再改高度（同一框、cover）
    const area = view.getByTestId('treehole-media-drag-area');
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(view.getByTestId('treehole-media-carousel')).toHaveStyle({ height: 480 });
  });

  it('多图才显示"第 X 张，共 X 张"角标', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    expect(view.getByTestId('treehole-media-position')).toHaveTextContent('第 1 张，共 3 张');
  });

  it('单图没有角标、没有读屏切图动作，但点图仍可放大', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="detail" />);
    expect(view.queryByTestId('treehole-media-position')).toBeNull();
    const area = view.getByTestId('treehole-media-drag-area');
    expect(area.props.accessibilityActions).toBeUndefined();
    await fireEvent.press(area);
    await waitFor(() => expect(view.getByTestId('treehole-media-preview-dialog')).toBeTruthy());
    expect(view.getByTestId('treehole-media-preview-image')).toBeTruthy();
    expect(view.queryByTestId('treehole-media-preview-position')).toBeNull();
  });

  it('翻页是横向切换，且首/末页继续滑停在原地（不循环）', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    await layout(view, 360);
    const position = () => view.getByTestId('treehole-media-position');
    const area = () => view.getByTestId('treehole-media-drag-area');

    const action = async (name: 'increment' | 'decrement') => {
      await act(async () => {
        fireEvent(area(), 'accessibilityAction', { nativeEvent: { actionName: name } });
      });
    };

    // 首张继续"上一张"：停在第 1 张（由手势层弹簧回弹，不换图）
    await action('decrement');
    expect(position()).toHaveTextContent('第 1 张，共 3 张');

    await action('increment');
    await waitFor(() => expect(position()).toHaveTextContent('第 2 张，共 3 张'));
    await action('increment');
    await waitFor(() => expect(position()).toHaveTextContent('第 3 张，共 3 张'));

    // 末张继续"下一张"：仍停在第 3 张
    await action('increment');
    expect(position()).toHaveTextContent('第 3 张，共 3 张');
    await action('decrement');
    await waitFor(() => expect(position()).toHaveTextContent('第 2 张，共 3 张'));
  });

  it('所有图片一次挂载（预加载），切换不重挂', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    // 活动图用基础 testID，其余图按页号各有一份；三张都在树里 → 切换不会白屏。
    // 非活动页对读屏是隐藏的（importantForAccessibility=no-hide-descendants），查询时要显式包含隐藏节点。
    const hidden = { includeHiddenElements: true } as const;
    expect(view.getByTestId('treehole-media-detail-image')).toBeTruthy();
    expect(view.getByTestId('treehole-media-detail-image-1', hidden)).toBeTruthy();
    expect(view.getByTestId('treehole-media-detail-image-2', hidden)).toBeTruthy();
    expect(JSON.stringify(view.getByTestId('treehole-media-detail-image-2', hidden).props.source)).toContain(urls[2]);
  });

  it('全屏看图器：第 1 张不能再翻、末张不能再翻，计数居中并可关闭', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    await layout(view, 360);
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    await waitFor(() => expect(view.getByTestId('treehole-media-preview-dialog')).toBeTruthy());

    const pager = () => view.getByTestId('treehole-media-preview-pager');
    const position = () => view.getByTestId('treehole-media-preview-position');
    const action = async (name: 'increment' | 'decrement') => {
      await act(async () => {
        fireEvent(pager(), 'accessibilityAction', { nativeEvent: { actionName: name } });
      });
    };
    expect(position()).toHaveTextContent('第 1 张，共 3 张');

    await action('decrement');
    expect(position()).toHaveTextContent('第 1 张，共 3 张');

    await action('increment');
    await waitFor(() => expect(position()).toHaveTextContent('第 2 张，共 3 张'));
    expect(
      JSON.stringify(view.getByTestId('treehole-media-preview-image').props.source)
    ).toContain(urls[1]);

    await action('increment');
    await waitFor(() => expect(position()).toHaveTextContent('第 3 张，共 3 张'));
    await action('increment');
    expect(position()).toHaveTextContent('第 3 张，共 3 张');

    await fireEvent.press(view.getByLabelText('关闭'));
    await waitFor(() => expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull());
  });

  it('全屏看图器只有图与计数：不渲染帖子文字 / 评论输入框', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    await layout(view, 360);
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    const dialog = view.getByTestId('treehole-media-preview-dialog');
    expect(within(dialog).queryByTestId('treehole-post-content')).toBeNull();
    expect(within(dialog).queryByTestId('campus-composer')).toBeNull();
    expect(within(dialog).queryByTestId('treehole-actions')).toBeNull();
  });

  it('详情加载失败可重试原图，成功后恢复预览入口', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="detail" />);
    expect(view.getByTestId('treehole-media-detail-loading', loading)).toBeTruthy();
    await fireEvent(view.getByTestId('treehole-media-detail-image'), 'error', {
      nativeEvent: { error: 'offline' },
    });
    expect(view.getByTestId('treehole-media-error')).toHaveTextContent(/图片不可用/);
    await fireEvent.press(view.getByTestId('treehole-media-retry'));
    expect(JSON.stringify(view.getByTestId('treehole-media-detail-image').props.source)).toContain(urls[0]);
    expect(view.getByTestId('treehole-media-detail-loading', loading)).toBeTruthy();
    await fireEvent(view.getByTestId('treehole-media-detail-image'), 'load', {
      nativeEvent: { source: { width: 100, height: 100, url: urls[0] } },
    });
    expect(view.queryByTestId('treehole-media-detail-loading', loading)).toBeNull();
    expect(view.queryByTestId('treehole-media-error')).toBeNull();
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    expect(JSON.stringify(view.getByTestId('treehole-media-preview-image').props.source)).toContain(urls[0]);
  });

  it('重试后旧请求的迟到回调不能覆盖新请求状态', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={[urls[0]]} mode="detail" />);
    const staleError = view.getByTestId('treehole-media-detail-image').props.onError;
    await fireEvent(view.getByTestId('treehole-media-detail-image'), 'error', {
      nativeEvent: { error: 'offline' },
    });
    await fireEvent.press(view.getByTestId('treehole-media-retry'));
    await act(async () => {
      staleError({ nativeEvent: { error: 'late request' } });
    });
    expect(view.queryByTestId('treehole-media-error')).toBeNull();
    expect(view.getByTestId('treehole-media-detail-loading', loading)).toBeTruthy();
    await fireEvent(view.getByTestId('treehole-media-detail-image'), 'load', {
      nativeEvent: { source: { width: 100, height: 100, url: urls[0] } },
    });
    expect(view.queryByTestId('treehole-media-detail-loading', loading)).toBeNull();
  });

  it('英文界面的位置语义与读屏动作不混入中文', async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />, {
      locale: 'en',
    });
    await layout(view, 360);
    const area = view.getByTestId('treehole-media-drag-area');
    expect(area.props.accessibilityLabel).toBe('Image 1 of 3');
    expect(area.props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Next image' },
      { name: 'decrement', label: 'Previous image' },
    ]);
    expect(view.getByTestId('treehole-media-position')).toHaveTextContent('Image 1 of 3');
  });

  it('详情比例/高度/边界都是纯函数，易于回归', () => {
    expect(treeholeDetailAspect()).toBeCloseTo(4 / 3);
    expect(treeholeDetailAspect(300, 400)).toBeCloseTo(0.75);
    // 超长图（1:10）夹到 9:16，详情页 cover 裁上下
    expect(treeholeDetailAspect(100, 1000)).toBeCloseTo(9 / 16);
    // 横图按原始比例自然显示，不强行拉高
    expect(treeholeDetailAspect(4000, 1000)).toBeCloseTo(4);
    expect(treeholeDetailHeight(360, 9 / 16)).toBe(640);
    expect(treeholeDetailHeight(360, 4)).toBe(90);
    // 不循环
    expect(resolveTreeholePage(0, 3, 'previous')).toBe(0);
    expect(resolveTreeholePage(2, 3, 'next')).toBe(2);
    expect(resolveTreeholePage(1, 3, 'next')).toBe(2);
    expect(resolveTreeholeSwipe(-60)).toBe('next');
    expect(resolveTreeholeSwipe(60)).toBe('previous');
    expect(resolveTreeholeSwipe(-12, -700)).toBe('next');
    expect(resolveTreeholeSwipe(59, 699)).toBeNull();
  });

  it('帖子 ID 或图片序列变化拥有新的重置键', () => {
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(8, urls));
    expect(treeholeMediaKey(7, urls)).not.toBe(treeholeMediaKey(7, [...urls].reverse()));
  });
});

// 审查19242c4 的请求归属细节由 image-save 用例继续覆盖；这里保留"迟到回调不覆盖新请求"，
// 以及图片序列变化时整组重挂（treeholeMediaKey）的纯函数回归。
