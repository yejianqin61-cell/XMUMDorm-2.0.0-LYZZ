import * as React from 'react';
import * as rankingApi from '../../../shared/api/rankings';
import * as canteenApi from '../../../shared/api/canteen';

import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { CanteenHome } from '@/features/square/CanteenHome';
import { CanteenRankings } from '@/features/square/CanteenRankings';
import { normalizeRanking } from '@/features/square/canteenRankingModel';
const mockTargets: unknown[] = [];
jest.mock('expo-router', () => ({ useRouter: () => ({ push: (target: unknown) => mockTargets.push(target) }), targets: [] }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('../../../shared/api/rankings', () => ({ getRankingsHotProducts: jest.fn(), getRankingsBusyShops: jest.fn(), getRankingsTopShops: jest.fn(), getRankingsNewHitProducts: jest.fn(), getRankingsActiveUsers: jest.fn() }));
jest.mock('../../../shared/api/canteen', () => ({ getRegions: jest.fn(), getFoodArticles: jest.fn().mockResolvedValue({ list: [], hasMore: false }), pickRandomMeal: jest.fn() }));
const api = jest.mocked(rankingApi);
beforeEach(() => {
  jest.clearAllMocks();
  mockTargets.length = 0;
  api.getRankingsHotProducts.mockResolvedValue([{ product_id: 7, product_name: 'Rice', rank: 1, comprehensive_score: 8, shop_name: 'Kitchen' }]);
  api.getRankingsBusyShops.mockResolvedValue([{ shop_id: 8, shop_name: 'Kitchen', rank: 1, weekly_review_count: 4 }]);
  api.getRankingsActiveUsers.mockResolvedValue([{ user_id: 3, nickname: 'Reviewer', rank: 1, weekly_comment_count: 5 }]);
  jest.mocked(canteenApi).getRegions.mockResolvedValue([{ id: 1, name: 'D6' }]);
  jest.mocked(canteenApi).pickRandomMeal.mockResolvedValue({ id: 7 });
});
it('projects each valid raw ranking row without borrowing the previous row metadata', () => {
  expect(normalizeRanking('hotProducts', [{ product_id: null }, { product_id: 7, product_name: 'Rice', rank: 2, shop_name: 'Kitchen', comprehensive_score: 8 }])).toEqual([
    { id: 7, kind: 'product', name: 'Rice', rank: 2, subtitle: 'Kitchen', score: 8, count: null, image: null },
  ]);
});
it('requests only the selected category and opens the existing shop detail', async () => {
  const view = await renderApp(<CanteenRankings tabs={[{ key: 'hotProducts', labelKey: 'canteen.dishes' }, { key: 'busyShops', labelKey: 'canteen.shopsTitle' }]} />);
  await waitFor(() => expect(view.getByTestId('canteen-ranking-product-7')).toBeTruthy());
  expect(api.getRankingsBusyShops).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('top-tab-busyShops'));
  await waitFor(() => expect(view.getByTestId('canteen-ranking-shop-8')).toBeTruthy());
  await fireEvent.press(view.getByTestId('canteen-ranking-shop-8'));
  expect(mockTargets).toEqual([{ pathname: '/canteen/shop/[id]', params: { id: '8' } }]);
});
it('renders active users as read-only rows with no fabricated target', async () => {
  const view = await renderApp(<CanteenRankings tabs={[{ key: 'activeUsers', labelKey: 'canteen.comments' }]} />);
  await waitFor(() => expect(view.getByText(/Reviewer/)).toBeTruthy());
  expect(view.getByTestId('canteen-ranking-user-3').props.accessibilityRole).not.toBe('button');
  expect(mockTargets).toEqual([]);
});
it('keeps search text on submit and removes unrelated service entries', async () => {
  const view = await renderApp(<CanteenHome />);
  await fireEvent.changeText(view.getByLabelText('搜索菜品或美食文章'), 'Rice');
  await fireEvent(view.getByLabelText('搜索菜品或美食文章'), 'submitEditing');
  expect(mockTargets).toContainEqual({ pathname: '/canteen/search', params: { query: 'Rice' } });
  expect(view.queryByTestId('square-services')).toBeNull();
  await waitFor(() => expect(view.getByTestId('canteen-regions-1')).toBeTruthy());
  await fireEvent.press(view.getByTestId('canteen-pick'));
  await fireEvent.press(await waitFor(() => view.getByTestId('canteen-picked-open')));
  await waitFor(() => expect(mockTargets).toContainEqual({ pathname: '/canteen/product/[id]', params: { id: '7' } }));
});
