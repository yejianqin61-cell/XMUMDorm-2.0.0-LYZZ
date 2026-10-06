import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { DishDetail } from '@/features/square/DishDetail';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: '7' }), useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false }) }));
jest.mock('../../../shared/api/canteen', () => ({ getProduct: jest.fn(), getProductCommentsRaw: jest.fn() }));
const api = require('../../../shared/api/canteen') as Record<string, jest.Mock>;
beforeEach(async () => {
  await clearNamespace(); jest.clearAllMocks();
  api.getProduct.mockResolvedValue({ id: 7, shop_id: 2, name: 'Rice', images: [], comments: { list: [], page: 1, pageSize: 10, hasMore: true } });
});
it('keeps the detail visible and offers retry when a comment page fails', async () => {
  api.getProductCommentsRaw.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<DishDetail />);
  await waitFor(() => expect(view.getByTestId('dish-load-more')).toBeTruthy());
  await fireEvent.press(view.getByTestId('dish-load-more'));
  await waitFor(() => expect(view.getByTestId('dish-comments-error')).toBeTruthy());
  expect(view.getByText('Rice')).toBeTruthy();
});
it('does not append a late comment response after the screen is gone', async () => {
  let finish!: (value: unknown) => void;
  api.getProductCommentsRaw.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = await renderApp(<DishDetail />);
  await waitFor(() => expect(view.getByTestId('dish-load-more')).toBeTruthy());
  await fireEvent.press(view.getByTestId('dish-load-more')); view.unmount();
  await act(async () => finish({ list: [], page: 2, pageSize: 10, hasMore: false }));
});
