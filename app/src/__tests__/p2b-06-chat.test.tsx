/**
 * P2B-06 · M-12 私信会话（`D05` + `O08` + 4s 轮询）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：去重与顺序（同秒按 id）、增量游标、1200 字上限、该不该轮询；
 *   S-1 页面：气泡两态可辨（不靠颜色单独区分）、发送调用域接口、对方发消息时标已读；
 *   S-5 结构约束：`D06 ChatComposer` **没有被建出来**（P2B-06 裁决）且裁决前提仍在。
 *
 * 依据：`docs/app/task/phase-2/P2B-06-M12私信会话.md`、宪法 9.3、缺口 G2。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, userEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { ChatScreen } from '@/features/mailbox/ChatScreen';
import {
  CHAT_MAX_MESSAGE_LEN,
  canSend,
  lastSeenId,
  mergeMessages,
  messagesAfter,
  normalizeChat,
  shouldPoll,
  type ChatMessage,
} from '@/features/mailbox/chat';
import { unreadStore } from '@/features/mailbox/unread';
import { clearToken } from '@/features/auth/tokenStore';

jest.mock('expo-router', () => {
  const ReactInside = require('react');
  return {
    useLocalSearchParams: () => ({ threadId: '11' }),
    // 真实 API 是 `useFocusEffect(cb)`；这里退化成"挂载即聚焦"
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactInside.useEffect(cb, []);
    },
  };
});
jest.mock('../../../shared/api/marketplace', () => ({
  getMarketplaceThreadMessages: jest.fn(),
  sendMarketplaceThreadMessage: jest.fn(),
  markMarketplaceThreadRead: jest.fn(),
  listMyChatThreads: jest.fn(),
}));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn() }));
jest.mock('../../../shared/api/notifications', () => ({ getUnreadSummary: jest.fn() }));

const api = {
  marketplace: require('../../../shared/api/marketplace') as {
    getMarketplaceThreadMessages: jest.Mock;
    sendMarketplaceThreadMessage: jest.Mock;
    markMarketplaceThreadRead: jest.Mock;
  },
  users: require('../../../shared/api/users') as { getMe: jest.Mock },
  notifications: require('../../../shared/api/notifications') as { getUnreadSummary: jest.Mock },
};

const SRC_ROOT = path.resolve(__dirname, '..');
const readUi = (file: string): string =>
  fs.readFileSync(path.join(SRC_ROOT, 'components', 'ui', file), 'utf8');

const THREAD_PAYLOAD = {
  thread: { id: 11, item_id: 5, item_title: '二手键盘', seller_user_id: 7, buyer_user_id: 9 },
  list: [
    {
      id: 1,
      sender_user_id: 9,
      content: '还在吗',
      created_at: '2026-10-06 10:00:00',
      sender: { id: 9, name: '买家九' },
    },
    {
      id: 2,
      sender_user_id: 7,
      content: '在的',
      created_at: '2026-10-06 10:00:01',
      sender: { id: 7, name: '我' },
    },
  ],
};

beforeEach(async () => {
  Object.values(api.marketplace).forEach((fn) => fn.mockReset());
  api.users.getMe.mockReset();
  api.notifications.getUnreadSummary.mockReset();
  api.users.getMe.mockResolvedValue({ id: 7 });
  api.notifications.getUnreadSummary.mockResolvedValue({ total: 0, byType: {}, byModule: {}, byCategory: {} });
  api.marketplace.markMarketplaceThreadRead.mockResolvedValue({ thread_id: 11 });
  await clearToken();
  unreadStore.reset();
});

describe('P2B-06 M-12 私信会话', () => {
  describe('TC-P2B-06-1A · 去重与顺序（同秒按 id 断胜负）', () => {
    it('按 id 去重 + 升序；重复 id 用**新的**那条覆盖', () => {
      const merged = mergeMessages(
        [{ id: 3, mine: true, content: '旧', createdAt: null, senderName: null }],
        [
          { id: 3, mine: true, content: '新', createdAt: null, senderName: null },
          { id: 2, mine: false, content: 'b', createdAt: null, senderName: null },
          { id: 2, mine: false, content: 'b', createdAt: null, senderName: null },
        ]
      );
      expect(merged.map((message) => message.id)).toEqual([2, 3]);
      expect(merged.find((message) => message.id === 3)?.content).toBe('新');
    });

    it('游标：lastSeenId 取最大 id，messagesAfter 只给增量', () => {
      const messages: ChatMessage[] = [
        { id: 5, mine: false, content: 'a', createdAt: null, senderName: null },
        { id: 9, mine: true, content: 'b', createdAt: null, senderName: null },
      ];
      expect(lastSeenId(messages)).toBe(9);
      expect(messagesAfter(messages, 5).map((message) => message.id)).toEqual([9]);
      expect(messagesAfter(messages, 9)).toEqual([]);
      expect(lastSeenId([])).toBe(0);
    });
  });

  describe('TC-P2B-06-2A · 1200 字上限由客户端拦', () => {
    it('空 / 只有空白 / 超限都发不出去；正好 1200 可以', () => {
      expect(canSend('')).toBe(false);
      expect(canSend('   \n ')).toBe(false);
      expect(canSend('你好')).toBe(true);
      expect(canSend('a'.repeat(CHAT_MAX_MESSAGE_LEN))).toBe(true);
      expect(canSend('a'.repeat(CHAT_MAX_MESSAGE_LEN + 1))).toBe(false);
    });

    it('上限与服务端常量一致（1200，即 `MARKETPLACE_CHAT_MAX_LEN`）', () => {
      expect(CHAT_MAX_MESSAGE_LEN).toBe(1200);
    });
  });

  describe('TC-P2B-06-3A · 该不该轮询（离开即停 / 后台停）', () => {
    it('只有"页面聚焦 + App 在前台"才轮询', () => {
      expect(shouldPoll({ focused: true, appActive: true })).toBe(true);
      expect(shouldPoll({ focused: false, appActive: true })).toBe(false);
      expect(shouldPoll({ focused: true, appActive: false })).toBe(false);
      expect(shouldPoll({ focused: false, appActive: false })).toBe(false);
    });

    it('页面确实用 `shouldPoll` 决定要不要建立定时器（⛔ 不是无条件 setInterval）', () => {
      const code = stripComments(fs.readFileSync(path.join(SRC_ROOT, 'features', 'mailbox', 'ChatScreen.tsx'), 'utf8'));
      expect(code).toContain('shouldPoll');
      expect(code).toMatch(/if \(!shouldPoll\([^)]*\)\) return;/);
      expect(code).toContain('CHAT_POLL_INTERVAL_MS');
    });
  });

  describe('TC-P2B-06-4A · 规范化：`mine` 由 viewerId 判定', () => {
    it('sender_user_id 等于自己的才算"我发的"；缺 id 的消息丢掉；缺 thread 返回 null', () => {
      const normalized = normalizeChat(THREAD_PAYLOAD, 7);
      expect(normalized).not.toBeNull();
      expect(normalized?.thread.itemTitle).toBe('二手键盘');
      expect(normalized?.messages.map((message) => message.mine)).toEqual([false, true]);

      const noId = normalizeChat({ thread: { id: 11 }, list: [{ sender_user_id: 7, content: 'x' }] }, 7);
      expect(noId?.messages).toEqual([]);
      expect(normalizeChat({ list: [] }, 7)).toBeNull();
      expect(normalizeChat(null, 7)).toBeNull();
    });
  });

  describe('TC-P2B-06-5A · 气泡：两态可辨且不靠颜色单独区分', () => {
    it('对方那条有发送者标签；我那条在已读时出现已读标记', async () => {
      const theirs = await renderApp(
        <ChatBubble testID="b1" mine={false} content="还在吗" senderLabel="买家九" timeLabel="10:00" />
      );
      expect(theirs.getByText('买家九')).toBeTruthy();
      expect(theirs.queryByTestId('b1-read')).toBeNull();
    });

    it('我那条 + read → 有已读标记；未读则没有', async () => {
      const readView = await renderApp(
        <ChatBubble testID="b2" mine content="在的" read readLabel={zh['mailbox.chat.read']} />
      );
      expect(readView.getByTestId('b2-read')).toBeTruthy();
      expect(readView.getByText(zh['mailbox.chat.read'])).toBeTruthy();
    });
  });

  describe('TC-P2B-06-6A · 页面端到端：消息上屏、发送、标已读', () => {
    it('挂载 → 两条消息上屏 + 对方那条触发标已读；输入后发送会调域接口', async () => {
      api.marketplace.getMarketplaceThreadMessages.mockResolvedValue(THREAD_PAYLOAD);
      api.marketplace.sendMarketplaceThreadMessage.mockResolvedValue({ id: 3 });

      const view = await renderApp(<ChatScreen />);

      await waitFor(() => expect(view.getByTestId('chat-message-1')).toBeTruthy());
      expect(view.getByTestId('chat-message-2')).toBeTruthy();
      expect(view.getByText('买家九')).toBeTruthy();
      // 对方发过消息 → 进来就标已读（否则读完了角标还在）
      await waitFor(() => expect(api.marketplace.markMarketplaceThreadRead).toHaveBeenCalledWith(11));

      // 空输入发不出去（发送键禁用）
      fireEvent.press(view.getByTestId('chat-composer-send'));
      expect(api.marketplace.sendMarketplaceThreadMessage).not.toHaveBeenCalled();

      // 输入走 `userEvent`（受控输入 + RNTL 14 的可靠路径）
      const user = userEvent.setup();
      await user.type(view.getByPlaceholderText(zh['mailbox.chat.placeholder']), '  你好  ');
      expect(view.getByTestId('chat-composer-send').props.accessibilityState.disabled).toBe(false);
      await user.press(view.getByTestId('chat-composer-send'));

      await waitFor(() =>
        expect(api.marketplace.sendMarketplaceThreadMessage).toHaveBeenCalledWith(11, '你好')
      );
    });
  });

  describe('TC-P2B-06-7A · 结构约束：D06 不建，裁决前提仍在', () => {
    it('⛔ `components/ui` 里没有 `ChatComposer.tsx`（P2B-06 裁决：与 O08 同语义）', () => {
      const hits = fs
        .readdirSync(path.join(SRC_ROOT, 'components', 'ui'))
        .filter((name) => /ChatComposer/i.test(name));
      expect(hits).toEqual([]);
    });

    it('裁决前提仍在：`O08` 必须还具备聊天输入条要用的那几个 prop', () => {
      const code = stripComments(readUi('InputSheet.tsx'));
      for (const prop of ['value', 'onChangeText', 'sendLabel', 'onSend', 'maxLength', 'counter', 'disabled', 'sending']) {
        expect({ prop, present: new RegExp(`${prop}\\??:`).test(code) }).toEqual({ prop, present: true });
      }
    });

    it('组件定义里记着这段裁决（含重建的触发条件）', () => {
      const doc = fs.readFileSync(
        path.resolve(SRC_ROOT, '..', '..', 'docs', 'app', 'design', 'App组件类型定义.md'),
        'utf8'
      );
      expect(doc).toContain('P2B-06 裁决');
      expect(doc).toContain('O08 InputSheet');
      expect(doc).toContain('触发重建的条件');
      expect(doc).toContain('提案·需所有者签字');
    });
  });
});
