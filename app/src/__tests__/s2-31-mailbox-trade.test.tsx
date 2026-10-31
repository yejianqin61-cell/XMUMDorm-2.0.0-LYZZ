/**
 * S2-31 · 信箱「交易」分类会话化（阶段D-01 / R-16）—— 自动化用例
 *
 * 测什么：
 *   1. 切到「交易」→ 列的是会话（商品/对方/最新消息/未读），不是通知；
 *   2. 交易分类**没有**通知的「全部已读」「清空」两个动作（契约 L80）；
 *   3. 点会话行走 `/me/chat/[threadId]`；切回「互动」仍是通知列表；
 *   4. 交易分类的空态/错误态用语与通知分类分开（不互相冒充）。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段D-01-交易视图会话化.md`、
 *      `docs/app_stage2/requirements/Stage2统一口径与接口契约.md:68-87`。
 */
import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { clearToken } from '@/features/auth/tokenStore';
import { MailboxScreen } from '@/features/mailbox/MailboxScreen';
import { unreadStore } from '@/features/mailbox/unread';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

jest.mock('expo-router', () => {
  const React = require('react');
  const state = { pushed: [] as unknown[] };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
    }),
    useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
  };
});
jest.mock('../../../shared/api/notifications', () => ({
  getNotifications: jest.fn(),
  getUnreadSummary: jest.fn(),
  markNotificationsReadBatch: jest.fn(),
  clearNotificationsByCategory: jest.fn(),
}));
jest.mock('../../../shared/api/marketplace', () => ({ listMyChatThreads: jest.fn() }));

const routerState = require('expo-router').__state as { pushed: unknown[] };
const api = require('../../../shared/api/notifications') as {
  getNotifications: jest.Mock;
  getUnreadSummary: jest.Mock;
  markNotificationsReadBatch: jest.Mock;
  clearNotificationsByCategory: jest.Mock;
};
const threadApi = require('../../../shared/api/marketplace') as { listMyChatThreads: jest.Mock };

const NOTICE = {
  id: 1,
  type: 'treehole_like',
  is_read: false,
  target: { type: 'post', id: 12, title: '有人在树洞赞了你', path: '/post/12', available: true },
};

const noticePage = {
  list: [NOTICE],
  hasMore: false,
  page: 1,
  pageSize: 50,
  unreadSummary: { total: 1, byType: {}, byModule: {}, byCategory: { interaction: 1 } },
};

const THREAD = {
  thread_id: 11,
  item: { id: 5, title: '二手键盘', available: true },
  role: 'seller' as const,
  peer: { id: 9, name: '买家九', avatar: null },
  last_message_at: '2026-10-06 10:00:00',
  last_content: '还在吗',
  unread_count: 2,
};

const threadPage = { list: [THREAD], nextCursor: null };

beforeEach(async () => {
  Object.values(api).forEach((fn) => fn.mockReset());
  threadApi.listMyChatThreads.mockReset();
  api.getUnreadSummary.mockResolvedValue({ total: 0, byType: {}, byModule: {}, byCategory: {} });
  api.getNotifications.mockResolvedValue(noticePage);
  threadApi.listMyChatThreads.mockResolvedValue(threadPage);
  routerState.pushed.length = 0;
  unreadStore.reset();
  secondaryTabStore.clear();
  await clearToken();
});

describe('S2-31 信箱交易分类会话化', () => {
  it('切到「交易」→ 列出会话行，通知行消失', async () => {
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());

    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));

    await waitFor(() => expect(view.getByTestId('conversation-11')).toBeTruthy());
    // 商品名、最新消息、未读都在行上（商品摘要 / 对方 / 最新消息 / 未读）
    expect(view.getByText('二手键盘')).toBeTruthy();
    expect(view.getByText('还在吗')).toBeTruthy();
    expect(view.getByText(String(THREAD.unread_count))).toBeTruthy();
    // 通知不再混进交易页
    expect(view.queryByTestId('notification-1')).toBeNull();
  });

  it('交易分类不给通知的「全部已读」「清空」动作，互动分类仍给', async () => {
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('mailbox-mark-all-read')).toBeTruthy());

    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));
    await waitFor(() => expect(view.getByTestId('conversation-11')).toBeTruthy());
    expect(view.queryByTestId('mailbox-mark-all-read')).toBeNull();
    expect(view.queryByTestId('mailbox-clear')).toBeNull();

    fireEvent.press(view.getByTestId('mailbox-categories-interaction'));
    await waitFor(() => expect(view.getByTestId('mailbox-mark-all-read')).toBeTruthy());
  });

  it('点会话行 → 带着 threadId 进私信页', async () => {
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());
    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));
    await waitFor(() => expect(view.getByTestId('conversation-11')).toBeTruthy());

    fireEvent.press(view.getByTestId('conversation-11'));

    expect(routerState.pushed).toEqual([
      { pathname: '/me/chat/[threadId]', params: { threadId: '11' } },
    ]);
  });

  it('切回「互动」→ 回到通知列表，会话行不再出现', async () => {
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());
    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));
    await waitFor(() => expect(view.getByTestId('conversation-11')).toBeTruthy());

    fireEvent.press(view.getByTestId('mailbox-categories-interaction'));

    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());
    expect(view.queryByTestId('conversation-11')).toBeNull();
  });

  it('交易没有会话 → 会话空态（不是通知空态）', async () => {
    threadApi.listMyChatThreads.mockResolvedValue({ list: [] });
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());

    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));

    await waitFor(() =>
      expect(view.getByText(zh['mailbox.conversations.empty.title'])).toBeTruthy()
    );
    expect(view.queryByText(zh['mailbox.empty.title'])).toBeNull();
  });

  it('交易取数失败 → 错误态（不是空态）', async () => {
    threadApi.listMyChatThreads.mockRejectedValue({ kind: 'offline' });
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());

    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));

    await waitFor(() => expect(view.getByText(zh['error.net.offline.perceive'])).toBeTruthy());
    expect(view.queryByText(zh['mailbox.conversations.empty.title'])).toBeNull();
  });

  it('交易分类角标读服务端未读汇总（⛔ 不是本地累计通知行）', async () => {
    api.getUnreadSummary.mockResolvedValue({
      total: 3,
      byType: {},
      byModule: {},
      byCategory: { interaction: 0, transaction: 3, system: 0 },
    });
    const view = await renderApp(<MailboxScreen />);
    await waitFor(() => expect(view.getByTestId('notification-1')).toBeTruthy());

    fireEvent.press(view.getByTestId('mailbox-categories-transaction'));

    // `withCount` 的标签形态：`<分类名> <数量>`；3 来自 summary，不是通知行数（通知只有 1 条）
    await waitFor(() =>
      expect(view.getByText(`${zh['mailbox.category.transaction']} 3`)).toBeTruthy()
    );
  });
});
