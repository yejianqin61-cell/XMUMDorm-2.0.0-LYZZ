import * as React from 'react';
import {Button} from '@/components/ui/Button';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {CampusListScreen, CampusDetailScreen} from '@/features/campus/CampusScreens';
import {getPostList, getPostDetail} from '../../../shared/api/posts';
const mockPush=jest.fn(), mockBack=jest.fn(), mockReplace=jest.fn(), mockSetParams=jest.fn();
jest.mock('expo-router',()=>({useRouter:()=>({setParams:mockSetParams,push:mockPush,back:mockBack,replace:mockReplace,canGoBack:()=>true})}));
jest.mock('../../../shared/api/posts',()=>({getPostList:jest.fn(),getPostDetail:jest.fn()}));
import {getConfessionWindow, getConfession} from '../../../shared/api/confessions';
import {getQueryClient} from '@/shared/queryClient';
import {secondaryTabStore} from '@/features/navigation/secondaryTabs';
import type {ListScreenProps} from '@/components/ui/ListScreen';
let mockListProps:ListScreenProps<unknown>;
jest.mock('@/components/ui/ListScreen',()=>{
 const actual=jest.requireActual('@/components/ui/ListScreen'), React=require('react');
 return {...actual,ListScreen:(props:ListScreenProps<unknown>)=>{mockListProps=props;return React.createElement(actual.ListScreen,{...props,onEndReached:()=>undefined});}};
});
jest.mock('../../../shared/api/confessions',()=>({getConfessionWindow:jest.fn(),getConfession:jest.fn()}));
const wall=getConfessionWindow as jest.Mock, wallDetail=getConfession as jest.Mock;
afterEach(()=>getQueryClient().clear());
const list=getPostList as jest.Mock, detail=getPostDetail as jest.Mock;
beforeEach(()=>{getQueryClient().clear();secondaryTabStore.clear();jest.clearAllMocks();list.mockReset();detail.mockReset();wall.mockReset();wallDetail.mockReset();});
it('树洞从第一页读取，点击进入帖子',async()=>{
 list.mockResolvedValue({list:[{id:7,title:'校内交流',content:'周末运动'}],hasMore:false});
 const v=await renderApp(<CampusListScreen/>);
 await waitFor(()=>expect(v.getByText('校内交流')).toBeTruthy());
 expect(list).toHaveBeenCalledWith({page:1,pageSize:10});
 await fireEvent.press(v.getByTestId('campus-row-7'));
 expect(mockPush).toHaveBeenCalledWith('/campus/7');
});
it('详情显示正文作者和图片，返回原页',async()=>{
 detail.mockResolvedValue({id:7,title:'校内交流',content:'一起打球',author:{nickname:'小林'},images:[{url:'https://example.com/photo.jpg'}]});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByText('一起打球')).toBeTruthy());
 expect(v.getByText('小林')).toBeTruthy();expect(v.getByTestId('campus-media-0', {includeHiddenElements:true})).toBeTruthy();
 expect(detail).toHaveBeenCalledWith(7);
 await fireEvent.press(v.getByTestId('campus-detail-back'));expect(mockBack).toHaveBeenCalled();
});
it('详情失败重试保留安全提示',async()=>{
 detail.mockRejectedValueOnce(new TypeError('secret-db')).mockResolvedValueOnce({id:7,content:'恢复正文'});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByTestId('campus-detail-error')).toBeTruthy());
 expect(v.queryByText('secret-db')).toBeNull();
 await fireEvent.press(v.getByText('连上校园网后重试'));
 await waitFor(()=>expect(v.getByText('恢复正文')).toBeTruthy());
});
it('无效 id 不请求详情',async()=>{
 const v=await renderApp(<CampusDetailScreen postId="abc"/>);
 await waitFor(()=>expect(v.getByTestId('campus-detail-error')).toBeTruthy());expect(detail).not.toHaveBeenCalled();
});
it('不显示错配 id 的正文',async()=>{
 detail.mockResolvedValue({id:8,content:'错配正文'});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByTestId('campus-detail-error')).toBeTruthy());expect(v.queryByText('错配正文')).toBeNull();
});
it('英文空列表显示业务空态',async()=>{
 list.mockResolvedValue({list:[],hasMore:false});
 const v=await renderApp(<CampusListScreen/>,{locale:'en'});
 await waitFor(()=>expect(v.getByText('No posts yet')).toBeTruthy());
});
it('未完成请求显示加载态',async()=>{
 detail.mockReturnValue(new Promise(()=>undefined));
 const v=await renderApp(<CampusDetailScreen postId="7"/>);expect(v.getByTestId('campus-detail-loading')).toBeTruthy();
});

it('隐藏帖不显示正文',async()=>{
 detail.mockResolvedValue({id:7,content:'隐藏正文',hidden:true});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByTestId('campus-detail-error')).toBeTruthy());expect(v.queryByText('隐藏正文')).toBeNull();
});
it('切换帖子后旧请求不能覆盖新正文',async()=>{
 let finish:(row:unknown)=>void=()=>undefined;
 detail.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({id:8,content:'新帖子'});
 function Harness(){const [id,setId]=React.useState("7");return <><Button label="切换帖子" onPress={()=>setId("8")}/><CampusDetailScreen postId={id}/></>;}
 const v=await renderApp(<Harness/>);
 await fireEvent.press(v.getByText("切换帖子"));
 await waitFor(()=>expect(v.getByText('新帖子')).toBeTruthy());
 await act(async()=>finish({id:7,content:'旧帖子'}));
 expect(v.getByText('新帖子')).toBeTruthy();expect(v.queryByText('旧帖子')).toBeNull();
});
it('列表请求失败可以重试第一页',async()=>{
 list.mockRejectedValueOnce(new TypeError('internal-secret')).mockResolvedValueOnce({list:[{id:7,content:'恢复列表'}],hasMore:false});
 const v=await renderApp(<CampusListScreen/>);
 await waitFor(()=>expect(v.getByTestId('campus-list-error')).toBeTruthy());
 expect(v.queryByText('internal-secret')).toBeNull();
 await fireEvent.press(v.getByText('连上校园网后重试'));
 await waitFor(()=>expect(v.getByText('恢复列表')).toBeTruthy());
 expect(list.mock.calls.map(call=>call[0].page)).toEqual([1,1]);
});

it('树洞分页失败重试同一页，去重并在末页停止',async()=>{
 list.mockResolvedValueOnce({list:[{id:7,content:'首篇'}],hasMore:true}).mockRejectedValueOnce(new TypeError('retry')).mockResolvedValueOnce({list:[{id:7,content:'首篇'},{id:8,content:'次篇'}],hasMore:false});
 const v=await renderApp(<CampusListScreen/>);await waitFor(()=>expect(v.getByText('首篇')).toBeTruthy());
 await act(async()=>mockListProps.onEndReached());await waitFor(()=>expect(mockListProps.pagination?.errorScope).toBe('append'));
 await act(async()=>mockListProps.onRetryAppend?.());await waitFor(()=>expect(v.getByText('次篇')).toBeTruthy());
 expect(list.mock.calls.map(call=>call[0].page)).toEqual([1,2,2]);expect(v.getAllByText('首篇')).toHaveLength(1);
 await act(async()=>mockListProps.onEndReached());expect(list).toHaveBeenCalledTimes(3);
});
it('切栏互斥并恢复树洞位置与已加载页',async()=>{
 list.mockResolvedValueOnce({list:[{id:7,content:'树洞首篇'}],hasMore:true}).mockResolvedValueOnce({list:[{id:8,content:'树洞次篇'}],hasMore:false});
 wall.mockResolvedValue({items:[{id:40,content:'墙正文'}],has_older:false,oldest_cursor:40});
 const v=await renderApp(<CampusListScreen/>);await waitFor(()=>expect(v.getByText('树洞首篇')).toBeTruthy());
 await act(async()=>mockListProps.onEndReached());await waitFor(()=>expect(v.getByText('树洞次篇')).toBeTruthy());
 await act(async()=>mockListProps.onScrollOffset?.(480));
 await fireEvent.press(v.getByText('万能墙'));await waitFor(()=>expect(v.getByText('墙正文')).toBeTruthy());
 expect(v.queryByText('树洞首篇')).toBeNull();
 await fireEvent.press(v.getByText('树洞'));await waitFor(()=>expect(v.getByText('树洞次篇')).toBeTruthy());
 expect(mockListProps.restoredScrollOffset).toBe(480);expect(list).toHaveBeenCalledTimes(2);
});
it('万能墙用服务端窗口游标且不展示身份',async()=>{
 wall.mockResolvedValueOnce({items:[{id:40,content:'墙首篇',author:{nickname:'泄漏作者'}}],has_older:true,oldest_cursor:40}).mockResolvedValueOnce({items:[{id:35,content:'墙次篇'}],has_older:false,oldest_cursor:35});
 list.mockResolvedValue({list:[],hasMore:false});
 const v=await renderApp(<CampusListScreen/>);await fireEvent.press(v.getByText('万能墙'));
 await waitFor(()=>expect(v.getByText('墙首篇')).toBeTruthy());expect(v.queryByText('泄漏作者')).toBeNull();
 await act(async()=>mockListProps.onEndReached());await waitFor(()=>expect(v.getByText('墙次篇')).toBeTruthy());
 expect(wall.mock.calls.map(call=>call[0])).toEqual([{cursor:null,direction:'older',limit:5},{cursor:40,direction:'older',limit:5}]);
 await fireEvent.press(v.getByTestId('campus-row-35'));expect(mockPush).toHaveBeenCalledWith('/campus/wall/35');
});
it('万能墙详情只投影匿名作者',async()=>{
 wallDetail.mockResolvedValue({id:40,content:'匿名正文',title:'身份标题',author:{nickname:'泄漏作者'},images:[{url:'https://example.com/leak'}]});
 const v=await renderApp(<CampusDetailScreen postId="40" kind="wall"/>);
 await waitFor(()=>expect(v.getByText('匿名正文')).toBeTruthy());expect(v.queryByText('泄漏作者')).toBeNull();expect(v.queryByText('身份标题')).toBeNull();expect(v.getByText('匿名')).toBeTruthy();expect(detail).not.toHaveBeenCalled();
});
it('慢树洞请求在切栏后不污染墙及其缓存',async()=>{
 let finish:(data:unknown)=>void=()=>undefined;list.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({list:[{id:9,content:'新树洞'}],hasMore:false});
 wall.mockResolvedValue({items:[{id:40,content:'墙正文'}],has_older:false,oldest_cursor:40});
 const v=await renderApp(<CampusListScreen/>);await fireEvent.press(v.getByText('万能墙'));await waitFor(()=>expect(v.getByText('墙正文')).toBeTruthy());
 await act(async()=>finish({list:[{id:7,content:'过期树洞'}],hasMore:false}));expect(v.queryByText('过期树洞')).toBeNull();
 await fireEvent.press(v.getByText('树洞'));await waitFor(()=>expect(v.getByText('新树洞')).toBeTruthy());expect(v.queryByText('过期树洞')).toBeNull();
});
it('刷新一栏归零位置且不清另一栏缓存',async()=>{
 list.mockResolvedValueOnce({list:[{id:7,content:'旧树洞'}],hasMore:true}).mockResolvedValueOnce({list:[{id:8,content:'新树洞'}],hasMore:false});
 wall.mockResolvedValue({items:[{id:40,content:'墙正文'}],has_older:false,oldest_cursor:40});
 const v=await renderApp(<CampusListScreen/>);await waitFor(()=>expect(v.getByText('旧树洞')).toBeTruthy());
 await fireEvent.press(v.getByText('万能墙'));await waitFor(()=>expect(v.getByText('墙正文')).toBeTruthy());await act(async()=>mockListProps.onScrollOffset?.(120));
 await fireEvent.press(v.getByText('树洞'));await waitFor(()=>expect(v.getByText('旧树洞')).toBeTruthy());await act(async()=>mockListProps.onRefresh());await waitFor(()=>expect(v.getByText('新树洞')).toBeTruthy());expect(v.queryByText('旧树洞')).toBeNull();
 expect(mockListProps.restoredScrollOffset).toBe(0);await fireEvent.press(v.getByText('万能墙'));await waitFor(()=>expect(v.getByText('墙正文')).toBeTruthy());expect(mockListProps.restoredScrollOffset).toBe(120);expect(wall).toHaveBeenCalledTimes(1);
});

it('从墙详情返回重新挂载时恢复墙位置与缓存',async()=>{
 wall.mockResolvedValue({items:[{id:40,content:'墙正文'}],has_older:false,oldest_cursor:40});
 function Harness(){const [reading,setReading]=React.useState(false);return <><Button label={reading?'回列表':'读详情'} onPress={()=>setReading(!reading)}/>{reading?<></>:<CampusListScreen initialTab="wall"/>}</>;}
 const v=await renderApp(<Harness/>);await waitFor(()=>expect(v.getByText('墙正文')).toBeTruthy());await act(async()=>mockListProps.onScrollOffset?.(240));
 await fireEvent.press(v.getByText('读详情'));await fireEvent.press(v.getByText('回列表'));await waitFor(()=>expect(v.getByText('墙正文')).toBeTruthy());
 expect(wall).toHaveBeenCalledTimes(1);expect(mockListProps.restoredScrollOffset).toBe(240);
});
it('刷新抢占追加，迟到旧页不覆盖刷新结果',async()=>{
 let finish:(data:unknown)=>void=()=>undefined;
 list.mockResolvedValueOnce({list:[{id:7,content:'旧首篇'}],hasMore:true}).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({list:[{id:9,content:'刷新结果'}],hasMore:false});
 const v=await renderApp(<CampusListScreen/>);await waitFor(()=>expect(v.getByText('旧首篇')).toBeTruthy());
 await act(async()=>mockListProps.onEndReached());await act(async()=>mockListProps.onEndReached());expect(list).toHaveBeenCalledTimes(2);
 await act(async()=>mockListProps.onRefresh());await waitFor(()=>expect(v.getByText('刷新结果')).toBeTruthy());
 await act(async()=>finish({list:[{id:8,content:'旧追加'}],hasMore:false}));expect(v.queryByText('旧追加')).toBeNull();expect(v.queryByText('旧首篇')).toBeNull();
});
it('墙窗口声称有下一页但缺游标时显示错误，不循环请求',async()=>{
 wall.mockResolvedValue({items:[{id:40,content:'错误窗口'}],has_older:true,oldest_cursor:null});
 const v=await renderApp(<CampusListScreen initialTab="wall"/>);await waitFor(()=>expect(v.getByTestId('campus-list-error')).toBeTruthy());
 expect(v.queryByText('错误窗口')).toBeNull();expect(wall).toHaveBeenCalledTimes(1);
});
