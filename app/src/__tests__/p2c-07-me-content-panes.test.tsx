/**
 * P2C-07 · 「我的」四个内容分页 —— 自动化用例
 *
 * 测什么：
 *   S-1 分页：四个 pane 各自取数与渲染；**未激活的分页不取数**（pager 四页常驻，
 *       ⛔ 不能一进主页就并发四个请求）；
 *   S-1 树洞：删帖确认后**立刻消失**（服务端 profile 有 10s 缓存，⛔ 不等它过期）；
 *   S-4 状态键位：滚动位置与分页游标按 `(me, <tab>)` 存取（R2）。
 *
 * 依据：`docs/app/task/phase3-yps/y7/01-Me模块四Tab提升计划.md`（R-M3）。
 */
import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { MeContentPane } from '@/features/me/ContentPanes';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn(), getProfile: jest.fn() }));
jest.mock('../../../shared/api/posts', () => ({ deletePost: jest.fn() }));
jest.mock('../../../shared/api/canteen', () => ({ getMyProductReviews: jest.fn() }));
jest.mock('../../../shared/api/marketplace', () => ({ listMarketplaceMyItems: jest.fn(), listMarketplaceMyWants: jest.fn() }));
jest.mock('../../../shared/api/errands', () => ({ listMyErrands: jest.fn() }));

const api = {
  users: require('../../../shared/api/users') as { getMe: jest.Mock; getProfile: jest.Mock },
  posts: require('../../../shared/api/posts') as { deletePost: jest.Mock },
  canteen: require('../../../shared/api/canteen') as { getMyProductReviews: jest.Mock },
  marketplace: require('../../../shared/api/marketplace') as { listMarketplaceMyItems: jest.Mock; listMarketplaceMyWants: jest.Mock },
  errands: require('../../../shared/api/errands') as { listMyErrands: jest.Mock },
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

beforeEach(() => {
  for (const mod of Object.values(api)) {
    for (const fn of Object.values(mod)) (fn as jest.Mock).mockReset();
  }
  api.users.getMe.mockResolvedValue({ id: 7 });
  api.users.getProfile.mockResolvedValue(PROFILE_PAYLOAD);
  api.posts.deletePost.mockResolvedValue({ status: 0 });
  api.marketplace.listMarketplaceMyItems.mockResolvedValue({ items: [], page: 1, hasMore: false });
  api.marketplace.listMarketplaceMyWants.mockResolvedValue({ list: [], hasMore: false });
  api.errands.listMyErrands.mockResolvedValue({ items: [], page: 1, hasMore: false });
  api.canteen.getMyProductReviews.mockResolvedValue({ items: [], page: 1, hasMore: false });
  secondaryTabStore.clear();
});

describe('P2C-07 「我的」四个内容分页', () => {
  describe('TC-P2C-07-1A · 树洞分页：取数与删帖', () => {
    it('取数后渲染行；删帖确认后该行**立刻**消失', async () => {
      const view = await renderApp(<MeContentPane kind="posts" active />);
      await waitFor(() => expect(view.getByTestId('me-post-31')).toBeTruthy());

      fireEvent.press(view.getByTestId('me-post-delete-31'));
      await waitFor(() => expect(view.getByText(zh['me.posts.delete.confirm'])).toBeTruthy());
      fireEvent.press(view.getByText(zh['me.posts.delete.confirm']));

      await waitFor(() => expect(api.posts.deletePost).toHaveBeenCalledWith(31));
      // 本地先移除：⛔ 不等服务端那 10s 缓存
      await waitFor(() => expect(view.queryByTestId('me-post-31')).toBeNull());
    });

    it('两步取数：先拿自己的 id，⛔ 不猜 id', async () => {
      const view = await renderApp(<MeContentPane kind="posts" active />);
      await waitFor(() => expect(view.getByTestId('me-post-31')).toBeTruthy());
      expect(api.users.getMe).toHaveBeenCalledTimes(1);
      expect(api.users.getProfile).toHaveBeenCalledWith(7, { page: 1, pageSize: 20 });
    });
  });

  describe('TC-P2C-07-2A · 未激活的分页不许取数（pager 四页常驻）', () => {
    it('`active=false` 时不发请求，但 pane 已挂载', async () => {
      const view = await renderApp(<MeContentPane kind="marketplace" active={false} />);
      expect(view.getByTestId('me-content-pane-marketplace')).toBeTruthy();
      await waitFor(() => expect(view.getByTestId('me-content-marketplace')).toBeTruthy());
      expect(api.marketplace.listMarketplaceMyItems).not.toHaveBeenCalled();
    });

    it('`active=true` 时取数', async () => {
      const view = await renderApp(<MeContentPane kind="marketplace" active />);
      await waitFor(() => expect(api.marketplace.listMarketplaceMyItems).toHaveBeenCalled());
      expect(view.getByTestId('me-content-pane-marketplace')).toBeTruthy();
    });
  });

  describe('TC-P2C-07-4A · 二手面板内切「我的想要」（阶段B-05）', () => {
    it('切到想要才调用想要接口，且不改内容 Tab 集合', async () => {
      const view = await renderApp(<MeContentPane kind="marketplace" active />);
      await waitFor(() => expect(view.getByTestId('me-content-marketplace')).toBeTruthy());
      expect(api.marketplace.listMarketplaceMyItems).toHaveBeenCalled();
      expect(api.marketplace.listMarketplaceMyWants).not.toHaveBeenCalled();

      await fireEvent.press(view.getByTestId('me-market-mode-wants'));
      await waitFor(() =>
        expect(api.marketplace.listMarketplaceMyWants).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
      );

      await fireEvent.press(view.getByTestId('me-market-mode-items'));
      await waitFor(() =>
        expect(api.marketplace.listMarketplaceMyItems).toHaveBeenCalledTimes(2)
      );
    });
  });

  describe('TC-P2C-07-3A · 状态键位按 (me, <tab>) 存取（R2）', () => {
    it('滚动位置写回的是本分页自己的键', async () => {
      const view = await renderApp(<MeContentPane kind="errands" active />);
      await waitFor(() => expect(view.getByTestId('me-content-errands')).toBeTruthy());
      expect(api.errands.listMyErrands).toHaveBeenCalled();
      // 位置由 ListScreen 经 store 写回；这里断言键位存在（未被别的 tab 顶掉）
      expect(secondaryTabStore.get('me', 'errands')).toBeDefined();
    });
  });
});
