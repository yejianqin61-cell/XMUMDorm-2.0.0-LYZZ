import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { WallWriteScreen } from '@/features/campus/WallWriteScreen';
import { createConfession, getConfession, getConfessionMeta, updateConfession } from '../../../shared/api/confessions';
import { getMyTermsStatus } from '../../../shared/api/users';
import { renderApp } from './helpers/renderApp';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockAuth = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, canGoBack: () => true }),
}));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ identifier: 'writer', status: 'signedIn', isSignedIn: true, handleAuthFailure: mockAuth }),
}));
jest.mock('@/features/auth/tokenStore', () => ({
  readTokenSync: () => 'fixture',
  tokenAccountId: () => '17',
}));
jest.mock('../../../shared/api/confessions', () => ({
  createConfession: jest.fn(), getConfession: jest.fn(), getConfessionMeta: jest.fn(), updateConfession: jest.fn(),
}));
jest.mock('../../../shared/api/users', () => ({ getMyTermsStatus: jest.fn() }));

const create = jest.mocked(createConfession);
const get = jest.mocked(getConfession);
const update = jest.mocked(updateConfession);
const style = { version: 2, layoutId: 'natural', colorId: 'teal' };
const content = '  中文 English 🚀\n\n第二段\n\n第三段  ';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(getMyTermsStatus).mockResolvedValue({ accepted: true });
  jest.mocked(getConfessionMeta).mockResolvedValue({ total: 0, poster_style_version: 2 });
});

it('keeps the confirmed content and color across an uncertain publish, then retries the same request', async () => {
  create.mockRejectedValueOnce({ kind: 'timeout' });
  const first = await renderApp(<WallWriteScreen />);
  await fireEvent.changeText(await first.findByTestId('wall-write-content'), content);
  await fireEvent.press(first.getByTestId('wall-poster-adjust'));
  await fireEvent.press(first.getByTestId('wall-poster-color-teal'));
  await fireEvent.press(first.getByTestId('wall-write-submit'));
  await waitFor(() => expect(first.getByText('重试同一次发布')).toBeTruthy());
  expect(mockReplace).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledTimes(1);
  const payload = create.mock.calls[0][0];
  expect(payload).toEqual({ content, poster_style: style, publish_key: expect.any(String) });

  expect(jest.mocked(AsyncStorage.setItem).mock.calls.at(-1)?.[1]).toBe(JSON.stringify({
    content, style, publishKey: 'publish_key' in payload ? payload.publish_key : undefined,
  }));
});

it('restores an uncertain draft and retries with its original publication key', async () => {
  const publishKey = 'previous-attempt-01';
  create.mockResolvedValueOnce({ id: 20, content, poster_style: style, viewer_is_author: true });
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({ content, style, publishKey }));
  const reopened = await renderApp(<WallWriteScreen />);
  await waitFor(() => expect(reopened.getByText('重试同一次发布')).toBeTruthy());
  expect(reopened.getByTestId('wall-write-content').props.value).toBe(content);
  await fireEvent.press(reopened.getByTestId('wall-write-submit'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/?tab=wall'));
  expect(create).toHaveBeenCalledWith({ content, poster_style: style, publish_key: publishKey });
});

it('loads the author’s saved style and uses the current revision on edit', async () => {
  get.mockResolvedValueOnce({ id: 20, content, poster_style: style, revision: 4, viewer_is_author: true });
  update.mockResolvedValueOnce({ id: 20, revision: 5 });
  const view = await renderApp(<WallWriteScreen edit="20" />);
  const input = await view.findByTestId('wall-write-content');
  expect(input.props.value).toBe(content);
  const next = content + '补充';
  await fireEvent.changeText(input, next);
  await fireEvent.press(view.getByTestId('wall-write-submit'));
  await waitFor(() => expect(update).toHaveBeenCalledWith(20, { content: next, poster_style: style, revision: 4 }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});


it('keeps the draft and sends no publication to a legacy server', async () => {
  jest.mocked(getConfessionMeta).mockResolvedValueOnce({ total: 1 });
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  await fireEvent.changeText(input, content);
  await fireEvent.press(view.getByTestId('wall-write-submit'));
  expect(await view.findByText('当前服务端尚未支持自由帖排版，草稿已保留。')).toBeTruthy();
  expect(view.getByTestId('wall-write-content').props.value).toBe(content);
  expect(create).not.toHaveBeenCalled();
});


it('guides an empty draft and preserves a selected color while options are folded', async () => {
  const view = await renderApp(<WallWriteScreen />);
  const input = await view.findByTestId('wall-write-content');
  expect(input.props.placeholder).toBe('有什么想问、想分享的？');
  expect(view.getByTestId('wall-write-empty-preview')).toBeTruthy();
  expect(view.getByTestId('wall-write-submit')).toBeDisabled();
  expect(view.queryByTestId('wall-poster-adjust')).toBeNull();
  await fireEvent.changeText(input, content);
  expect(view.queryByTestId('wall-write-empty-preview')).toBeNull();
  expect(view.getByTestId('wall-write-submit')).toBeEnabled();
  expect(view.queryByTestId('wall-poster-color-khaki')).toBeNull();
  await fireEvent.press(view.getByTestId('wall-poster-adjust'));
  await fireEvent.press(view.getByTestId('wall-poster-color-khaki'));
  await fireEvent.press(view.getByTestId('wall-poster-adjust'));
  expect(view.queryByTestId('wall-poster-color-khaki')).toBeNull();
  await fireEvent.changeText(input, content + '补充');
  await fireEvent.press(view.getByTestId('wall-poster-adjust'));
  expect(view.getByTestId('wall-poster-color-khaki').props.accessibilityState.selected).toBe(true);
  expect(view.getByTestId('wall-surface-990001')).toHaveStyle({ backgroundColor: '#38352c' });
  expect(create).not.toHaveBeenCalled();
});
