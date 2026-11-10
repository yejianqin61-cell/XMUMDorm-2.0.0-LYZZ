import * as React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import { WallPostCard } from '@/features/campus/WallPostCard';
import { WallFreePostText } from '@/features/campus/WallFreePostBody';
import { wallPalette, WALL_COLORS, WALL_COLOR_IDS, WALL_LAYOUT_IDS } from '@/features/campus/wallPosterTemplates';
import { asWall } from '@/features/campus/campusModel';
import { wallPostFromRow } from '@/features/campus/wallPost';
import posterContract from '../../../shared/constants/wallPosterContract.json';
import { renderApp } from './helpers/renderApp';

it('整卡底色覆盖正文与互动区，并以设备默认字体原样渲染文字', async () => {
  const content = '晚安。🌙';
  const view = await renderApp(<WallPostCard post={{
    id: 41, kind: 'free', content, likeCount: 2, commentCount: 1,
    posterStyle: { version: 2, layoutId: 'emphasis', colorId: 'mist' },
  }} />, { scheme: 'light' });
  const card = view.getByTestId('wall-card-41');
  const text = within(card).getByTestId('wall-free-body-content');
  expect(text).toHaveTextContent(content);
  const style = StyleSheet.flatten(text.props.style);
  expect(style).toMatchObject({ fontSize: 19, lineHeight: 28, fontWeight: '600', textAlign: 'center' });
  expect(style.fontFamily).toBeUndefined();
  expect(text.props.numberOfLines).toBe(5);
  expect(text.props.onTextLayout).toBeUndefined();
  expect(StyleSheet.flatten(within(card).getByTestId('wall-surface-41').props.style).backgroundColor).toBe(wallPalette('mist', 'light').background);
  expect(StyleSheet.flatten(view.getByTestId('wall-free-body').props.style).backgroundColor).toBeUndefined();
  expect(within(card).getByTestId('wall-row-41-like')).toBeTruthy();
});

it('信息流折叠长文，详情用同一字体完整呈现', async () => {
  const content = '今天学校的湖边有一阵凉风。'.repeat(14) + '\n\nAnyone up for a walk? 🍃';
  const row = asWall({ id: 42, content, poster_style: { version: 2, layoutId: 'natural', colorId: 'teal' } });
  const view = await renderApp(<>
    <WallPostCard post={wallPostFromRow(row)} />
    <WallFreePostText content={row.content} id={row.id} savedStyle={row.poster_style} />
  </>);
  const feedText = view.getByTestId('wall-free-body-content');
  const detailText = view.getByTestId('wall-free-text-block-content');
  const palette = wallPalette('teal', 'dark');
  expect(view.getByTestId('wall-surface-42')).toHaveStyle({ backgroundColor: palette.background });
  expect(feedText).toHaveStyle({ color: palette.ink });
  expect(feedText.props.numberOfLines).toBe(5);
  expect(detailText.props.numberOfLines).toBeUndefined();
  expect(detailText.props.children).toBe(content);
  expect(StyleSheet.flatten(detailText.props.style)).toEqual(StyleSheet.flatten(feedText.props.style));
  const probe = view.getByTestId('wall-free-body-density-probe', { includeHiddenElements: true });
  for (const [count, size, lineHeight] of [[2, 16, 24], [4, 15.5, 23], [6, 15, 22], [7, 14.5, 22]]) {
    await fireEvent(probe, 'textLayout', { nativeEvent: { lines: Array(count).fill({ width: 250 }) } });
    expect(StyleSheet.flatten(view.getByTestId('wall-free-body-content').props.style))
      .toMatchObject({ fontSize: size, lineHeight });
    expect(StyleSheet.flatten(probe.props.style).fontSize).toBe(16);
  }
});


it.each(['light', 'dark'] as const)('六种已存颜色在 %s 模式使用同一布局身份', async (scheme) => {
  expect(posterContract.layouts).toEqual(WALL_LAYOUT_IDS);
  expect(posterContract.colors).toEqual(WALL_COLOR_IDS);
  const posts = WALL_COLOR_IDS.map((colorId, index) => wallPostFromRow(asWall({
    id: 100 + index,
    content: '一句 Quote 🌙',
    poster_style: { version: posterContract.version, layoutId: 'quote', colorId },
  })));
  const view = await renderApp(<>{posts.map((post) => <WallPostCard key={post.id} post={post} />)}</>, { scheme });
  posts.forEach((post, index) => {
    const palette = wallPalette(WALL_COLOR_IDS[index], scheme);
    const card = within(view.getByTestId(`wall-card-${post.id}`));
    expect(card.getByTestId(`wall-surface-${post.id}`)).toHaveStyle({ backgroundColor: palette.background });
    expect(card.getByTestId('wall-free-body-content')).toHaveStyle({ color: palette.ink, fontSize: 17 });
  });
});
