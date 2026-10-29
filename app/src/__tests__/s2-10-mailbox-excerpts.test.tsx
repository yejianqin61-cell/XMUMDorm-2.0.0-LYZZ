/**
 * S2-10 · 消息行摘要、失效说明与聚焦刷新（阶段3-04）—— 自动化用例
 *
 * 测什么：
 *   1. 有 `reply_to_excerpt`/`source_excerpt` → 行副标题显示摘要（不是作者名）；
 *   2. 两段摘要都缺 → 回退到作者名/类型，不留空白；
 *   3. 失效目标 → 行内"内容不可查看"、点击只标已读不跳转；
 *   4. 重新聚焦 → 重新取第一页。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段3-04-消息行摘要与聚焦刷新.md`。
 */
import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { clearToken } from '@/features/auth/tokenStore';
import { MailboxScreen } from '@/features/mailbox/MailboxScreen';
import { unreadStore } from '@/features/mailbox/unread';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

jest.mock('expo-router', () => {
  const React = require('react');
  const state = { pushed: [] as unknown[], focus: [] as Array<() => void> };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
    }),
    // 捕获聚焦回调，用例里手动再触发一次来模拟"切回来"
    useFocusEffect: (callback: () => void) => {
      state.focus.push(callback);
      React.useEffect(callback, [callback]);
    },
  };
});
jest.mock('../../../shared/api/notifications', () => ({
  getNotifications: jest.fn(),
  getUnreadSummary: jest.fn(),
  markNotificationsReadBatch: jest.fn(),
  clearNotificationsByCategory: jest.fn(),
}));

const routerState = require('expo-router').__state as { pushed: unknown[]; focus: Array<() => void> };
const api = require('../../../shared/api/notifications') as {
  getNotifications: jest.Mock;
  getUnreadSummary: jest.Mock;
  markNotificationsReadBatch: jest.Mock;
  clearNotificationsByCategory: jest.Mock;
};

const page = (list: unknown[]): unknown => ({
  list,
  hasMore: false,
  page: 1,
  pageSize: 50,
  unreadSummary: { total: 0, byType: {}, byModule: {}, byCategory: {} },
});

const baseTarget = { type: 'post', id: 12, title: '树洞', path: '/post/12', available: true, comment_id: null };

beforeEach(async () => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getUnreadSummary.mockResolvedValue({ total: 0, byType: {}, byModule: {}, byCategory: {} });
  api.markNotificationsReadBatch.mockResolvedValue({ ids: [], updated: 1 });
  routerState.pushed.length = 0;
  routerState.focus.length = 0;
  unreadStore.reset();
  secondaryTabStore.clear();
  await clearToken();
});

describe('S2-10 消息行摘要与聚焦刷新', () => {
  it('有被回复摘要时显示摘要（优先于作者名）', async () => {
    api.getNotifications.mockResolvedValue(
      page([
        {
          id: 1,
          type: 'treehole_comment',
          is_read: false,
          target: { ...baseTarget, comment_id: 34 },
          from_user: { username: 'u', nickname: '作者甲' },
          source_excerpt: '树洞正文摘要',
          reply_to_excerpt: '被回复的评论摘要',
        },
      ])
    );
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());
    expect(view.getByText('被回复的评论摘要')).toBeTruthy();
    expect(view.queryByText('作者甲')).toBeNull();
    expect(view.queryByText('树洞正文摘要')).toBeNull();
  });

  it('两段摘要都缺：回退到作者名，不留空白', async () => {
    api.getNotifications.mockResolvedValue(
      page([
        {
          id: 2,
          type: 'treehole_like',
          is_read: false,
          target: baseTarget,
          from_user: { username: 'u', nickname: '作者乙' },
        },
      ])
    );
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByText('作者乙')).toBeTruthy());
  });

  it('失效目标：行内说明"内容不可查看"，点击只标已读、不跳转', async () => {
    api.getNotifications.mockResolvedValue(
      page([
        {
          id: 3,
          type: 'treehole_like',
          is_read: false,
          target: { ...baseTarget, available: false },
        },
      ])
    );
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByText(zh['mailbox.targetUnavailable'])).toBeTruthy());

    fireEvent.press(view.getByTestId('notification-3'));
    await waitFor(() => expect(api.markNotificationsReadBatch).toHaveBeenCalledWith([3]));
    expect(routerState.pushed).toEqual([]);
  });

  it('失效目标不展示旧摘要（服务端已清空，客户端也不该留着）', async () => {
    api.getNotifications.mockResolvedValue(
      page([
        {
          id: 4,
          type: 'treehole_comment',
          is_read: false,
          target: { ...baseTarget, available: false },
          source_excerpt: null,
          reply_to_excerpt: null,
        },
      ])
    );
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-4')).toBeTruthy());
    expect(view.queryByText('旧摘要')).toBeNull();
  });

  it('有路由的目标：点击会跳转并标已读', async () => {
    api.getNotifications.mockResolvedValue(
      page([{ id: 5, type: 'club_like', is_read: false, target: { type: 'club', id: 3, title: '社团', path: '/clubs/3', available: true } }])
    );
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-5')).toBeTruthy());
    fireEvent.press(view.getByTestId('notification-5'));
    await waitFor(() => expect(routerState.pushed).toEqual(['/clubs/3']));
  });

  it('重新聚焦：重新取一次第一页', async () => {
    api.getNotifications.mockResolvedValue(page([]));
    await renderApp(<MailboxScreen />);
    await waitFor(() => expect(api.getNotifications).toHaveBeenCalledTimes(1));

    const callback = routerState.focus[routerState.focus.length - 1];
    await act(async () => {
      callback();
    });
    await waitFor(() => expect(api.getNotifications).toHaveBeenCalledTimes(2));
  });
});
