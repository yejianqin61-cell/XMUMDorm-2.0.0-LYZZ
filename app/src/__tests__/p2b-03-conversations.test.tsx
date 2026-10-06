/**
 * P2B-03 · M-11 会话列表页 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：行规范化（形状不对丢掉、空字段兜底）、去重、未读判定；
 *   S-1 页面：空态 / 错误态各自的形态，点一行进 M-12。
 *
 * 依据：`docs/app/task/phase-2/P2B-03-M11会话列表页.md`。
 */
import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { ConversationsScreen } from '@/features/mailbox/ConversationsScreen';
import {
  conversationSubtitle,
  conversationTitle,
  hasUnread,
  mergeThreadRows,
  normalizeThreadRows,
  type ChatThreadRow,
} from '@/features/mailbox/conversations';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[], backCount: 0 };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      replace: () => undefined,
      back: () => {
        state.backCount += 1;
      },
      canGoBack: () => true,
    }),
  };
});
jest.mock('../../../shared/api/marketplace', () => ({ listMyChatThreads: jest.fn() }));

const routerState = require('expo-router').__state as { pushed: unknown[]; backCount: number };
const api = require('../../../shared/api/marketplace') as { listMyChatThreads: jest.Mock };

const ROW: ChatThreadRow = {
  thread_id: 11,
  item: { id: 5, title: '二手键盘', available: true },
  role: 'seller',
  peer: { id: 9, name: '买家九', avatar: null },
  last_message_at: '2026-10-06 10:00:00',
  last_content: '还在吗',
  unread_count: 2,
};

beforeEach(() => {
  routerState.pushed.length = 0;
  routerState.backCount = 0;
  api.listMyChatThreads.mockReset();
  secondaryTabStore.clear();
});

describe('P2B-03 M-11 会话列表页', () => {
  describe('TC-P2B-03-1A · 行规范化：形状不对丢掉，空字段兜底', () => {
    it('缺 thread_id / 非对象的行直接丢掉；空标题与空名字走兜底词条', () => {
      const rows = normalizeThreadRows({
        list: [
          { thread_id: 11, item: {}, peer: {}, role: 'seller', unread_count: 0 },
          { item: { title: 'x' }, peer: {} },
          'nope',
          null,
        ],
      });
      expect(rows).toHaveLength(1);
      expect(conversationTitle(rows[0], '商品已下架')).toBe('商品已下架');
      expect(conversationSubtitle(rows[0], '还没有消息')).toBe('还没有消息');
      expect(rows[0].unread_count).toBe(0);
      // ⛔ 兜底之后不许再出现 undefined / null 文案
      const title = conversationTitle(rows[0], '商品已下架');
      expect(`${title}`).not.toContain('undefined');
    });

    it('裸数组也能吃；`available:false` 与负数未读被规整', () => {
      const rows = normalizeThreadRows([
        { thread_id: 3, item: { id: 1, title: '台灯', available: false }, peer: { id: 4, name: null }, unread_count: -5 },
      ]);
      expect(rows[0].item.available).toBe(false);
      expect(rows[0].unread_count).toBe(0);
      expect(rows[0].peer.name).toBeNull(); // 兜底发生在渲染层（要词条）
    });

    it('非对象载荷 → 空数组（⛔ 不崩）', () => {
      expect(normalizeThreadRows(null)).toEqual([]);
      expect(normalizeThreadRows('nope')).toEqual([]);
      expect(normalizeThreadRows({ unexpected: 1 })).toEqual([]);
    });
  });

  describe('TC-P2B-03-2A · 未读角标只在 > 0 时出现', () => {
    it('hasUnread 判定', () => {
      expect(hasUnread({ ...ROW, unread_count: 0 })).toBe(false);
      expect(hasUnread({ ...ROW, unread_count: 3 })).toBe(true);
    });
  });

  describe('TC-P2B-03-3A · 去重与顺序', () => {
    it('同一 thread_id 只留一条，且刷新（新值）覆盖旧值', () => {
      const merged = mergeThreadRows(
        [{ ...ROW, last_content: '旧' }],
        [{ ...ROW, last_content: '新' }, { ...ROW, thread_id: 12, last_content: '另一条' }]
      );
      expect(merged).toHaveLength(2);
      expect(merged.find((row) => row.thread_id === 11)?.last_content).toBe('新');
      expect(merged.map((row) => row.thread_id)).toEqual([12, 11]);
    });
  });

  describe('TC-P2B-03-4A · 空态与错误态是两件事', () => {
    it('接口返回空列表 → 空态（不是错误态）', async () => {
      api.listMyChatThreads.mockResolvedValue({ list: [] });
      const view = await renderApp(<ConversationsScreen />);

      await waitFor(() =>
        expect(view.getByText(zh['mailbox.conversations.empty.title'])).toBeTruthy()
      );
      expect(view.queryByText(zh['error.unknown.perceive'])).toBeNull();
    });

    it('接口报错 → 错误态（不是空态）', async () => {
      api.listMyChatThreads.mockRejectedValue({ kind: 'offline' });
      const view = await renderApp(<ConversationsScreen />);

      await waitFor(() => expect(view.getByText(zh['error.net.offline.perceive'])).toBeTruthy());
      expect(view.queryByText(zh['mailbox.conversations.empty.title'])).toBeNull();
    });
  });

  describe('TC-P2B-03-5A · 点一行进 M-12', () => {
    it('带着 threadId 推入 /me/chat/[threadId]', async () => {
      api.listMyChatThreads.mockResolvedValue({ list: [ROW] });
      const view = await renderApp(<ConversationsScreen />);

      await waitFor(() => expect(view.getByTestId('conversation-11')).toBeTruthy());
      fireEvent.press(view.getByTestId('conversation-11'));

      expect(routerState.pushed).toEqual([
        { pathname: '/me/chat/[threadId]', params: { threadId: '11' } },
      ]);
      // 未读 > 0 → 有角标
      expect(view.getByText(String(ROW.unread_count))).toBeTruthy();
    });
  });
});
