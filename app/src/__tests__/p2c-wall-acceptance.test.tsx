import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import { WallWriteScreen } from '@/features/campus/WallWriteScreen';
import { WallPostCard } from '@/features/campus/WallPostCard';
import { WallFreePostText } from '@/features/campus/WallFreePostBody';
import { asWall } from '@/features/campus/campusModel';
import { wallPostFromRow } from '@/features/campus/wallPost';
import { wallPosterStyle } from '@/features/campus/wallPosterLayout';
import { WALL_COLOR_IDS, WALL_LAYOUT_IDS, wallPalette } from '@/features/campus/wallPosterTemplates';
import { createConfession, getConfessionMeta } from '../../../shared/api/confessions';
import { getMyTermsStatus } from '../../../shared/api/users';
import { renderApp } from './helpers/renderApp';

const mockAuth = jest.fn();
const mockReplace = jest.fn();
let mockOwner = 'owner-a';
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn(), canGoBack: () => true }) }));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ identifier: 'writer', status: 'signedIn', isSignedIn: true, handleAuthFailure: mockAuth }),
}));
jest.mock('@/features/auth/tokenStore', () => ({ readTokenSync: () => 'fixture', tokenAccountId: () => mockOwner }));
jest.mock('../../../shared/api/confessions', () => ({
  createConfession: jest.fn(), getConfession: jest.fn(), getConfessionMeta: jest.fn(), updateConfession: jest.fn(),
}));
jest.mock('../../../shared/api/users', () => ({ getMyTermsStatus: jest.fn() }));

const create = jest.mocked(createConfession);
const terms = jest.mocked(getMyTermsStatus);
const metadata = jest.mocked(getConfessionMeta);
const draftDisk = new Map<string, string>();
const text = '  中文 English 👩🏽‍💻 e\u0301 <b>原样</b>\r\n\r\n\t第二段\n\n  ';

beforeEach(() => {
  jest.clearAllMocks();
  create.mockReset();
  terms.mockReset().mockResolvedValue({ accepted: true });
  metadata.mockReset().mockResolvedValue({ total: 0, poster_style_version: 2 });
  mockOwner = 'owner-a';
  draftDisk.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => draftDisk.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { draftDisk.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => { draftDisk.delete(key); });
});

it('空白与各种换行都保持禁用，不触发请求', async () => {
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  for (const content of ['', ' ', '\t\r\n\n', '\u3000\u00a0']) {
    await fireEvent.changeText(input, content);
    expect(view.getByTestId('wall-write-submit')).toBeDisabled();
    expect(view.getByTestId('wall-write-empty-preview')).toBeTruthy();
  }
  expect(terms).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it.each([1000, 1001])('%i 字符边界不会截断原文', async (length) => {
  const content = text.padEnd(length, '字');
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  await fireEvent.changeText(input, content);
  expect(input.props.value).toBe(content);
  expect(view.getByTestId('wall-free-body-content').props.children).toBe(content);
  if (length === 1000) expect(view.getByTestId('wall-write-submit')).toBeEnabled();
  else {
    expect(view.getByTestId('wall-write-submit')).toBeDisabled();
    await fireEvent.press(view.getByTestId('wall-write-submit'));
    expect(terms).not.toHaveBeenCalled();
  }
  await waitFor(() => expect(JSON.parse([...draftDisk.values()][0]).content).toBe(content));
  expect(create).not.toHaveBeenCalled();
});

it.each([
  ['offline', new TypeError('network unavailable')],
  ['timeout', { kind: 'timeout' }],
  ['server', { status: 503 }],
])('%s 预检失败后原文和所选颜色仍可继续编辑', async (_name, failure) => {
  terms.mockRejectedValueOnce(failure);
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  await fireEvent.changeText(input, text);
  await fireEvent.press(view.getByTestId('wall-poster-adjust'));
  await fireEvent.press(view.getByTestId('wall-poster-color-khaki'));
  await fireEvent.press(view.getByTestId('wall-write-submit'));
  await waitFor(() => expect(view.getByTestId('wall-write-submit')).toBeEnabled());
  expect(input.props.value).toBe(text);
  expect(input.props.editable).toBe(true);
  expect(view.getByTestId('wall-poster-color-khaki').props.accessibilityState.selected).toBe(true);
  expect(metadata).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('预检未完成时连点只启动一次，结果不确定时保留同一凭据', async () => {
  let releaseTerms: (value: { accepted: boolean }) => void = () => {};
  terms.mockImplementationOnce(() => new Promise((resolve) => { releaseTerms = resolve; }));
  create.mockRejectedValueOnce({ kind: 'timeout' });
  const view = await renderApp(<WallWriteScreen />);
  await fireEvent.changeText(await view.findByTestId('wall-write-content'), text);
  await fireEvent.press(view.getByTestId('wall-write-submit'));
  await fireEvent.press(view.getByTestId('wall-write-submit'));
  expect(terms).toHaveBeenCalledTimes(1);
  expect(view.getByTestId('wall-write-submit')).toBeDisabled();
  await act(async () => releaseTerms({ accepted: true }));
  await waitFor(() => expect(view.getByText('重试同一次发布')).toBeTruthy());
  expect(create).toHaveBeenCalledTimes(1);
  const body = create.mock.calls[0][0];
  expect('publish_key' in body && body.publish_key).toEqual(expect.any(String));
  await waitFor(() => expect(JSON.parse([...draftDisk.values()][0]).publishKey).toBe('publish_key' in body ? body.publish_key : undefined));
  expect(mockReplace).not.toHaveBeenCalled();
});

it('重新挂载恢复草稿，切换账户不会读到上一个账户的输入', async () => {
  function Harness() {
    const [generation, setGeneration] = React.useState(0);
    return <>
      <Button testID="reopen" label="重新打开" onPress={() => setGeneration((n) => n + 1)} />
      <Button testID="other-owner" label="切换账户" onPress={() => {
        mockOwner = mockOwner === 'owner-a' ? 'owner-b' : 'owner-a';
        setGeneration((n) => n + 1);
      }} />
      <WallWriteScreen key={generation} />
    </>;
  }
  const view = await renderApp(<Harness />);
  await fireEvent.changeText(await view.findByTestId('wall-write-content'), text);
  await fireEvent.press(view.getByTestId('wall-poster-adjust'));
  await fireEvent.press(view.getByTestId('wall-poster-color-teal'));
  await waitFor(() => expect(JSON.parse([...draftDisk.values()][0]).style.colorId).toBe('teal'));
  await fireEvent.press(view.getByTestId('reopen'));
  expect((await view.findByTestId('wall-write-content')).props.value).toBe(text);
  expect(view.getByTestId('wall-surface-990001')).toHaveStyle({ backgroundColor: '#293A39' });
  await fireEvent.press(view.getByTestId('other-owner'));
  expect((await view.findByTestId('wall-write-content')).props.value).toBe('');
  await fireEvent.press(view.getByTestId('other-owner'));
  expect((await view.findByTestId('wall-write-content')).props.value).toBe(text);
  expect(create).not.toHaveBeenCalled();
});

it.each(['light', 'dark'] as const)('%s 下全部 18 种布局配色组合都原样渲染正文，列表折叠且详情展开', async (scheme) => {
  const content = text + 'NoSpaces0123456789'.repeat(30) + '\n'.repeat(12) + '末尾';
  const posts = WALL_LAYOUT_IDS.flatMap((layoutId, row) => WALL_COLOR_IDS.map((colorId, column) => wallPostFromRow(asWall({
    id: 100 + row * 6 + column, content, poster_style: { version: 2, layoutId, colorId },
  }))));
  const view = await renderApp(<>{posts.map((post) => <View key={post.id} testID={`pair-${post.id}`}>
    <WallPostCard post={post} />
    <WallFreePostText id={post.id} content={post.content} savedStyle={post.posterStyle} />
  </View>)}</>, { scheme });
  posts.forEach((post) => {
    const pair = within(view.getByTestId(`pair-${post.id}`));
    const feed = pair.getByTestId('wall-free-body-content');
    const detail = pair.getByTestId('wall-free-text-block-content');
    const palette = wallPalette(post.posterStyle!.colorId, scheme);
    expect(feed.props.children).toBe(content);
    expect(detail.props.children).toBe(content);
    expect(feed.props.numberOfLines).toBe(5);
    expect(detail.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(feed.props.style).fontFamily).toBeUndefined();
    expect(StyleSheet.flatten(detail.props.style)).toEqual(StyleSheet.flatten(feed.props.style));
    expect(feed).toHaveStyle({ color: palette.ink });
    expect(pair.getByTestId(`wall-surface-${post.id}`)).toHaveStyle({ backgroundColor: palette.background });
  });
});

it('匿名投影丢弃身份注入，无效样式按帖子 ID 确定性回退', () => {
  const row = asWall({ id: 37, content: text, user_id: 91, author: { id: 91, nickname: 'private', avatar: 'private' },
    poster_style: { version: 999, layoutId: 'bad', colorId: 'bad' }, viewer_is_author: 'true', revision: -5 });
  expect(row).not.toHaveProperty('author');
  expect(row).not.toHaveProperty('user_id');
  expect(row.is_mine).toBeUndefined();
  expect(row.poster_style).toBeUndefined();
  expect(row.revision).toBe(0);
  expect(wallPosterStyle(row.id)).toEqual(wallPosterStyle(row.id));
});

it('设备草稿存储失败时保留当前输入且不提交帖子', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('local storage unavailable'));
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  await fireEvent.changeText(input, text);
  expect(await view.findByText('草稿未能写入此设备。请留在此页重试。')).toBeTruthy();
  await fireEvent.press(view.getByTestId('wall-write-submit'));
  await waitFor(() => expect(metadata).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByTestId('wall-write-submit')).toBeEnabled());
  expect(input.props.value).toBe(text);
  expect(input.props.editable).toBe(true);
  expect(create).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('旧草稿排版不适合多段正文时提示采用自然布局且保留配色', async () => {
  draftDisk.set('xmumdorm:draft:wall-write-v1:owner-a:new', JSON.stringify({
    content: text, style: { version: 2, layoutId: 'emphasis', colorId: 'teal' },
  }));
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  expect(input.props.value).toBe(text);
  expect(view.getByText('原排版放不下这段文字，预览已改用自然表达。也可以选择其他可用排版。')).toBeTruthy();
  await fireEvent.press(view.getByTestId('wall-poster-adjust'));
  expect(view.getByTestId('wall-poster-layout-natural').props.accessibilityState.selected).toBe(true);
  expect(view.getByTestId('wall-poster-color-teal').props.accessibilityState.selected).toBe(true);
  expect(create).not.toHaveBeenCalled();
});
