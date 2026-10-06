/**
 * P2B-04 · F-01 信箱页 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：分批 ≤100、可点性（`available:false` 置灰）、公告不可清、类型 → 词条；
 *   S-1 页面：四态（空/错误）、已读后**重新拉汇总**（⛔ 不本地递减）。
 *
 * 依据：`docs/app/task/phase-2/P2B-04-F01信箱页.md`、页面清单 §3-F 的十条要点。
 */
import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { clearToken, saveToken } from '@/features/auth/tokenStore';
import { MailboxScreen } from '@/features/mailbox/MailboxScreen';
import {
  READ_BATCH_SIZE,
  canOpenNotification,
  chunkIds,
  isClearable,
  normalizeNotificationPage,
  notificationKindKey,
  unreadIds,
  type NotificationRow,
} from '@/features/mailbox/notifications';
import { unreadStore } from '@/features/mailbox/unread';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/notifications', () => ({
  getNotifications: jest.fn(),
  getUnreadSummary: jest.fn(),
  markNotificationsReadBatch: jest.fn(),
  clearNotificationsByCategory: jest.fn(),
}));

const api = require('../../../shared/api/notifications') as {
  getNotifications: jest.Mock;
  getUnreadSummary: jest.Mock;
  markNotificationsReadBatch: jest.Mock;
  clearNotificationsByCategory: jest.Mock;
};

const row = (over: Partial<NotificationRow> = {}): NotificationRow => ({
  id: 1,
  type: 'treehole_like',
  isRead: false,
  title: '有人在树洞赞了你',
  target: { type: 'post', id: 12, title: '有人在树洞赞了你', path: '/post/12', available: true },
  category: 'interaction',
  module: 'treehole',
  fromName: '小明',
  createdAt: '2026-10-06 10:00:00',
  ...over,
});

const page = (list: unknown[], over: Record<string, unknown> = {}) => ({
  list,
  hasMore: false,
  page: 1,
  pageSize: 50,
  unreadSummary: { total: 3, byType: {}, byModule: {}, byCategory: { interaction: 3 } },
  ...over,
});

beforeEach(async () => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getUnreadSummary.mockResolvedValue({ total: 0, byType: {}, byModule: {}, byCategory: {} });
  unreadStore.reset();
  await clearToken();
  secondaryTabStore.clear();
});

describe('P2B-04 F-01 信箱页', () => {
  describe('TC-P2B-04-1A · 批量已读按 100 分批', () => {
    it('250 个 id → 3 批（100/100/50），⛔ 没有一批超过上限', () => {
      const ids = Array.from({ length: 250 }, (_, index) => index + 1);
      const batches = chunkIds(ids);
      expect(batches.map((batch) => batch.length)).toEqual([100, 100, 50]);
      expect(Math.max(...batches.map((batch) => batch.length))).toBe(READ_BATCH_SIZE);
      expect(batches.flat()).toEqual(ids);
    });

    it('空列表 → 没有批次；正好 100 个 → 1 批', () => {
      expect(chunkIds([])).toEqual([]);
      expect(chunkIds(Array.from({ length: 100 }, (_, i) => i))).toHaveLength(1);
    });

    it('只对未读行取 id', () => {
      expect(unreadIds([row({ id: 1, isRead: true }), row({ id: 2 })])).toEqual([2]);
    });
  });

  describe('TC-P2B-04-2A · 可点性：不可用的目标置灰', () => {
    it('`available:false` 与 `path:"#"` 都不可点', () => {
      expect(
        canOpenNotification(row({ target: { ...row().target, available: false } }))
      ).toBe(false);
      expect(canOpenNotification(row({ target: { ...row().target, path: '#' } }))).toBe(false);
      expect(canOpenNotification(row())).toBe(true);
    });

    it('规范化：`available` 缺失按可用处理（后端只用 false 表达不可用）', () => {
      const normalized = normalizeNotificationPage(
        page([{ id: 5, type: 'like', is_read: false, target: { type: 'post', id: 1, path: '/post/1' } }])
      );
      expect(normalized.list[0].target.available).toBe(true);
      expect(canOpenNotification(normalized.list[0])).toBe(true);
    });

    it('没有 id 的行整行丢掉（标不了已读的行留着只会骗人）', () => {
      const normalized = normalizeNotificationPage(page([{ type: 'like' }, { id: 0 }, { id: 7 }]));
      expect(normalized.list.map((item) => item.id)).toEqual([7]);
    });
  });

  describe('TC-P2B-04-3A · 公告永不可清空', () => {
    it('isClearable 排除 announcement / system_announcement', () => {
      expect(isClearable('announcement')).toBe(false);
      expect(isClearable('system_announcement')).toBe(false);
      expect(isClearable('treehole_like')).toBe(true);
      expect(isClearable('marketplace_chat')).toBe(true);
    });
  });

  describe('TC-P2B-04-4A · 类型 → 词条（不逐类型造 key）', () => {
    it('收敛到 5 个说法，且都在词条表里', () => {
      const cases: [string, string][] = [
        ['announcement', 'mailbox.kind.announcement'],
        ['system_announcement', 'mailbox.kind.announcement'],
        ['marketplace_chat', 'mailbox.kind.chat'],
        ['treehole_like', 'mailbox.kind.like'],
        ['trending_comment', 'mailbox.kind.comment'],
        ['something_new', 'mailbox.kind.other'],
      ];
      for (const [type, key] of cases) {
        expect(notificationKindKey(type)).toBe(key);
        expect(Object.keys(zh)).toContain(key);
      }
    });
  });

  describe('TC-P2B-04-5A · 页面：四态与已读后重新拉汇总', () => {
    it('空列表 → 空态（不是错误态）', async () => {
      api.getNotifications.mockResolvedValue(page([]));
      const view = await renderApp(<MailboxScreen />);

      await waitFor(() => expect(view.getByText(zh['mailbox.empty.title'])).toBeTruthy());
      expect(view.queryByText(zh['error.unknown.perceive'])).toBeNull();
    });

    it('请求失败 → 错误态（不是空态）', async () => {
      api.getNotifications.mockRejectedValue({ kind: 'offline' });
      const view = await renderApp(<MailboxScreen />);

      await waitFor(() => expect(view.getByText(zh['error.net.offline.perceive'])).toBeTruthy());
      expect(view.queryByText(zh['mailbox.empty.title'])).toBeNull();
    });

    it('有未读时点「全部已读」→ 按批调用 + **重新拉未读汇总**（⛔ 不本地递减角标）', async () => {
      const rows = Array.from({ length: 120 }, (_, index) => ({
        id: index + 1,
        type: 'treehole_like',
        is_read: false,
        target: { type: 'post', id: index + 1, path: `/post/${index + 1}`, available: true },
      }));
      api.getNotifications.mockResolvedValue(page(rows));
      api.markNotificationsReadBatch.mockResolvedValue({ ids: [], updated: 1 });
      // 已登录才会有未读真源可拉（P2B-01：未登录不发请求）
      await saveToken('p2b-04-token');

      const view = await renderApp(<MailboxScreen />);
      await waitFor(() => expect(view.getByTestId('mailbox-mark-all-read')).toBeTruthy());
      await waitFor(() => expect(api.getUnreadSummary).toHaveBeenCalled());
      const before = api.getUnreadSummary.mock.calls.length;

      fireEvent.press(view.getByTestId('mailbox-mark-all-read'));

      await waitFor(() => expect(api.markNotificationsReadBatch).toHaveBeenCalledTimes(2));
      // 第一批 100、第二批 20 —— ⛔ 没有任何一批超过服务端上限
      expect(api.markNotificationsReadBatch.mock.calls[0][0]).toHaveLength(100);
      expect(api.markNotificationsReadBatch.mock.calls[1][0]).toHaveLength(20);
      // 角标走真源：已读之后必须**重新拉一次**汇总（⛔ 不本地递减）
      await waitFor(() =>
        expect(api.getUnreadSummary.mock.calls.length).toBeGreaterThan(before)
      );
    });
  });
});
