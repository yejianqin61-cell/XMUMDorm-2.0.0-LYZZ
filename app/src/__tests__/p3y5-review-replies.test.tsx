import * as React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { normalizeComments } from '@/features/square/canteen';
import { DishCommentThread } from '@/features/square/DishCommentThread';
import { ReviewScreen } from '@/features/square/ReviewScreen';
import { canteenRevision } from '@/features/square/canteenCache';
import { pickReviewImage } from '@/features/square/pickReviewImage';
import { postProductComment } from '../../../shared/api/canteen';
const mockTokenState = { value: 'header.eyJpZCI6MX0.signature' };
const mockNavigate = jest.fn();
const mockReply = jest.fn();
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: jest.fn() }), useRouter: () => ({ push: jest.fn(), replace: mockNavigate, back: jest.fn(), canGoBack: () => false }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/tokenStore', () => ({
  readTokenSync: () => mockTokenState.value,
  // 阶段 2 checkpoint 起 cacheIdentity 还需要账号作用域；测试用固定值即可
  tokenAccountId: () => 'review-test-owner',
}));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ status: 'signedIn', handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({}) }));
jest.mock('@/features/square/pickReviewImage', () => ({ pickReviewImage: jest.fn() }));
jest.mock('../../../shared/api/canteen', () => ({ postProductComment: jest.fn() }));
const raw = [
  { id: 1, parent_id: null, rating: '顶级', content: 'root', author: { nickname: null, avatar: null }, images: [{ url: '/meal.png' }] },
  { id: 2, parent_id: 1, rating: 'NPC', content: 'reply', author: { nickname: null, avatar: null }, images: [{ url: '/reply.png' }] },
  { id: 3, parent_id: 99, rating: '拉完了', content: 'orphan', author: { nickname: null, avatar: null } },
];
beforeEach(async () => { await clearNamespace(); mockTokenState.value = 'header.eyJpZCI6MX0.signature'; jest.clearAllMocks(); jest.mocked(postProductComment).mockResolvedValue({ id: 20 }); });
it('preserves parent ids and never turns invalid parent identifiers into roots', () => {
  expect(normalizeComments(raw).map(({ id, parentId }) => ({ id, parentId }))).toEqual([{ id: 1, parentId: null }, { id: 2, parentId: 1 }, { id: 3, parentId: 99 }]);
  expect(normalizeComments([{ id: 4, parent_id: -2, content: 'bad' }, { id: 5, parent_id: 1.5, content: 'bad' }])).toEqual([]);
});
it('shows anonymous review images and permits only a real root to be replied to', async () => {
  const view = await renderApp(<DishCommentThread comments={normalizeComments(raw)} onReply={mockReply} />);
  expect(view.getAllByText('匿名')).toHaveLength(3);
  expect(view.getByTestId('dish-comment-1-images-0').props.accessibilityLabel).toBe('root');
  expect(view.getByTestId('dish-comment-2-images-0').props.accessibilityLabel).toBe('reply');
  expect(within(view.getByTestId('dish-comment-2')).queryByLabelText('回复')).toBeNull();
  expect(within(view.getByTestId('dish-comment-3')).queryByLabelText('回复')).toBeNull();
  await fireEvent.press(view.getByLabelText('回复'));
  expect(mockReply).toHaveBeenCalledWith(1);
});
it('expands replies inside their root without granting another level', async () => {
  const comments = normalizeComments([...raw.slice(0, 2), { id: 4, parent_id: 1, content: 'second' }, { id: 5, parent_id: 1, content: 'third' }]);
  const view = await renderApp(<DishCommentThread comments={comments} onReply={mockReply} />);
  expect(view.queryByText('third')).toBeNull();
  await fireEvent.press(view.getByTestId('dish-comment-1-toggle'));
  expect(view.getByText('third')).toBeTruthy();
  expect(view.getAllByLabelText('回复')).toHaveLength(1);
});
it('submits an explicitly rated reply to its parent and returns only after success', async () => {
  const done = jest.fn();
  const view = await renderApp(<ReviewScreen productId={7} parentId={1} onSettled={done} />);
  await fireEvent.changeText(view.getByLabelText(/正文/), '  response  ');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  expect(postProductComment).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('review-rating-top'));
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(postProductComment).toHaveBeenCalledWith(7, { parent_id: 1, rating: '顶级', content: 'response', imageFiles: [] });
  expect(mockNavigate).not.toHaveBeenCalled();
});
it('blocks a malformed parent before a form can write', async () => {
  const view = await renderApp(<ReviewScreen productId={7} parentId={-1} />);
  expect(view.getByTestId('review-product-missing')).toBeTruthy();
  expect(view.queryByTestId('review-form-submit')).toBeNull();
});
it('keeps a rejected reply available for correction and does not report success', async () => {
  jest.mocked(postProductComment).mockRejectedValue({ kind: 'validation' });
  const done = jest.fn(); const before = canteenRevision();
  const view = await renderApp(<ReviewScreen productId={7} parentId={1} onSettled={done} />);
  await fireEvent.press(view.getByTestId('review-rating-top'));
  await fireEvent.changeText(view.getByLabelText(/正文/), 'Keep reply');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await waitFor(() => expect(view.getByTestId('review-form-summary')).toBeTruthy());
  expect(view.getByDisplayValue('Keep reply')).toBeTruthy();
  expect(done).not.toHaveBeenCalled(); expect(canteenRevision()).toBe(before);
});
it('discards an old-account success without navigation or public-cache invalidation', async () => {
  let finish!: (value: unknown) => void;
  jest.mocked(postProductComment).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const done = jest.fn(); const before = canteenRevision();
  const view = await renderApp(<ReviewScreen productId={7} parentId={1} onSettled={done} />);
  await fireEvent.press(view.getByTestId('review-rating-top'));
  await fireEvent.changeText(view.getByLabelText(/正文/), 'Old account');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await waitFor(() => expect(postProductComment).toHaveBeenCalledTimes(1));
  mockTokenState.value = 'header.eyJpZCI6Mn0.signature';
  await act(async () => finish({ id: 20 }));
  expect(done).not.toHaveBeenCalled(); expect(mockNavigate).not.toHaveBeenCalled(); expect(canteenRevision()).toBe(before);
});

it('uses the existing domain image picker by default in a reply form', async () => {
  jest.mocked(pickReviewImage).mockResolvedValue({ ok: true, image: { uri: 'file:///native-meal.png', mimeType: 'image/png', sizeBytes: 20 } });
  const view = await renderApp(<ReviewScreen productId={7} parentId={1} />);
  await fireEvent.press(view.getByTestId('review-images-add-pick'));
  expect(pickReviewImage).toHaveBeenCalledTimes(1);
  expect(view.getByTestId('review-images-remove-0')).toBeTruthy();
});
it('keeps an incomplete reply receipt in the form instead of reporting success', async () => {
  jest.mocked(postProductComment).mockResolvedValue({});
  const done = jest.fn(); const before = canteenRevision();
  const view = await renderApp(<ReviewScreen productId={7} parentId={1} onSettled={done} />);
  await fireEvent.press(view.getByTestId('review-rating-top'));
  await fireEvent.changeText(view.getByLabelText(/正文/), 'Keep reply');
  await fireEvent.press(view.getByTestId('review-form-submit'));
  await waitFor(() => expect(view.getByText('发生了一个我们没预料到的错误，已经记下')).toBeTruthy());
  expect(done).not.toHaveBeenCalled(); expect(canteenRevision()).toBe(before);
});
