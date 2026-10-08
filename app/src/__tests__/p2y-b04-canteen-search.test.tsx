import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { CanteenSearchScreen } from '@/features/square/CanteenSearchScreen';
import { validateSearchQuery, mergeSearchRows, normalizeSearchPage } from '@/features/square/canteenSearch';
jest.mock('expo-router', () => ({ __state: { targets: [] as unknown[] }, useRouter: () => ({ push: (target: unknown) => require('expo-router').__state.targets.push(target) }) }));
jest.mock('../../../shared/api/canteen', () => ({ searchCanteen: jest.fn() }));
const api = require('../../../shared/api/canteen') as { searchCanteen: jest.Mock };
const page = (name: string, id = 9) => ({ products: [{ id, name, shop_name: 'Kitchen', comprehensive_score: 7 }], articles: [], hasMore: { products: false, articles: false } });
beforeEach(() => { api.searchCanteen.mockReset().mockResolvedValue(page('Rice')); require('expo-router').__state.targets.length = 0; });
it('classifies empty and overlong keywords as business states', () => {
  expect(validateSearchQuery('   ')).toBe('empty'); expect(validateSearchQuery('x'.repeat(51))).toBe('tooLong'); expect(validateSearchQuery('x'.repeat(50))).toBeNull();
});
it('does not request for blank or overlong keywords', async () => {
  const view = await renderApp(<CanteenSearchScreen />);
  await fireEvent.press(view.getByTestId('canteen-search-submit'));
  await fireEvent.changeText(view.getByLabelText('搜索菜品或美食文章'), 'x'.repeat(51));
  await fireEvent.press(view.getByTestId('canteen-search-submit'));
  expect(api.searchCanteen).not.toHaveBeenCalled();
  expect(view.getByText('搜索词最多50字符')).toBeTruthy();
  expect(view.queryByTestId('canteen-search-list-error')).toBeNull();
});
it('navigates a product result to its existing detail route', async () => {
  const view = await renderApp(<CanteenSearchScreen />);
  await fireEvent.changeText(view.getByLabelText('搜索菜品或美食文章'), 'Rice');
  await fireEvent.press(view.getByTestId('canteen-search-submit'));
  await waitFor(() => expect(view.getByTestId('search-product-9')).toBeTruthy());
  await fireEvent.press(view.getByTestId('search-product-9'));
  expect(require('expo-router').__state.targets).toContainEqual({ pathname: '/canteen/product/[id]', params: { id: '9' } });
});
it('discards a slow result after the keyword has changed', async () => {
  let finish!: (value: unknown) => void;
  api.searchCanteen.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(page('Noodles', 10));
  const view = await renderApp(<CanteenSearchScreen />);
  await fireEvent.changeText(view.getByLabelText('搜索菜品或美食文章'), 'Rice'); await fireEvent.press(view.getByTestId('canteen-search-submit'));
  await fireEvent.changeText(view.getByLabelText('搜索菜品或美食文章'), 'Noodles'); await fireEvent.press(view.getByTestId('canteen-search-submit'));
  await waitFor(() => expect(view.getByText('Noodles')).toBeTruthy());
  await act(async () => { finish(page('Rice')); });
  expect(view.queryByText('Rice')).toBeNull();
});
it('uses backend pagination and deduplicates each result type', () => {
  const first = normalizeSearchPage({ ...page('Rice'), hasMore: { products: true, articles: false } })!;
  const second = normalizeSearchPage(page('Rice'))!;
  expect(first.hasMore.products).toBe(true);
  expect(mergeSearchRows(first.rows, second.rows)).toHaveLength(1);
  expect(normalizeSearchPage(null)).toBeNull();
});
it('shows network failure with a retry action', async () => {
  api.searchCanteen.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<CanteenSearchScreen />);
  await fireEvent.changeText(view.getByLabelText('搜索菜品或美食文章'), 'Rice'); await fireEvent.press(view.getByTestId('canteen-search-submit'));
  await waitFor(() => expect(view.getByTestId('canteen-search-list-error')).toBeTruthy());
  expect(view.getByText('网络没连上')).toBeTruthy();
});
