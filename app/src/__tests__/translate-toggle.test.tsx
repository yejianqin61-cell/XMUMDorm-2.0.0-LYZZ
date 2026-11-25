import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { TranslateToggle, resetTranslateConfigForTests } from '@/features/translate/TranslateToggle';
import { DishCommentThread } from '@/features/square/DishCommentThread';
import { normalizeComments } from '@/features/square/canteen';
import { getTranslateConfig, translateContent } from '../../../shared/api/translate';

jest.mock('../../../shared/api/translate', () => ({ getTranslateConfig: jest.fn(), translateContent: jest.fn() }));

const english = 'Anyone selling a rice cooker near D6? I can pick it up tonight.';

beforeEach(() => {
  jest.clearAllMocks();
  resetTranslateConfigForTests();
  jest.mocked(getTranslateConfig).mockResolvedValue({ enabled: true });
  jest.mocked(translateContent).mockResolvedValue({ text: '有人在 D6 附近卖电饭煲吗？', target: 'zh', cached: false });
});

it('translates English content on press in the Chinese UI and can collapse it', async () => {
  const view = await renderApp(<TranslateToggle kind="comment" id={42} text={english} isSignedIn />);
  const button = await view.findByLabelText('翻译');
  expect(translateContent).not.toHaveBeenCalled();
  await fireEvent.press(button);
  expect(translateContent).toHaveBeenCalledWith({ kind: 'comment', id: 42, target: 'zh' });
  expect(await view.findByText('有人在 D6 附近卖电饭煲吗？')).toBeTruthy();
  expect(view.getByText('AI 翻译')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('收起译文'));
  expect(view.queryByText('有人在 D6 附近卖电饭煲吗？')).toBeNull();
  await fireEvent.press(view.getByLabelText('翻译'));
  expect(translateContent).toHaveBeenCalledTimes(1);
});

it('offers Translate for Chinese content in the English UI', async () => {
  const view = await renderApp(<TranslateToggle kind="post" id={7} text="今天 B1 食堂的鸡饭很好吃" isSignedIn />, { locale: 'en' });
  await fireEvent.press(await view.findByLabelText('Translate'));
  expect(translateContent).toHaveBeenCalledWith({ kind: 'post', id: 7, target: 'en' });
});

it('renders nothing for same-language content', async () => {
  const view = await renderApp(<TranslateToggle kind="post" id={7} text="今天 B1 食堂的鸡饭很好吃" isSignedIn />);
  await waitFor(() => expect(view.queryByLabelText('翻译')).toBeNull());
  expect(getTranslateConfig).not.toHaveBeenCalled();
});

it('renders nothing when signed out', async () => {
  const view = await renderApp(<TranslateToggle kind="post" id={7} text={english} isSignedIn={false} />);
  await waitFor(() => expect(view.queryByLabelText('翻译')).toBeNull());
  expect(getTranslateConfig).not.toHaveBeenCalled();
});

it('renders nothing when the server has no translation service', async () => {
  jest.mocked(getTranslateConfig).mockResolvedValue({ enabled: false });
  const view = await renderApp(<TranslateToggle kind="post" id={7} text={english} isSignedIn />);
  await waitFor(() => expect(getTranslateConfig).toHaveBeenCalled());
  expect(view.queryByLabelText('翻译')).toBeNull();
});

it('shows a failure message when the request fails', async () => {
  jest.mocked(translateContent).mockRejectedValue(new Error('502'));
  const view = await renderApp(<TranslateToggle kind="review" id={3} text={english} isSignedIn />);
  await fireEvent.press(await view.findByLabelText('翻译'));
  expect(await view.findByTestId('translate-toggle-failed')).toBeTruthy();
});

it('dish reviews offer translation by review id only when signed in', async () => {
  const comments = normalizeComments([{ id: 11, parent_id: null, rating: '顶级', content: english, author: { nickname: null, avatar: null } }]);
  const view = await renderApp(<DishCommentThread comments={comments} isSignedIn />);
  await fireEvent.press(await view.findByTestId('dish-comment-11-translate-button'));
  expect(translateContent).toHaveBeenCalledWith({ kind: 'review', id: 11, target: 'zh' });
});
