import * as React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { AddDishScreen, type AddDishLabels } from '@/features/square/AddDishScreen';
import { prepareDish } from '@/features/square/addDish';
import { createProduct, getShop } from '../../../shared/api/canteen';
import { clearNamespace } from '@/shared/storage';
const mockCreated = jest.fn();
const mockTokenState = { value: 'header.eyJpZCI6MX0.signature' };
const labels: AddDishLabels = { titleKey: 'canteen.menuTitle', categoryKey: 'canteen.allCategories', nameKey: 'tools.todos.field.title', descriptionKey: 'canteen.review.content',
  priceKey: 'canteen.price', imagesKey: 'canteen.review.images', invalidPriceKey: 'form.error.required', invalidCategoryKey: 'form.error.required',
  tooManyImagesKey: 'canteen.review.tooManyImages', submitKey: 'action.save', failedKey: 'canteen.review.failed', serverRuleKey: 'canteen.review.serverRule' };
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: jest.fn() }), useRouter: () => ({ push: jest.fn(), replace: jest.fn(), canGoBack: () => false, back: jest.fn() }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/tokenStore', () => ({
  readTokenSync: () => mockTokenState.value,
  tokenAccountId: () => 'dish-test-owner',
}));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ status: 'signedIn', handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('../../../shared/api/canteen', () => ({ createProduct: jest.fn(), getShop: jest.fn() }));
beforeEach(async () => { await clearNamespace(); mockTokenState.value = 'header.eyJpZCI6MX0.signature'; jest.clearAllMocks(); jest.mocked(getShop).mockResolvedValue({ id: 8, name: 'Kitchen', categories: [{ id: 2, name: 'Meals' }] }); jest.mocked(createProduct).mockResolvedValue({ id: 17, name: 'Rice' }); });
it('prepares a literal nullable-price payload and rejects foreign categories and invalid prices', () => {
  expect(prepareDish({ category_id: '2', name: ' Rice ', description: '', price: '', images: [] }, [{ id: 2, name: 'Meals' }])).toEqual({ ok: true, value: { category_id: 2, name: 'Rice', description: '', price: null, images: [] } });
  expect(prepareDish({ category_id: 3, name: 'Rice', price: '9', images: [] }, [{ id: 2, name: 'Meals' }])).toEqual({ ok: false, field: 'category_id' });
  expect(prepareDish({ category_id: 2, name: 'Rice', price: '-1', images: [] }, [{ id: 2, name: 'Meals' }])).toEqual({ ok: false, field: 'price' });
});
it('prevents an empty name from writing', async () => {
  const view = await renderApp(<AddDishScreen shopId={8} labels={labels} onCreated={mockCreated} />);
  await waitFor(() => expect(view.getByTestId('add-dish-form-submit')).toBeTruthy());
  await fireEvent.press(view.getByTestId('add-dish-form-submit'));
  expect(createProduct).not.toHaveBeenCalled(); expect(mockCreated).not.toHaveBeenCalled();
});
it('writes the selected category and returns the server product only after success', async () => {
  const view = await renderApp(<AddDishScreen shopId={8} labels={labels} onCreated={mockCreated} />);
  await waitFor(() => expect(view.getByLabelText(/标题/)).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText(/标题/), 'Rice');
  await fireEvent.press(view.getByTestId('add-dish-form-submit'));
  await waitFor(() => expect(mockCreated).toHaveBeenCalledWith(17));
  expect(createProduct).toHaveBeenCalledWith({ category_id: 2, name: 'Rice', description: '', price: null, images: [] });
});
it('does not report success after an API rejection', async () => {
  jest.mocked(createProduct).mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<AddDishScreen shopId={8} labels={labels} onCreated={mockCreated} />);
  await waitFor(() => expect(view.getByLabelText(/标题/)).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText(/标题/), 'Rice');
  await fireEvent.press(view.getByTestId('add-dish-form-submit'));
  await waitFor(() => expect(view.getByText('网络没连上')).toBeTruthy());
  expect(mockCreated).not.toHaveBeenCalled();
});
it('discards a successful creation receipt after the account identity changes', async () => {
  let finish!: (value: unknown) => void;
  jest.mocked(createProduct).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const view = await renderApp(<AddDishScreen shopId={8} labels={labels} onCreated={mockCreated} />);
  await waitFor(() => expect(view.getByLabelText(/标题/)).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText(/标题/), 'Rice');
  await fireEvent.press(view.getByTestId('add-dish-form-submit'));
  await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
  mockTokenState.value = 'header.eyJpZCI6Mn0.signature';
  await act(async () => finish({ id: 17 }));
  expect(mockCreated).not.toHaveBeenCalled();
});it('keeps the form open when the creation response lacks a valid product id', async () => {
  jest.mocked(createProduct).mockResolvedValue({});
  const cancelled = jest.fn();
  const view = await renderApp(<AddDishScreen shopId={8} labels={labels} onCreated={mockCreated} onCancel={cancelled} />);
  await waitFor(() => expect(view.getByLabelText(/标题/)).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText(/标题/), 'Rice');
  await fireEvent.press(view.getByTestId('add-dish-form-submit'));
  await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByText('发生了一个我们没预料到的错误，已经记下')).toBeTruthy());
  expect(mockCreated).not.toHaveBeenCalled();
  expect(cancelled).not.toHaveBeenCalled();
});