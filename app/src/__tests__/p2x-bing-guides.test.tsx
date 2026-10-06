import * as React from 'react';
import * as Linking from 'expo-linking';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { GuidesListScreen, GuideDetailScreen } from '@/features/guides/GuidesScreens';
import { listHandbookArticles, getHandbookArticleDetail } from '../../../shared/api/handbook';
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
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
 detail.mockRejectedValueOnce(new TypeError('database-secret')).mockResolvedValueOnce({ id: 7, title: '恢复文章', contentType: 'markdown', content: '重试正文' });
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByTestId('guide-detail-error')).toBeTruthy());
 expect(v.queryByText('database-secret')).toBeNull();
 await fireEvent.press(v.getByText('连上校园网后重试'));
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

it('外链文章通过系统打开 http/https', async () => {
 (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
 detail.mockResolvedValue({ id: 9, title: '学校网站', contentType: 'external_link', externalUrl: 'https://example.com/welcome' });
 const v = await renderApp(<GuideDetailScreen articleId="9" />);
 await waitFor(() => expect(v.getByText('浏览器打开')).toBeTruthy());
 await fireEvent.press(v.getByText('浏览器打开'));
 expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/welcome');
});
it('危险外链不交给系统打开', async () => {
 detail.mockResolvedValue({ id: 9, title: '链接', contentType: 'external_link', externalUrl: 'javascript:alert(1)' });
 const v = await renderApp(<GuideDetailScreen articleId="9" />);
 await waitFor(() => expect(v.getByText('浏览器打开')).toBeTruthy());
 await fireEvent.press(v.getByText('浏览器打开'));
 expect(Linking.openURL).not.toHaveBeenCalled();
 await waitFor(() => expect(v.getByTestId('guide-detail-error')).toBeTruthy());
});
it('请求未完成时显示公共加载态', async () => {
 detail.mockReturnValue(new Promise(() => undefined));
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 expect(v.getByTestId('guide-detail-loading')).toBeTruthy();
 expect(v.queryByTestId('guide-markdown')).toBeNull();
});
