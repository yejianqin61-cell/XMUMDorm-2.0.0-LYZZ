import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { ReviewScreen } from '@/features/square/ReviewScreen';
import { canteenRevision } from '@/features/square/canteenCache';
jest.mock('expo-router', () => ({ __state: { targets: [] as unknown[] }, useRouter: () => ({ replace: (target: unknown) => require('expo-router').__state.targets.push(target), back: jest.fn(), canGoBack: () => false }) }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async (error: unknown) => error ?? { kind: 'unknown' } }) }));
jest.mock('../../../shared/api/canteen', () => ({ postProductComment: jest.fn() }));
const api = require('../../../shared/api/canteen') as { postProductComment: jest.Mock };
beforeEach(async () => { await clearNamespace(); api.postProductComment.mockReset().mockResolvedValue({ id: 42 }); require('expo-router').__state.targets.length = 0; });
it('does not submit without a rating', async () => {
  const view = await renderApp(<ReviewScreen productId={9} />);
  await fireEvent.changeText(view.getByLabelText(/正文/), 'Good');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  expect(api.postProductComment).not.toHaveBeenCalled();
  expect(view.getAllByText('请选择一个评级档位').length).toBeGreaterThan(0);
});
it('submits the five-tier value then invalidates and navigates to the product', async () => {
  const start = canteenRevision();
  const view = await renderApp(<ReviewScreen productId={9} />);
  await fireEvent.press(view.getByTestId('review-rating-hot'));
  await fireEvent.changeText(view.getByLabelText(/正文/), '  Good  ');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await waitFor(() => expect(api.postProductComment).toHaveBeenCalledWith(9, { rating: '夯爆了', content: 'Good', imageFiles: [] }));
  await waitFor(() => expect(require('expo-router').__state.targets).toContainEqual({ pathname: '/canteen/product/[id]', params: { id: '9' } }));
  expect(canteenRevision()).toBe(start + 1);
});
it('retains the text and does not invalidate when submission fails', async () => {
  api.postProductComment.mockRejectedValue({ kind: 'offline' });
  const start = canteenRevision();
  const view = await renderApp(<ReviewScreen productId={9} />);
  await fireEvent.press(view.getByTestId('review-rating-top'));
  await fireEvent.changeText(view.getByLabelText(/正文/), 'Keep this');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await waitFor(() => expect(view.getByText('没连上网络')).toBeTruthy());
  expect(view.getByDisplayValue('Keep this')).toBeTruthy();
  expect(canteenRevision()).toBe(start);
});
it('does not issue a write request for an invalid deep link', async () => {
  const view = await renderApp(<ReviewScreen productId={NaN} />);
  expect(view.getByTestId('review-product-missing')).toBeTruthy();
  expect(api.postProductComment).not.toHaveBeenCalled();
});
it('blocks duplicate submission while the first request is pending', async () => {
  let finish!: (value: unknown) => void;
  api.postProductComment.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const view = await renderApp(<ReviewScreen productId={9} />);
  await fireEvent.press(view.getByTestId('review-rating-above'));
  await fireEvent.changeText(view.getByLabelText(/正文/), 'Good');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await fireEvent.press(view.getByTestId('review-form-submit'));
  expect(api.postProductComment).toHaveBeenCalledTimes(1);
  finish({ id: 42 });
  await waitFor(() => expect(require('expo-router').__state.targets).toHaveLength(1));
});
