import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { GuidesListScreen, GuideDetailScreen } from '@/features/guides/GuidesScreens';
import { listHandbookArticles, getHandbookArticleDetail } from '../../../shared/api/handbook';
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true }) }));
jest.mock('../../../shared/api/handbook', () => ({ listHandbookArticles: jest.fn(), getHandbookArticleDetail: jest.fn() }));
const list = listHandbookArticles as jest.Mock;
const detail = getHandbookArticleDetail as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); list.mockReset(); detail.mockReset(); });
it('列表从第一页读取，点击进入正确文章', async () => {
 list.mockResolvedValue({ list: [{ id: 7, title: '入学流程', summary: '带齐材料' }], hasMore: false });
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('入学流程')).toBeTruthy());
 expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
 await fireEvent.press(v.getByTestId('guide-row-7'));
 expect(mockPush).toHaveBeenCalledWith('/guides/7');
});
it('详情取指定文章并显示 Markdown，返回原页面', async () => {
 detail.mockResolvedValue({ id: 7, title: '入学流程', contentType: 'markdown', content: '# 材料清单\n带上护照' });
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByTestId('guide-markdown')).toBeTruthy());
 expect(v.getByText('带上护照')).toBeTruthy();
 expect(detail).toHaveBeenCalledWith(7);
 await fireEvent.press(v.getByTestId('guide-detail-back'));
 expect(mockBack).toHaveBeenCalled();
});
it('详情失败可重试，不显示内部错误', async () => {
 detail.mockRejectedValueOnce(new Error('database-secret')).mockResolvedValueOnce({ id: 7, title: '恢复文章', contentType: 'markdown', content: '重试正文' });
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByTestId('guide-detail-error')).toBeTruthy());
 expect(v.queryByText('database-secret')).toBeNull();
 await fireEvent.press(v.getByTestId('guide-detail-error-action'));
 await waitFor(() => expect(v.getByText('重试正文')).toBeTruthy());
});
it('非法详情 id 不请求', async () => {
 const v = await renderApp(<GuideDetailScreen articleId="abc" />);
 await waitFor(() => expect(v.getByTestId('guide-detail-error')).toBeTruthy());
 expect(detail).not.toHaveBeenCalled();
});
it('空列表提供重试', async () => {
 list.mockResolvedValue({ list: [], hasMore: false });
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('还没有指南')).toBeTruthy());
});
it('英文详情正文与词条可用', async () => {
 detail.mockResolvedValue({ id: 8, title: 'Welcome', contentType: 'markdown', content: 'Bring your passport' });
 const v = await renderApp(<GuideDetailScreen articleId="8" />, { locale: 'en' });
 await waitFor(() => expect(v.getByText('Bring your passport')).toBeTruthy());
 expect(v.getByLabelText('Back')).toBeTruthy();
});
