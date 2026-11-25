import * as React from 'react';
import * as Linking from 'expo-linking';
import {act,fireEvent,waitFor,within} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {ErrandListScreen,ErrandDetailScreen} from '@/features/errand/ErrandScreens';
import {listErrands,getErrandDetail,takeErrand,doneErrand,deleteErrand} from '../../../shared/api/errands';
import {getMe} from '../../../shared/api/users';
import {getQueryClient} from '@/shared/queryClient';
import type {ListScreenProps} from '@/components/ui/ListScreen';
const mockReplace=jest.fn();const mockPush=jest.fn();const mockSession={isSignedIn:true,handleAuthFailure:jest.fn()};let mockListProps:ListScreenProps<unknown>;
jest.mock('expo-linking',()=>({openURL:jest.fn()}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn(),replace:mockReplace,canGoBack:()=>false})}));
jest.mock('@/features/auth/session',()=>({useSession:()=>mockSession}));
jest.mock('../../../shared/api/users',()=>({getMe:jest.fn()}));
jest.mock('../../../shared/api/errands',()=>({listErrands:jest.fn(),getErrandDetail:jest.fn(),takeErrand:jest.fn(),doneErrand:jest.fn(),deleteErrand:jest.fn()}));
jest.mock('@/components/ui/ListScreen',()=>{const actual=jest.requireActual('@/components/ui/ListScreen'),React=require('react');return {...actual,ListScreen:(p:ListScreenProps<unknown>)=>{mockListProps=p;return React.createElement(actual.ListScreen,{...p,onEndReached:()=>undefined});}};});
const list=listErrands as jest.Mock,detail=getErrandDetail as jest.Mock,take=takeErrand as jest.Mock,done=doneErrand as jest.Mock,me=getMe as jest.Mock;
const row={id:2,title:'Pickup',reward:5,type:'delivery',status:'open',owner:{id:3,username:'Owner'}};
const full={...row,description:'Pick up a package',contactInfo:'test contact',taker:null};
beforeEach(()=>{getQueryClient().clear();jest.clearAllMocks();list.mockReset();detail.mockReset();me.mockReset();take.mockReset();done.mockReset();mockSession.isSignedIn=true;});
afterEach(()=>getQueryClient().clear());
it('跑腿列表分页按返回页大小且列表没有联系字段',async()=>{
 list.mockResolvedValueOnce({list:[row],page:1,pageSize:5,total:6}).mockResolvedValue({list:[{...row,id:4}],page:2,pageSize:5,total:6});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 // 2026-10-18 所有者裁决：两行筛选随内容滚走（放进 listHeader）
 expect(mockListProps.listHeader).toBeTruthy();
 const rendered=mockListProps.renderItem(row,0) as React.ReactElement<{style?:unknown}>;
 expect(rendered.props.style).toEqual(expect.objectContaining({marginBottom:12}));
 expect(v.getByTestId('errand-row-2').props.style[0]).toEqual(expect.arrayContaining([expect.objectContaining({alignSelf:'stretch'})]));
 expect(v.queryByText('test contact')).toBeNull();await act(async()=>mockListProps.onEndReached?.());
 await waitFor(()=>expect(v.getByTestId('errand-row-4')).toBeTruthy());expect(mockListProps.pagination.hasMore).toBe(false);
 await fireEvent.press(v.getByTestId('errand-row-2'));expect(mockPush).toHaveBeenCalledWith('/errand/2');
});
it('任务卡显示类型地点截止时间和报酬',async()=>{
 const task={...row,type:'urgent',location:'Library',deadline:'2026-10-16T12:00:00.000Z'};
 list.mockResolvedValue({list:[task],page:1,pageSize:5,total:1});const v=await renderApp(<ErrandListScreen/>);
 await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 const card=v.getByTestId('errand-row-2');
 const cardView=within(card);
 expect(cardView.getByText('紧急')).toBeTruthy();
 expect(cardView.getByText('Library · 2026/10/16 20:00')).toBeTruthy();
 expect(cardView.getByText('RM 5.00')).toBeTruthy();
 expect(card.props.accessibilityLabel).toContain('2026/10/16 20:00');
});
it('跑腿类型和状态分组筛选并可独立清除',async()=>{
 list.mockResolvedValue({list:[row],page:1,pageSize:5,total:1});const v=await renderApp(<ErrandListScreen/>);
 await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 await fireEvent.press(v.getByTestId('errand-type-delivery'));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10,type:'delivery'}));
 await fireEvent.press(v.getByTestId('errand-status-open'));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10,type:'delivery',status:'open'}));
 // 2026-10-18 所有者裁决：分区文字（Task type / Task status）去掉，筛选行随内容滚走
 expect(v.getByTestId('errand-type')).toBeTruthy();expect(v.getByTestId('errand-status')).toBeTruthy();
 expect(v.queryByText('任务类型')).toBeNull();
 expect(v.getByTestId('errand-type-delivery').props.accessibilityState.selected).toBe(true);
 await fireEvent.press(v.getByTestId('errand-type-clear'));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10,status:'open'}));
 expect(v.getByTestId('errand-status-open').props.accessibilityState.selected).toBe(true);
});
it('刷新失败保留跑腿行并可从提示重试',async()=>{
 list.mockResolvedValueOnce({list:[row],page:1,pageSize:5,total:1}).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({list:[{...row,id:4}],page:1,pageSize:5,total:1});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 await act(async()=>mockListProps.onRefresh?.());
 await waitFor(()=>expect(v.getByTestId('errand-refresh-retry')).toBeTruthy());
 expect(v.getByTestId('errand-row-2')).toBeTruthy();
 await fireEvent.press(v.getByTestId('errand-refresh-retry'));
 await waitFor(()=>expect(v.getByTestId('errand-row-4')).toBeTruthy());
});
it('跑腿列表返回时恢复滚动位置与缓存行',async()=>{
 getQueryClient().setQueryData(['bing-errand','list',{}],{rows:[row],page:1,hasMore:true,scrollOffset:360});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 expect(mockListProps.restoredScrollOffset).toBe(360);expect(list).not.toHaveBeenCalled();
});
it('列表泄漏联系方式作为错误，不展示内容',async()=>{
 list.mockResolvedValue({list:[{...row,contactInfo:'test contact'}],page:1,pageSize:5,total:1});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-list-error')).toBeTruthy());expect(v.queryByText('test contact')).toBeNull();expect(v.queryByTestId('errand-row-2')).toBeNull();
});
it('接单前后端不给联系方式：显示提示、不给拨号复制',async()=>{
 detail.mockResolvedValue({...full,contactInfo:'',contactHidden:true});me.mockResolvedValue({id:9,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-contact-hidden')).toBeTruthy());
 expect(v.getByText('接单后可见')).toBeTruthy();expect(v.queryByTestId('errand-dial')).toBeNull();
});
it('非所有者可认领待接单任务，但不能标记完成',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:9,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByText('test contact')).toBeTruthy());
 await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());expect(v.getByText('接单')).toBeTruthy();expect(v.queryByTestId('errand-done')).toBeNull();
});
it('任务详情首屏显示报酬地点截止时间和状态摘要',async()=>{
 const task={...full,location:'Library',deadline:'2026-10-16T12:00:00.000Z'};detail.mockResolvedValue(task);me.mockResolvedValue({id:9,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByText('test contact')).toBeTruthy());
 expect(v.getByTestId('errand-detail-summary')).toBeTruthy();expect(v.getByText('RM 5.00')).toBeTruthy();expect(v.getByText('Library')).toBeTruthy();expect(v.getByText('2026/10/16 20:00')).toBeTruthy();
});
it('任务详情将联系方式和状态动作分区',async()=>{
 detail.mockResolvedValue({...full,contactInfo:'+60 12-345 6789'});me.mockResolvedValue({id:3,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());
 expect(v.getByTestId('errand-contact-actions')).toBeTruthy();expect(v.getByTestId('errand-status-actions')).toBeTruthy();
});
it('发布者确认接单后重读详情，完成操作也二次确认',async()=>{
 detail.mockResolvedValueOnce(full).mockResolvedValueOnce({...full,status:'taken'}).mockResolvedValue({...full,status:'done'});me.mockResolvedValue({id:3,role:'student'});take.mockResolvedValue(undefined);done.mockResolvedValue(undefined);
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());
 await fireEvent.press(v.getByTestId('errand-take'));expect(take).not.toHaveBeenCalled();await fireEvent.press(v.getByText('确认'));
 await waitFor(()=>expect(v.getByText('取消接单')).toBeTruthy());expect(take).toHaveBeenCalledWith(2);
 await fireEvent.press(v.getByTestId('errand-done'));await fireEvent.press(v.getByText('确认'));
 await waitFor(()=>expect(v.getByText('撤销完成')).toBeTruthy());expect(done).toHaveBeenCalledWith(2);expect(v.queryByTestId('errand-take')).toBeNull();
});
it('游客不读取我的身份也没有写按钮，英文404可返回',async()=>{
 mockSession.isSignedIn=false;detail.mockRejectedValue({status:404});const v=await renderApp(<ErrandDetailScreen errandId="999"/>,{locale:'en'});
 await waitFor(()=>expect(v.getByText('Task is unavailable')).toBeTruthy());expect(me).not.toHaveBeenCalled();expect(take).not.toHaveBeenCalled();
});
it('接单成功但重读失败时要求刷新，不允许再次切换',async()=>{
 detail.mockResolvedValueOnce(full).mockRejectedValueOnce(new TypeError('private')).mockResolvedValue({...full,status:'taken'});me.mockResolvedValue({id:3,role:'student'});take.mockResolvedValue(undefined);
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());
 await fireEvent.press(v.getByTestId('errand-take'));await fireEvent.press(v.getByText('确认'));
 await waitFor(()=>expect(v.getByText('操作未确认，请刷新后重试')).toBeTruthy());expect(v.getByTestId('errand-detail-refresh')).toBeTruthy();await fireEvent.press(v.getByTestId('errand-take'));expect(take).toHaveBeenCalledTimes(1);expect(v.queryByText('private')).toBeNull();
 await fireEvent.press(v.getByTestId('errand-detail-refresh'));await waitFor(()=>expect(v.getByText('取消接单')).toBeTruthy());
});
it('管理员能切换接单但不能替非本人非接单者标记完成',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:9,role:'admin'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());expect(v.queryByTestId('errand-done')).toBeNull();
});
it('服务端业务403权限拒绝不清除登录会话',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:3,role:'student'});take.mockRejectedValue({status:403,body:{message:'仅发布者或管理员可切换接单状态'}});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());
 await fireEvent.press(v.getByTestId('errand-take'));await fireEvent.press(v.getByText('确认'));
 await waitFor(()=>expect(v.getByText('当前账号没有操作权限')).toBeTruthy());expect(mockSession.handleAuthFailure).not.toHaveBeenCalled();
});

it('发布者删除需确认，成功后清缓存并返回列表',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:3,role:'student'});(deleteErrand as jest.Mock).mockResolvedValue(undefined);
 getQueryClient().setQueryData(['bing-errand','list',{}],{rows:[row]});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-delete')).toBeTruthy());
 await fireEvent.press(v.getByTestId('errand-delete'));expect(deleteErrand).not.toHaveBeenCalled();await fireEvent.press(v.getByText('确认'));
 await waitFor(()=>expect(mockReplace).toHaveBeenCalledWith('/errand'));expect(deleteErrand).toHaveBeenCalledWith(2);expect(getQueryClient().getQueryData(['bing-errand','list',{}])).toBeUndefined();
});
it('非发布者不能删除任务',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:9,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByText('test contact')).toBeTruthy());expect(v.queryByTestId('errand-delete')).toBeNull();
});

it('电话号码打开拨号器，启动失败显示可理解提示',async()=>{
 detail.mockResolvedValue({...full,contactInfo:'+60 12-345 6789'});me.mockResolvedValue({id:9,role:'student'});(Linking.openURL as jest.Mock).mockRejectedValue(new Error('private'));
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-dial')).toBeTruthy());await fireEvent.press(v.getByTestId('errand-dial'));
 await waitFor(()=>expect(v.getByText('电话未打开，可再次尝试')).toBeTruthy());expect(Linking.openURL).toHaveBeenCalledWith('tel:+60123456789');expect(v.queryByText('private')).toBeNull();
});
it('联系文本不伪装成电话号码',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:9,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByText('test contact')).toBeTruthy());expect(v.queryByTestId('errand-dial')).toBeNull();
});
it('删除响应失败保留详情并禁止重复删除',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:3,role:'student'});(deleteErrand as jest.Mock).mockRejectedValue(new TypeError('private'));
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-delete')).toBeTruthy());await fireEvent.press(v.getByTestId('errand-delete'));await fireEvent.press(v.getByText('确认'));
 await waitFor(()=>expect(v.getByText('操作未确认，请刷新后重试')).toBeTruthy());await fireEvent.press(v.getByTestId('errand-delete'));expect(deleteErrand).toHaveBeenCalledTimes(1);expect(mockReplace).not.toHaveBeenCalled();
});

it('发布清除缓存后已挂载跑腿列表重新读取新内容',async()=>{
 list.mockResolvedValueOnce({list:[row],page:1,pageSize:5,total:1}).mockResolvedValue({list:[{...row,id:9}],page:1,pageSize:5,total:1});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 await act(async()=>getQueryClient().removeQueries({queryKey:['bing-errand','list']}));
 await waitFor(()=>expect(v.getByTestId('errand-row-9')).toBeTruthy());expect(v.queryByTestId('errand-row-2')).toBeNull();
});

it('跑腿列表卸载时解绑查询缓存订阅',async()=>{
 const unsubscribe=jest.fn();
 const subscribe=jest.spyOn(getQueryClient().getQueryCache(),'subscribe').mockReturnValue(unsubscribe);
 try{
  list.mockResolvedValue({list:[row],page:1,pageSize:5,total:1});
  const v=await renderApp(<ErrandListScreen/>);
  await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
  await act(async()=>{v.unmount();});
  expect(unsubscribe).toHaveBeenCalledTimes(1);
 }finally{subscribe.mockRestore();}
});
