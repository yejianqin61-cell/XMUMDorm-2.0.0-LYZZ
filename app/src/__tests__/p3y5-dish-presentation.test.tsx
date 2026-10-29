import * as React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { DishDetail } from '@/features/square/DishDetail';
import { ReviewScreen } from '@/features/square/ReviewScreen';
import { DishActions } from '@/features/square/DishActions';
import { getProduct, getProductFavoriteStatus } from '../../../shared/api/canteen';
jest.mock('lucide-react-native/icons/heart', () => { const React = jest.requireActual('react'); const { View } = jest.requireActual('react-native'); return function MockHeart(props: object) { return React.createElement(View, { ...props, testID: 'favorite-heart-glyph' }); }; });
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: '7' }), useNavigation: () => ({ dispatch: jest.fn() }), useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ status: 'signedIn', handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('../../../shared/api/canteen', () => ({ getProduct: jest.fn(), getProductCommentsRaw: jest.fn(), getProductFavoriteStatus: jest.fn(), addFavoriteProduct: jest.fn(), removeFavoriteProduct: jest.fn(), postProductComment: jest.fn() }));
beforeEach(async () => { await clearNamespace(); jest.clearAllMocks(); jest.mocked(getProductFavoriteStatus).mockResolvedValue({ favorited: false }); jest.mocked(getProduct).mockResolvedValue({ id: 7, name: 'Rice', images: [], comments: { list: [], page: 1, pageSize: 10, hasMore: false } }); });
it('offers a labelled heart favorite action with a visible state', async () => {
  const view = await renderApp(<DishActions productId={7} />);
  await waitFor(() => expect(view.getByTestId('dish-favorite').props.accessibilityState.disabled).toBe(false));
  expect(view.getByTestId('favorite-heart-glyph').props.fill).toBe('none');
  expect(view.getByTestId('dish-favorite').props.accessibilityLabel).toBe('收藏');
});
it('renders the actions bar in the screen footer slot, outside the scrolling content', async () => {
  const view = await renderApp(<DishDetail />);
  await waitFor(() => expect(view.getByText('Rice')).toBeTruthy());
  expect(within(view.getByTestId('screen-footer')).getByTestId('dish-actions-footer')).toBeTruthy();
  expect(within(view.getByTestId('dish-scroll')).queryByTestId('dish-actions-footer')).toBeNull();
  expect(view.queryByTestId('dish-actions-overlay')).toBeNull();
  const scrollStyle = StyleSheet.flatten(view.getByTestId('dish-scroll').props.contentContainerStyle);
  expect(scrollStyle.paddingBottom).toBeUndefined();
  expect(scrollStyle.padding).toBeTruthy();
  expect(view.getByTestId('dish-images-placeholder')).toBeTruthy();
});
it('keeps dish images readable when one image fails to load', async () => {
  jest.mocked(getProduct).mockResolvedValue({ id: 7, name: 'Rice', images: ['/good.png', '/bad.png'],
    comments: { list: [], page: 1, pageSize: 10, hasMore: false } });
  const view = await renderApp(<DishDetail />);
  await waitFor(() => expect(view.getByTestId('dish-images-1-image')).toBeTruthy());
  await fireEvent(view.getByTestId('dish-images-1-image'), 'error', { nativeEvent: { error: 'unavailable' } });
  expect(view.getByTestId('dish-images-1-placeholder')).toBeTruthy();
  expect(view.getByTestId('dish-images-0-image')).toBeTruthy();
  expect(view.getByTestId('dish-review')).toBeTruthy();
});
it('uses one image entry until the review limit and enables it again after removal', async () => {
  const pick = jest.fn().mockResolvedValue({ ok: true, image: { uri: 'file:///meal.png', mimeType: 'image/png', sizeBytes: 10 } });
  const view = await renderApp(<ReviewScreen productId={7} pickImage={pick} />);
  expect(view.getAllByLabelText('添加图片')).toHaveLength(1);
  for (const index of [0, 1, 2]) { await fireEvent.press(view.getByTestId('review-images-add-pick')); expect(view.getByTestId(`review-images-remove-${index}`)).toBeTruthy(); }
  expect(view.queryByTestId('review-images-add-pick')).toBeNull();
  await fireEvent.press(view.getByTestId('review-images-remove-1'));
  expect(view.getByTestId('review-images-add-pick')).toBeTruthy();
  expect(pick).toHaveBeenCalledTimes(3);
});

it('opens a root reply as a local form and returns to the same dish on cancel', async () => {
  jest.mocked(getProduct).mockResolvedValue({ id: 7, name: 'Rice', images: [], comments: { list: [{ id: 1, parent_id: null, content: 'Root review', rating: '顶级', author: { nickname: null, avatar: null } }], page: 1, pageSize: 10, hasMore: false } });
  const view = await renderApp(<DishDetail />);
  await waitFor(() => expect(view.getByLabelText('回复')).toBeTruthy());
  await fireEvent.press(view.getByLabelText('回复'));
  expect(view.getByTestId('review-form')).toBeTruthy();
  expect(view.queryByTestId('screen-dish')).toBeNull();
  await fireEvent.press(view.getByTestId('review-form-cancel'));
  expect(view.getByTestId('screen-dish')).toBeTruthy();
  expect(view.queryByTestId('review-form')).toBeNull();
});
