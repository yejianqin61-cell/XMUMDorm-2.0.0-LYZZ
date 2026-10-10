import * as React from 'react';
import { Button } from '@/components/ui/Button';
import * as Linking from 'expo-linking';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { GuidesListScreen, GuideDetailScreen } from '@/features/guides/GuidesScreens';
import { listHandbookArticles, getHandbookArticleDetail, listHandbookComments, toggleHandbookLike, createHandbookComment } from '../../../shared/api/handbook';
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true }) }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ isSignedIn: true }) }));
jest.mock('../../../shared/api/handbook', () => ({ listHandbookArticles: jest.fn(), getHandbookArticleDetail: jest.fn(), listHandbookComments: jest.fn(), toggleHandbookLike: jest.fn(), createHandbookComment: jest.fn() }));
import type { ListScreenProps } from '@/components/ui/ListScreen';
let mockListProps: ListScreenProps<unknown>;
jest.mock('@/components/ui/ListScreen', () => {
 const actual = jest.requireActual('@/components/ui/ListScreen');
 const React = require('react');
 return {...actual, ListScreen: (props: ListScreenProps<unknown>) => {mockListProps = props; return React.createElement(actual.ListScreen, {...props, onEndReached: () => undefined});}};
});
afterEach(() => getQueryClient().clear());
import { getQueryClient } from '@/shared/queryClient';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';
const list = listHandbookArticles as jest.Mock;
const detail = getHandbookArticleDetail as jest.Mock;
const comments = listHandbookComments as jest.Mock;
const like = toggleHandbookLike as jest.Mock;
const createComment = createHandbookComment as jest.Mock;
beforeEach(() => { getQueryClient().clear(); secondaryTabStore.clear(); jest.clearAllMocks(); (Linking.openURL as jest.Mock).mockReset(); list.mockReset(); detail.mockReset(); comments.mockResolvedValue([]); like.mockReset(); createComment.mockReset(); });
it('列表从第一页读取，点击进入正确文章', async () => {
 list.mockResolvedValue({ list: [{ id: 7, title: '入学流程', summary: '带齐材料' }], hasMore: false });
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('入学流程')).toBeTruthy());
 expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
 await fireEvent.press(v.getByTestId('guide-row-7'));
 expect(mockPush).toHaveBeenCalledWith('/guides/7');
});
it('搜索使用同一文章真源并修剪关键词', async () => {
 list.mockResolvedValue({ list: [{ id: 7, title: '入学流程', summary: '带齐材料' }], hasMore: false });
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByTestId('guides-search-field')).toBeTruthy());
 await fireEvent.changeText(v.getByRole('search'), '  护照  ');
 await fireEvent(v.getByRole('search'), 'submitEditing');
 await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, q: '护照' }));
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
it('详情点赞使用文章真接口，不虚增服务端未返回的计数', async () => {
 detail.mockResolvedValue({ id: 7, title: '入学流程', contentType: 'markdown', content: '正文', likes_count: 3 });
 like.mockResolvedValue({ article_id: 7, liked: true });
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByTestId('guide-detail-like')).toBeTruthy());
 await fireEvent.press(v.getByTestId('guide-detail-like'));
 await waitFor(() => expect(like).toHaveBeenCalledWith(7));
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
 await waitFor(() => expect(v.getByText('无法打开这个链接')).toBeTruthy());
});
it('请求未完成时显示公共加载态', async () => {
 detail.mockReturnValue(new Promise(() => undefined));
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 expect(v.getByTestId('guide-detail-loading')).toBeTruthy();
 expect(v.queryByTestId('guide-markdown')).toBeNull();
});

const firstPage = { list: [{ id: 1, title: '第一页文章' }], hasMore: true };
const lastPage = { list: [{ id: 1, title: '第一页文章' }, { id: 2, title: '第二页文章' }], hasMore: false };
it('追加失败保留列表，重试同一页，去重后末页停止', async () => {
 list.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(lastPage);
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
 await act(async () => mockListProps.onEndReached());
 await waitFor(() => expect(v.getByTestId('guides-list-footer')).toBeTruthy());
 expect(v.getByText('第一页文章')).toBeTruthy();
 await fireEvent.press(v.getByText('重试'));
 await waitFor(() => expect(v.getByText('第二页文章')).toBeTruthy());
 expect(list.mock.calls.map(x => x[0].page)).toEqual([1, 2, 2]);
 expect(v.getAllByText('第一页文章')).toHaveLength(1);
 await act(async () => mockListProps.onEndReached());
 expect(list).toHaveBeenCalledTimes(3);
});
it('刷新回第一页，清除旧页，之后追加第二页', async () => {
 list.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(lastPage).mockResolvedValueOnce({list:[{id:3,title:'更新文章'}],hasMore:true}).mockResolvedValueOnce({list:[{id:4,title:'更新第二页'}],hasMore:false});
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
 await act(async () => mockListProps.onEndReached());
 await waitFor(() => expect(v.getByText('第二页文章')).toBeTruthy());
 await act(async () => mockListProps.onRefresh());
 await waitFor(() => expect(v.getByText('更新文章')).toBeTruthy());
 expect(v.queryByText('第二页文章')).toBeNull();
 await act(async () => mockListProps.onEndReached());
 await waitFor(() => expect(v.getByText('更新第二页')).toBeTruthy());
 expect(list.mock.calls.map(x => x[0].page)).toEqual([1,2,1,2]);
});
it('列表首次无网后可重试恢复', async () => {
 list.mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(firstPage);
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByTestId('guides-list-error')).toBeTruthy());
 await fireEvent.press(v.getByText('连上校园网后重试'));
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
});
it('卸载后返回恢复数据、页码和滚动位置', async () => {
 list.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(lastPage);
 function Host() {const [show,setShow] = React.useState(true);return <><Button label="切换列表" onPress={() => setShow(value => !value)} />{show ? <GuidesListScreen /> : null}</>;}
 const v = await renderApp(<Host />);
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
 await act(async () => mockListProps.onEndReached());
 await waitFor(() => expect(v.getByText('第二页文章')).toBeTruthy());
 await act(async () => mockListProps.onScrollOffset?.(280));
 await fireEvent.press(v.getByText('切换列表'));
 await fireEvent.press(v.getByText('切换列表'));
 expect(v.getByText('第二页文章')).toBeTruthy();
 expect(mockListProps.restoredScrollOffset).toBe(280);
 expect(list).toHaveBeenCalledTimes(2);
});

it('重复触底只发一个追加请求', async () => {
 let finish!: (value: typeof lastPage) => void;
 list.mockResolvedValueOnce(firstPage).mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
 await act(async () => {mockListProps.onEndReached(); mockListProps.onEndReached();});
 expect(list).toHaveBeenCalledTimes(2);
 await act(async () => finish(lastPage));
 await waitFor(() => expect(v.getByText('第二页文章')).toBeTruthy());
});
it('刷新成功后忽略先前追加请求的迟到响应', async () => {
 let finish!: (value: typeof lastPage) => void;
 list.mockResolvedValueOnce(firstPage).mockReturnValueOnce(new Promise(resolve => {finish = resolve;})).mockResolvedValueOnce({list:[{id:3,title:'刷新文章'}],hasMore:false});
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
 await act(async () => mockListProps.onEndReached());
 await act(async () => mockListProps.onRefresh());
 await waitFor(() => expect(v.getByText('刷新文章')).toBeTruthy());
 await act(async () => finish(lastPage));
 expect(v.queryByText('第二页文章')).toBeNull();
 expect(mockListProps.pagination.hasMore).toBe(false);
});
it('刷新失败保留旧内容并提供可见的重试', async () => {
 list.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce({list:[{id:3,title:'恢复内容'}],hasMore:false});
 const v = await renderApp(<GuidesListScreen />);
 await waitFor(() => expect(v.getByText('第一页文章')).toBeTruthy());
 await act(async () => mockListProps.onRefresh());
 expect(v.getByText('第一页文章')).toBeTruthy();
 await fireEvent.press(v.getByText('刷新失败，点此重试'));
 await waitFor(() => expect(v.getByText('恢复内容')).toBeTruthy());
 expect(v.queryByText('第一页文章')).toBeNull();
});

it('正文 https 链接由页面打开一次', async () => {
 (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
 detail.mockResolvedValue({id:7,title:'安全链接',contentType:'markdown',content:'[学校网站](https://example.com/welcome)'});
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByRole('link')).toBeTruthy());
 await fireEvent.press(v.getByRole('link'));
 expect(Linking.openURL).toHaveBeenCalledTimes(1);
 expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/welcome');
});
it('正文不允许的协议不打开，正文仍可读', async () => {
 detail.mockResolvedValue({id:7,title:'正文保留',contentType:'markdown',content:'[联系链接](mailto:test@example.com)\n\n继续阅读'});
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByRole('link')).toBeTruthy());
 await fireEvent.press(v.getByRole('link'));
 expect(Linking.openURL).not.toHaveBeenCalled();
 expect(v.getByText('继续阅读')).toBeTruthy();
 expect(v.getByText('无法打开这个链接')).toBeTruthy();
});
it('正文链接打开失败不丢文章，可以重试同一链接', async () => {
 (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('internal-secret')).mockResolvedValueOnce(undefined);
 detail.mockResolvedValue({id:7,title:'阅读中',contentType:'markdown',content:'[网站](https://example.com)\n\n阅读内容'});
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByRole('link')).toBeTruthy());
 await fireEvent.press(v.getByRole('link'));
 await waitFor(() => expect(v.getByText('链接未打开，请重试')).toBeTruthy());
 expect(v.queryByText('internal-secret')).toBeNull();
 expect(v.getByText('阅读内容')).toBeTruthy();
 await fireEvent.press(v.getByText('重试打开链接'));
 await waitFor(() => expect(v.queryByText('链接未打开，请重试')).toBeNull());
 expect((Linking.openURL as jest.Mock).mock.calls).toEqual([['https://example.com'],['https://example.com']]);
});
it('外链文章打开失败后保留打开入口，可以原地重试', async () => {
 (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce(undefined);
 detail.mockResolvedValue({id:7,title:'外链文章',contentType:'external_link',externalUrl:'https://example.com/welcome'});
 const v = await renderApp(<GuideDetailScreen articleId="7" />);
 await waitFor(() => expect(v.getByText('浏览器打开')).toBeTruthy());
 await fireEvent.press(v.getByText('浏览器打开'));
 await waitFor(() => expect(v.getByText('重试打开链接')).toBeTruthy());
 expect(v.getByText('浏览器打开')).toBeTruthy();
 await fireEvent.press(v.getByText('重试打开链接'));
 await waitFor(() => expect(v.queryByText('重试打开链接')).toBeNull());
 expect(mockBack).not.toHaveBeenCalled();
});
it('中英长文的首尾和目录均渲染', async () => {
 const content = '# 入学材料\n\n' + '长文段落。\n\n'.repeat(60) + '## 最后一步\n\nEnd of article';
 detail.mockResolvedValue({id:7,title:'长文',contentType:'markdown',content});
 const v = await renderApp(<GuideDetailScreen articleId="7" />, {locale:'en'});
 await waitFor(() => expect(v.getByText('End of article')).toBeTruthy());
 expect(v.getByText('Contents')).toBeTruthy();
 expect(v.getAllByText('入学材料').length).toBe(2);
 expect(v.getAllByText('最后一步').length).toBe(2);
});
