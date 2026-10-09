import * as React from 'react';
import {Button} from '@/components/ui/Button';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {CampusListScreen, CampusDetailScreen} from '@/features/campus/CampusScreens';
import {getPostList, getPostDetail} from '../../../shared/api/posts';
const mockPush=jest.fn(), mockBack=jest.fn(), mockReplace=jest.fn(), mockSetParams=jest.fn();
jest.mock('expo-router',()=>({useRouter:()=>({setParams:mockSetParams,push:mockPush,back:mockBack,replace:mockReplace,canGoBack:()=>true})}));
jest.mock('../../../shared/api/posts',()=>({getPostList:jest.fn(),getPostDetail:jest.fn(),toggleLike:jest.fn(),getPostComments:jest.fn(),createComment:jest.fn()}));
import {getConfessionWindow, getConfession} from '../../../shared/api/confessions';
import {getQueryClient} from '@/shared/queryClient';
import {secondaryTabStore} from '@/features/navigation/secondaryTabs';
import type {ListScreenProps} from '@/components/ui/ListScreen';
let mockListProps:ListScreenProps<unknown>;
jest.mock('@/components/ui/ListScreen',()=>{
 const actual=jest.requireActual('@/components/ui/ListScreen'), React=require('react');
 return {...actual,ListScreen:(props:ListScreenProps<unknown>)=>{mockListProps=props;return React.createElement(actual.ListScreen,{...props,onEndReached:()=>undefined});}};
});
jest.mock('../../../shared/api/confessions',()=>({getConfessionWindow:jest.fn(),getConfession:jest.fn(),toggleConfessionLike:jest.fn(),getConfessionComments:jest.fn(),createConfessionComment:jest.fn()}));
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
 await waitFor(()=>expect(v.getByTestId('campus-detail-empty')).toBeTruthy());expect(detail).not.toHaveBeenCalled();
});
it('不显示错配 id 的正文',async()=>{
 detail.mockResolvedValue({id:8,content:'错配正文'});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByTestId('campus-detail-empty')).toBeTruthy());expect(v.queryByText('错配正文')).toBeNull();
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
 await waitFor(()=>expect(v.getByTestId('campus-detail-empty')).toBeTruthy());expect(v.queryByText('隐藏正文')).toBeNull();
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

import {toggleLike,getPostComments,createComment} from '../../../shared/api/posts';
import {toggleConfessionLike,getConfessionComments,createConfessionComment} from '../../../shared/api/confessions';
const mockAuthFailure=jest.fn(),mockSession={isSignedIn:true,handleAuthFailure:mockAuthFailure};
jest.mock('@/features/auth/session',()=>({useSession:()=>mockSession}));
beforeEach(()=>{
 mockSession.isSignedIn=true;mockAuthFailure.mockResolvedValue({kind:'permission'});
 for(const fn of [toggleLike,createComment,toggleConfessionLike,createConfessionComment]) (fn as jest.Mock).mockReset();
 (getPostComments as jest.Mock).mockReset().mockResolvedValue([]);
 (getConfessionComments as jest.Mock).mockReset().mockResolvedValue([]);
});
it('点赞按响应状态更新，缺少计数不虚构新计数',async()=>{
 detail.mockResolvedValue({id:7,content:'正文',user_liked:false,like_count:4});
 (toggleLike as jest.Mock).mockResolvedValue({post_id:7,liked:true});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByText('正文')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-detail-like'));
 await waitFor(()=>expect(v.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(true));
 expect(toggleLike).toHaveBeenCalledWith(7);expect(v.getByText('4')).toBeTruthy();
});
it('评论失败保留草稿，重试成功显示评论',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});
 (createComment as jest.Mock).mockRejectedValueOnce(new TypeError('secret')).mockResolvedValueOnce({id:90,content:'一起运动',author:{nickname:'我'}});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByLabelText('写评论')).toBeTruthy());
 await fireEvent.changeText(v.getByLabelText('写评论'),'一起运动');
 await fireEvent.press(v.getByTestId('campus-composer-send'));
 await waitFor(()=>expect(v.getByText('评论未发送，请重试')).toBeTruthy());
 expect(v.getByLabelText('写评论').props.value).toBe('一起运动');expect(v.getByText('正文')).toBeTruthy();
 await fireEvent.press(v.getByTestId('campus-composer-send'));
 await waitFor(()=>expect(v.getByText('一起运动')).toBeTruthy());
 expect(v.getByLabelText('写评论').props.value).toBe('');expect(createComment).toHaveBeenLastCalledWith(7,{content:'一起运动'});
});
it('游客操作不写入接口，显示登录入口',async()=>{
 mockSession.isSignedIn=false;detail.mockResolvedValue({id:7,content:'正文'});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);await waitFor(()=>expect(v.getByText('正文')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-detail-like'));expect(toggleLike).not.toHaveBeenCalled();
 await fireEvent.press(v.getByText('登录后参与'));expect(mockPush).toHaveBeenCalledWith('/login');
});
it('万能墙评论及回复隐藏服务端身份',async()=>{
 wallDetail.mockResolvedValue({id:40,content:'墙正文',liked:false,like_count:1});
 (getConfessionComments as jest.Mock).mockResolvedValue([{id:50,content:'匿名评论',author:{nickname:'秘密姓名'},replies:[{id:51,content:'匿名回复',author:{nickname:'回复姓名'}}]}]);
 (createConfessionComment as jest.Mock).mockResolvedValue({id:52,parent_id:50,content:'新回复',author:{nickname:'泄露姓名'}});
 (toggleConfessionLike as jest.Mock).mockResolvedValue({confession_id:40,liked:true,like_count:2});
 const v=await renderApp(<CampusDetailScreen postId="40" kind="wall"/>);
 await waitFor(()=>expect(v.getByText('匿名回复')).toBeTruthy());
 expect(v.queryByText('秘密姓名')).toBeNull();expect(v.queryByText('回复姓名')).toBeNull();
 await fireEvent.press(v.getByText('回复'));expect(v.getByText('正在回复某条评论')).toBeTruthy();
 await fireEvent.changeText(v.getByLabelText('写评论'),'新回复');await fireEvent.press(v.getByTestId('campus-composer-send'));
 await waitFor(()=>expect(v.getByText('新回复')).toBeTruthy());expect(v.queryByText('泄露姓名')).toBeNull();
 expect(createConfessionComment).toHaveBeenCalledWith(40,{content:'新回复',parent_id:50});
 await fireEvent.press(v.getByTestId('campus-detail-like'));
 await waitFor(()=>expect(v.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(true));
});
it('空白评论不能提交',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByLabelText('写评论')).toBeTruthy());await fireEvent.changeText(v.getByLabelText('写评论'),'   ');
 await fireEvent.press(v.getByTestId('campus-composer-send'));expect(createComment).not.toHaveBeenCalled();
});

it('连续点赞只发一次请求，失败不移除正文',async()=>{
 detail.mockResolvedValue({id:7,content:'正文',user_liked:false});let reject:(e:unknown)=>void=()=>undefined;
 (toggleLike as jest.Mock).mockReturnValueOnce(new Promise((_,fail)=>{reject=fail;})).mockResolvedValueOnce({post_id:7,liked:true});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);await waitFor(()=>expect(v.getByText('正文')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-detail-like'));await fireEvent.press(v.getByTestId('campus-detail-like'));expect(toggleLike).toHaveBeenCalledTimes(1);
 await act(async()=>reject(new TypeError('internal-secret')));expect(v.getByText('正文')).toBeTruthy();expect(v.queryByText('internal-secret')).toBeNull();
 expect(v.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(false);
 await fireEvent.press(v.getByTestId('campus-detail-like'));await waitFor(()=>expect(v.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(true));
});
it('评论读取失败独立重试，不影响正文',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});
 (getPostComments as jest.Mock).mockRejectedValueOnce(new TypeError('secret')).mockResolvedValueOnce([{id:80,content:'恢复评论',author:{nickname:'小林'}}]);
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByText('重试')).toBeTruthy());expect(v.getByText('正文')).toBeTruthy();
 await fireEvent.press(v.getByText('重试'));await waitFor(()=>expect(v.getByText('恢复评论')).toBeTruthy());
});
it('发送中编辑的新草稿不会被成功响应清空',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});let finish:(v:unknown)=>void=()=>undefined;
 (createComment as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const v=await renderApp(<CampusDetailScreen postId="7"/>);await waitFor(()=>expect(v.getByLabelText('写评论').props.editable).not.toBe(false));
 await fireEvent.changeText(v.getByLabelText('写评论'),'第一条');await fireEvent.press(v.getByTestId('campus-composer-send'));
 await fireEvent.changeText(v.getByLabelText('写评论'),'第二条');await fireEvent.press(v.getByTestId('campus-composer-send'));expect(createComment).toHaveBeenCalledTimes(1);
 await act(async()=>finish({id:90,content:'第一条'}));expect(v.getByText('第一条')).toBeTruthy();expect(v.getByLabelText('写评论').props.value).toBe('第二条');
});
it('墙评论超过500字不能提交',async()=>{
 wallDetail.mockResolvedValue({id:40,content:'墙正文'});const v=await renderApp(<CampusDetailScreen postId="40" kind="wall"/>);
 await waitFor(()=>expect(v.getByLabelText('写评论').props.editable).not.toBe(false));
 await fireEvent.changeText(v.getByLabelText('写评论'),'字'.repeat(501));await fireEvent.press(v.getByTestId('campus-composer-send'));expect(createConfessionComment).not.toHaveBeenCalled();
});
it('被禁言提示权限拒绝，不清除会话',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});(toggleLike as jest.Mock).mockRejectedValue({status:403,body:{muted:true}});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);await waitFor(()=>expect(v.getByText('正文')).toBeTruthy());await fireEvent.press(v.getByTestId('campus-detail-like'));
 await waitFor(()=>expect(v.getByText('当前账号不能进行此操作')).toBeTruthy());expect(mockAuthFailure).not.toHaveBeenCalled();
});
it('失效令牌交给现有会话处理并给出登录入口',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});(toggleLike as jest.Mock).mockRejectedValue({status:403,body:{}});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);await waitFor(()=>expect(v.getByText('正文')).toBeTruthy());await fireEvent.press(v.getByTestId('campus-detail-like'));
 await waitFor(()=>expect(v.getByText('登录后参与')).toBeTruthy());expect(mockAuthFailure).toHaveBeenCalled();
});
it('切换帖子后旧点赞请求不能覆盖新帖子',async()=>{
 detail.mockResolvedValueOnce({id:7,content:'旧正文'}).mockResolvedValueOnce({id:8,content:'新正文',user_liked:false});
 let finish:(v:unknown)=>void=()=>undefined;(toggleLike as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 function Harness(){const [id,setId]=React.useState('7');return <><Button label="切换帖子" onPress={()=>setId('8')}/><CampusDetailScreen postId={id}/></>;}
 const v=await renderApp(<Harness/>);await waitFor(()=>expect(v.getByText('旧正文')).toBeTruthy());await fireEvent.press(v.getByTestId('campus-detail-like'));
 await fireEvent.press(v.getByText('切换帖子'));await waitFor(()=>expect(v.getByText('新正文')).toBeTruthy());
 await act(async()=>finish({post_id:7,liked:true}));expect(v.getByTestId('campus-detail-like').props.accessibilityState.selected).toBe(false);
});

for(const locale of ['zh','en'] as const){
 it(`${locale}树洞未返回请求显示加载态`,async()=>{
  list.mockReturnValue(new Promise(()=>undefined));const v=await renderApp(<CampusListScreen/>,{locale});
  expect(v.getByTestId('campus-list-loading')).toBeTruthy();expect(v.queryByTestId('campus-list-empty')).toBeNull();
 });
 it(`${locale}树洞空列表是业务空态`,async()=>{
  list.mockResolvedValue({list:[],hasMore:false});const v=await renderApp(<CampusListScreen/>,{locale});
  await waitFor(()=>expect(v.getByText(locale==='zh'?'还没有帖子':'No posts yet')).toBeTruthy());
  expect(v.queryByTestId('campus-list-error')).toBeNull();
 });
 it(`${locale}树洞有数据显示正文与末页`,async()=>{
  list.mockResolvedValue({list:[{id:7,content:'阅读内容'}],hasMore:false});const v=await renderApp(<CampusListScreen/>,{locale});
  await waitFor(()=>expect(v.getByText('阅读内容')).toBeTruthy());expect(v.getByText(locale==='zh'?'没有更多帖子':'No more posts')).toBeTruthy();
 });
 for(const [failure,perceive,fix] of [
  [{kind:'offline'},locale==='zh'?'网络没连上':'No connection',locale==='zh'?'打开网络后重试':'Turn on network, then retry'],
  [new TypeError('secret-endpoint'),locale==='zh'?'服务连不上':'Service unreachable',locale==='zh'?'连上校园网后重试':'Join campus network, then retry'],
  [{name:'AbortError'},locale==='zh'?'等待超时':'Timed out',locale==='zh'?'稍后重试一次':'Retry once in a moment'],
 ] as const){
  it(`${locale}${perceive}给出恢复入口`,async()=>{
   list.mockRejectedValueOnce(failure).mockResolvedValueOnce({list:[{id:7,content:'已恢复'}],hasMore:false});
   const v=await renderApp(<CampusListScreen/>,{locale});await waitFor(()=>expect(v.getByText(perceive)).toBeTruthy());
   expect(v.queryByText('secret-endpoint')).toBeNull();await fireEvent.press(v.getByText(fix));
   await waitFor(()=>expect(v.getByText('已恢复')).toBeTruthy());expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10});
  });
 }
 it(`${locale}万能墙空态不变成技术错误`,async()=>{
  wall.mockResolvedValue({items:[],has_older:false,oldest_cursor:null});const v=await renderApp(<CampusListScreen initialTab="wall"/>,{locale});
  await waitFor(()=>expect(v.getByTestId('campus-list-empty')).toBeTruthy());expect(v.queryByTestId('campus-list-error')).toBeNull();
 });
 it(`${locale}万能墙有数据保持匿名`,async()=>{
  wall.mockResolvedValue({items:[{id:40,content:'匿名正文',author:{nickname:'不应显示'}}],has_older:false,oldest_cursor:40});
  const v=await renderApp(<CampusListScreen initialTab="wall"/>,{locale});await waitFor(()=>expect(v.getByText('匿名正文')).toBeTruthy());
  expect(v.getByText(locale==='zh'?'匿名':'Anonymous')).toBeTruthy();expect(v.queryByText('不应显示')).toBeNull();
 });
}

it('树洞点赞成功后重读服务端计数，重读失败不重复点赞',async()=>{
 detail.mockResolvedValueOnce({id:7,content:'正文',user_liked:false,like_count:4})
 .mockResolvedValueOnce({id:7,content:'正文',user_liked:true,like_count:5}).mockRejectedValueOnce(new TypeError('offline'));
 (toggleLike as jest.Mock).mockResolvedValueOnce({post_id:7,liked:true}).mockResolvedValueOnce({post_id:7,liked:false});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByText('正文')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-detail-like'));
 await waitFor(()=>expect(v.getByText('5')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-detail-like'));
 await waitFor(()=>expect(detail).toHaveBeenCalledTimes(3));
 expect(toggleLike).toHaveBeenCalledTimes(2);expect(v.queryByText('5')).toBeNull();
});
it('实名树洞回复显示被回复者昵称',async()=>{
 detail.mockResolvedValue({id:7,content:'正文'});
 (getPostComments as jest.Mock).mockResolvedValue([{id:50,content:'原评论',author:{nickname:'小林'}}]);
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByText('原评论')).toBeTruthy());
 await fireEvent.press(v.getByText('回复'));
 expect(v.getByText('正在回复 @小林')).toBeTruthy();
});
it('已删除帖子显示内容不可用并返回列表',async()=>{
 detail.mockRejectedValue({status:404});
 const v=await renderApp(<CampusDetailScreen postId="7"/>);
 await waitFor(()=>expect(v.getByText('内容不存在或已删除')).toBeTruthy());
 await fireEvent.press(v.getByText('返回列表'));expect(mockBack).toHaveBeenCalled();
});

it('普通帖子发布清缓存后已挂载树洞重新读取',async()=>{
 list.mockResolvedValueOnce({list:[{id:7,title:'Old',content:'Old'}],hasMore:false}).mockResolvedValue({list:[{id:8,title:'New',content:'New'}],hasMore:false});
 const v=await renderApp(<CampusListScreen/>);await waitFor(()=>expect(v.getByTestId('campus-row-7')).toBeTruthy());
 await act(async()=>getQueryClient().removeQueries({queryKey:['posts','infinite']}));
 await waitFor(()=>expect(v.getByTestId('campus-row-8')).toBeTruthy());expect(v.queryByTestId('campus-row-7')).toBeNull();
});

it('发布后的详情返回树洞列表，普通阅读仍走原返回栈',async()=>{
 detail.mockResolvedValue({id:7,title:'新帖',content:'新内容'});
 const v=await renderApp(<CampusDetailScreen postId="7" published/>);
 await waitFor(()=>expect(v.getByText('新内容')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-detail-back'));expect(mockReplace).toHaveBeenCalledWith('/(tabs)/campus');expect(mockBack).not.toHaveBeenCalled();
});

it('树洞列表卸载时解绑查询缓存订阅',async()=>{
 const unsubscribe=jest.fn();
 const subscribe=jest.spyOn(getQueryClient().getQueryCache(),'subscribe').mockReturnValue(unsubscribe);
 try{
  list.mockResolvedValue({list:[{id:7,title:'Old',content:'Old'}],hasMore:false});
  const v=await renderApp(<CampusListScreen/>);
  await waitFor(()=>expect(v.getByTestId('campus-row-7')).toBeTruthy());
  await act(async()=>{v.unmount();});
  expect(unsubscribe).toHaveBeenCalledTimes(1);
 }finally{subscribe.mockRestore();}
});
