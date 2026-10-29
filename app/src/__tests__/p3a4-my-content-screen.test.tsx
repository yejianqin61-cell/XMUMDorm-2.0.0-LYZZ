import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/features/auth/session';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { MeScreen } from '@/features/me/MeScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/users', () => ({
  getMe: jest.fn(),
  getProfile: jest.fn(),
}));
jest.mock('../../../shared/api/posts', () => ({ deletePost: jest.fn() }));
jest.mock('../../../shared/api/canteen', () => ({ getMyProductReviews: jest.fn() }));
jest.mock('../../../shared/api/marketplace', () => ({ listMarketplaceMyItems: jest.fn() }));
jest.mock('../../../shared/api/errands', () => ({ listMyErrands: jest.fn() }));

const users = require('../../../shared/api/users') as { getMe: jest.Mock; getProfile: jest.Mock };
const posts = require('../../../shared/api/posts') as { deletePost: jest.Mock };
const canteen = require('../../../shared/api/canteen') as { getMyProductReviews: jest.Mock };
const marketplace = require('../../../shared/api/marketplace') as { listMarketplaceMyItems: jest.Mock };
const errands = require('../../../shared/api/errands') as { listMyErrands: jest.Mock };

/** 页面自阶段2-02 起走「单一取数点」：需要会话与缓存 Provider（与真实根布局同口径） */
const withProviders = (node: React.ReactElement): React.ReactElement => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}>
    <SessionProvider>{node}</SessionProvider>
  </QueryClientProvider>
);

beforeEach(() => {
  for (const module of [users, posts, canteen, marketplace, errands]) {
    for (const fn of Object.values(module)) fn.mockReset();
  }
  users.getMe.mockResolvedValue({ id: 7 });
  users.getProfile.mockResolvedValue({ user: { id: 7 }, posts: [], stats: { post_count: 0 }, hasMore: false });
  canteen.getMyProductReviews.mockResolvedValue({ list: [], hasMore: false });
  marketplace.listMarketplaceMyItems.mockResolvedValue({ list: [], hasMore: false });
  errands.listMyErrands.mockResolvedValue({ list: [], page: 1, pageSize: 20, total: 0 });
});

describe('P3A4-08 我的内容 Tab 接线', () => {
  it('uses the shared TopTabStrip and loads each real ownership endpoint after selection', async () => {
    // C-05 拍板后「我的内容」就是**一级主页本身**（子页面与 PostsScreen 已删）
  const view = await renderApp(withProviders(<MeScreen />));

    expect(view.getByTestId('me-content-tabs')).toBeTruthy();
    expect(view.getByTestId('top-tab-posts')).toBeTruthy();
    expect(view.getByTestId('top-tab-marketplace')).toBeTruthy();
    expect(view.getByTestId('top-tab-errands')).toBeTruthy();
    expect(view.getByTestId('top-tab-reviews')).toBeTruthy();

    marketplace.listMarketplaceMyItems.mockResolvedValueOnce({
      list: [{ id: 21, title: 'Lamp', description: 'Used', price: 12, status: 'on_sale' }],
      hasMore: false,
    });
    fireEvent.press(view.getByTestId('top-tab-marketplace'));
    await waitFor(() => expect(marketplace.listMarketplaceMyItems).toHaveBeenCalledWith({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(view.getByTestId('me-marketplace-21')).toBeTruthy());

    errands.listMyErrands.mockResolvedValueOnce({
      list: [{ id: 22, title: 'Pick up', reward: 5, type: 'delivery', status: 'open', owner: { id: 7, username: 'me' } }],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    fireEvent.press(view.getByTestId('top-tab-errands'));
    await waitFor(() => expect(errands.listMyErrands).toHaveBeenCalledWith({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(view.getByTestId('me-errand-22')).toBeTruthy());

    canteen.getMyProductReviews.mockResolvedValueOnce({
      list: [{ id: 23, product_id: 8, product_name: 'Noodles', shop_name: 'Food Square', rating: '顶级', content: 'Good' }],
      hasMore: false,
    });
    fireEvent.press(view.getByTestId('top-tab-reviews'));
    await waitFor(() => expect(canteen.getMyProductReviews).toHaveBeenCalledWith({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(view.getByTestId('me-review-23')).toBeTruthy());
  });
});
