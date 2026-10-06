/**
 * P2C-04 · `M-04` 我的帖子 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：profile 载荷 → 行（缺 id 丢掉）、正文摘要截断、去重合并、本地移除、图片 URL 归一化；
 *   S-1 页面：空态是 `firstRun`（引导发布）、错误态与空态不是一回事、删帖后**立刻消失**；
 *   S-5 结构约束：入口账本已随本任务更新（`posts` 落地了）。
 *
 * 依据：`docs/app/task/phase-2/P2C-04-M04我的帖子.md`。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { PostsScreen } from '@/features/me/PostsScreen';
import {
  imageUriOf,
  mergePostRows,
  normalizeProfilePosts,
  postExcerpt,
  removePostRow,
  type MyPostRow,
} from '@/features/me/posts';
import { EXPECTED_UNAVAILABLE, ME_ENTRIES } from '@/features/me/profile';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn(), getProfile: jest.fn() }));
jest.mock('../../../shared/api/posts', () => ({ deletePost: jest.fn() }));

const api = {
  users: require('../../../shared/api/users') as { getMe: jest.Mock; getProfile: jest.Mock },
  posts: require('../../../shared/api/posts') as { deletePost: jest.Mock },
};

const PROFILE_PAYLOAD = {
  user: { id: 7, username: 'student7', nickname: '小明' },
  posts: [
    {
      id: 31,
      content: '第一条帖子',
      type: 'normal',
      created_at: '2026-10-06 10:00:00',
      like_count: 2,
      comment_count: 1,
      images: [{ url: 'posts/p31.png', sort_order: 0 }],
    },
    { content: '没有 id 的行' },
  ],
  stats: { post_count: 1, comment_received_count: 1, like_received_count: 2 },
  page: 1,
  pageSize: 20,
  hasMore: false,
};

const row = (over: Partial<MyPostRow> = {}): MyPostRow => ({
  id: 31,
  excerpt: '第一条帖子',
  likeCount: 2,
  commentCount: 1,
  imageUri: null,
  createdAt: '2026-10-06 10:00:00',
  type: 'normal',
  ...over,
});

beforeEach(() => {
  for (const mod of Object.values(api)) {
    for (const fn of Object.values(mod)) (fn as jest.Mock).mockReset();
  }
  api.users.getMe.mockResolvedValue({ id: 7 });
  api.users.getProfile.mockResolvedValue(PROFILE_PAYLOAD);
  api.posts.deletePost.mockResolvedValue({ status: 0 });
  secondaryTabStore.clear();
});

describe('P2C-04 M-04 我的帖子', () => {
  describe('TC-P2C-04-1A · 规范化：缺 id 的行丢掉，字段有兜底', () => {
    it('只保留有效行；hasMore 与 total 来自服务端', () => {
      const parsed = normalizeProfilePosts(PROFILE_PAYLOAD);
      expect(parsed.rows.map((item) => item.id)).toEqual([31]);
      expect(parsed.rows[0].likeCount).toBe(2);
      expect(parsed.hasMore).toBe(false);
      expect(parsed.total).toBe(1);
      expect(parsed.userId).toBe(7);
    });

    it('非对象 / 空载荷 → 空结果（⛔ 不抛）', () => {
      expect(normalizeProfilePosts(null).rows).toEqual([]);
      expect(normalizeProfilePosts('nope').rows).toEqual([]);
      expect(normalizeProfilePosts({ posts: 'nope' }).rows).toEqual([]);
    });

    it('正文摘要：折叠空白、超长截断、空正文走兜底词条', () => {
      expect(postExcerpt('a\n\nb', '没有正文')).toBe('a b');
      expect(postExcerpt('', '没有正文')).toBe('没有正文');
      expect(postExcerpt(null, '没有正文')).toBe('没有正文');
      expect(postExcerpt('x'.repeat(100), '没有正文').length).toBeLessThanOrEqual(61);
      expect(postExcerpt('x'.repeat(100), '没有正文').endsWith('…')).toBe(true);
    });

    it('图片 URL 归一化（相对 key 也要能显示）', () => {
      expect(String(imageUriOf('posts/p31.png'))).toContain('p31.png');
      expect(imageUriOf('https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
      expect(imageUriOf('')).toBeNull();
    });
  });

  describe('TC-P2C-04-2A · 合并与本地移除', () => {
    it('追加时按 id 去重，保持服务端顺序', () => {
      const merged = mergePostRows([row({ id: 31 })], [row({ id: 31 }), row({ id: 30 })]);
      expect(merged.map((item) => item.id)).toEqual([31, 30]);
    });

    it('本地移除按 id（删帖后不等服务端那 10s 缓存）', () => {
      expect(removePostRow([row({ id: 31 }), row({ id: 30 })], 31).map((item) => item.id)).toEqual([30]);
      expect(removePostRow([row({ id: 31 })], 99)).toHaveLength(1);
    });
  });

  describe('TC-P2C-04-3A · 页面：空态是"引导发布"，不是"没有结果"', () => {
    it('帖子为空 → firstRun 空态 + 去发布动作', async () => {
      api.users.getProfile.mockResolvedValue({ ...PROFILE_PAYLOAD, posts: [], stats: { post_count: 0 } });
      const view = await renderApp(<PostsScreen />);

      await waitFor(() => expect(view.getByText(zh['me.posts.empty.title'])).toBeTruthy());
      expect(view.getByText(zh['me.posts.empty.action'])).toBeTruthy();
      expect(view.queryByText(zh['error.unknown.perceive'])).toBeNull();
    });

    it('请求失败 → 错误态（与空态不是一回事）', async () => {
      api.users.getProfile.mockRejectedValue({ kind: 'offline' });
      const view = await renderApp(<PostsScreen />);

      await waitFor(() => expect(view.getByText(zh['error.net.offline.perceive'])).toBeTruthy());
      expect(view.queryByText(zh['me.posts.empty.title'])).toBeNull();
    });
  });

  describe('TC-P2C-04-4A · 两步取数：先拿自己的 id 再取 profile', () => {
    it('不会去猜 id', async () => {
      const view = await renderApp(<PostsScreen />);
      await waitFor(() => expect(api.users.getProfile).toHaveBeenCalled());
      expect(api.users.getMe).toHaveBeenCalledTimes(1);
      expect(api.users.getProfile).toHaveBeenCalledWith(7, { page: 1, pageSize: 20 });
      await waitFor(() => expect(view.getByTestId('me-post-31')).toBeTruthy());
    });
  });

  describe('TC-P2C-04-5A · 删帖：确认后立刻消失', () => {
    it('点删除 → 弹确认 → 确认后调用接口且该行**立即**从列表移除', async () => {
      const view = await renderApp(<PostsScreen />);
      await waitFor(() => expect(view.getByTestId('me-post-delete-31')).toBeTruthy());

      fireEvent.press(view.getByTestId('me-post-delete-31'));
      // 确认键没有 testID（O03 的既有形态），按**文案**点它
      await waitFor(() => expect(view.getByText(zh['me.posts.delete.confirm'])).toBeTruthy());
      fireEvent.press(view.getByText(zh['me.posts.delete.confirm']));

      await waitFor(() => expect(api.posts.deletePost).toHaveBeenCalledWith(31));
      // 本地先移除：⛔ 不等服务端 profile 的 10s 缓存过期
      await waitFor(() => expect(view.queryByTestId('me-post-31')).toBeNull());
    });

    it('删失败 → 重新拉列表（⛔ 不静默吞掉）', async () => {
      api.posts.deletePost.mockRejectedValue({ kind: 'offline' });
      const view = await renderApp(<PostsScreen />);
      await waitFor(() => expect(view.getByTestId('me-post-delete-31')).toBeTruthy());
      const callsBefore = api.users.getProfile.mock.calls.length;

      fireEvent.press(view.getByTestId('me-post-delete-31'));
      await waitFor(() => expect(view.getByText(zh['me.posts.delete.confirm'])).toBeTruthy());
      fireEvent.press(view.getByText(zh['me.posts.delete.confirm']));

      await waitFor(() =>
        expect(api.users.getProfile.mock.calls.length).toBeGreaterThan(callsBefore)
      );
    });
  });

  describe('TC-P2C-04-6A · 入口账本随本任务更新', () => {
    it('`posts` 已落地 → 从缺口账本里删掉；路由文件真的在磁盘上', () => {
      expect(ME_ENTRIES.find((entry) => entry.key === 'posts')?.available).toBe(true);
      // ⛔ 不写死"账本里还剩谁"（那是快照，后续任务落地时必过期）—— 只断言本任务的相关项已移出
      expect(EXPECTED_UNAVAILABLE).not.toContain('posts');
      expect(
        fs.existsSync(path.resolve(__dirname, '..', 'app', 'me', 'posts.tsx'))
      ).toBe(true);
    });
  });
});
