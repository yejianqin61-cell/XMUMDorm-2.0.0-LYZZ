import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { DishActions } from '@/features/square/DishActions';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn((target) => require('expo-router').__targets.push(target)) }), __targets: [] }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ status: 'signedIn', handleAuthFailure: async (error: unknown) => error ?? { kind: 'unknown' } }) }));
jest.mock('../../../shared/api/canteen', () => ({ getProductFavoriteStatus: jest.fn(), addFavoriteProduct: jest.fn(), removeFavoriteProduct: jest.fn() }));
const api = require('../../../shared/api/canteen') as Record<string, jest.Mock>;
beforeEach(() => { jest.clearAllMocks(); api.getProductFavoriteStatus.mockResolvedValue({ favorited: false }); api.addFavoriteProduct.mockResolvedValue({ favorited: true }); api.removeFavoriteProduct.mockResolvedValue({ favorited: false }); require('expo-router').__targets.length = 0; });
it('offers a single review entry with the product id', async () => {
  const view = await renderApp(<DishActions productId={7} />);
  await fireEvent.press(view.getByTestId('dish-review'));
  expect(require('expo-router').__targets).toContainEqual({ pathname: '/canteen/review/[id]', params: { id: '7' } });
});
it('rereads the server favorite status after a successful mutation', async () => {
  const view = await renderApp(<DishActions productId={7} />);
  await waitFor(() => expect(view.getByTestId('dish-favorite').props.accessibilityState.disabled).toBe(false));
  api.getProductFavoriteStatus.mockResolvedValue({ favorited: true });
  await fireEvent.press(view.getByTestId('dish-favorite'));
  await waitFor(() => expect(view.getByText('取消收藏')).toBeTruthy());
  expect(api.addFavoriteProduct).toHaveBeenCalledWith(7);
  expect(api.getProductFavoriteStatus).toHaveBeenCalledTimes(2);
});
it('keeps the old value and offers retry when a favorite write fails', async () => {
  api.addFavoriteProduct.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<DishActions productId={7} />);
  await waitFor(() => expect(view.getByTestId('dish-favorite').props.accessibilityState.disabled).toBe(false));
  await fireEvent.press(view.getByTestId('dish-favorite'));
  await waitFor(() => expect(view.getByTestId('dish-favorite-error')).toBeTruthy());
  expect(view.getByText('收藏')).toBeTruthy();
});
it('removes a favorite and rereads instead of guessing the result', async () => {
  api.getProductFavoriteStatus.mockResolvedValueOnce({ favorited: true }).mockResolvedValue({ favorited: false });
  const view = await renderApp(<DishActions productId={7} />);
  await waitFor(() => expect(view.getByText('取消收藏')).toBeTruthy());
  await fireEvent.press(view.getByTestId('dish-favorite'));
  await waitFor(() => expect(api.getProductFavoriteStatus).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(view.getByTestId('dish-favorite').props.accessibilityState.disabled).toBe(false));
  expect(api.removeFavoriteProduct).toHaveBeenCalledWith(7);
});
it('prevents another write while the post-write status is unknown', async () => {
  api.getProductFavoriteStatus.mockResolvedValueOnce({ favorited: false }).mockReturnValue(new Promise(() => undefined));
  const view = await renderApp(<DishActions productId={7} />);
  await waitFor(() => expect(view.getByTestId('dish-favorite').props.accessibilityState.disabled).toBe(false));
  await fireEvent.press(view.getByTestId('dish-favorite'));
  await waitFor(() => expect(api.getProductFavoriteStatus).toHaveBeenCalledTimes(2));
  await fireEvent.press(view.getByTestId('dish-favorite'));
  expect(api.addFavoriteProduct).toHaveBeenCalledTimes(1);
  expect(api.removeFavoriteProduct).not.toHaveBeenCalled();
});
