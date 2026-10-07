import * as React from 'react';
import {act,fireEvent,waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {ErrandListScreen,ErrandDetailScreen} from '@/features/errand/ErrandScreens';
import {listErrands,getErrandDetail,takeErrand,doneErrand} from '../../../shared/api/errands';
import {getMe} from '../../../shared/api/users';
import {getQueryClient} from '@/shared/queryClient';
import type {ListScreenProps} from '@/components/ui/ListScreen';
const mockPush=jest.fn();const mockSession={isSignedIn:true,handleAuthFailure:jest.fn()};let mockListProps:ListScreenProps<unknown>;
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn(),replace:jest.fn(),canGoBack:()=>false})}));
jest.mock('@/features/auth/session',()=>({useSession:()=>mockSession}));
jest.mock('../../../shared/api/users',()=>({getMe:jest.fn()}));
jest.mock('../../../shared/api/errands',()=>({listErrands:jest.fn(),getErrandDetail:jest.fn(),takeErrand:jest.fn(),doneErrand:jest.fn()}));
jest.mock('@/components/ui/ListScreen',()=>{const actual=jest.requireActual('@/components/ui/ListScreen'),React=require('react');return {...actual,ListScreen:(p:ListScreenProps<unknown>)=>{mockListProps=p;return React.createElement(actual.ListScreen,{...p,onEndReached:()=>undefined});}};});
const list=listErrands as jest.Mock,detail=getErrandDetail as jest.Mock,take=takeErrand as jest.Mock,done=doneErrand as jest.Mock,me=getMe as jest.Mock;
const row={id:2,title:'Pickup',reward:5,type:'delivery',status:'open',owner:{id:3,username:'Owner'}};
const full={...row,description:'Pick up a package',contactInfo:'test contact',taker:null};
beforeEach(()=>{getQueryClient().clear();jest.clearAllMocks();list.mockReset();detail.mockReset();me.mockReset();take.mockReset();done.mockReset();mockSession.isSignedIn=true;});
afterEach(()=>getQueryClient().clear());
it('跑腿列表分页按返回页大小且列表没有联系字段',async()=>{
 list.mockResolvedValueOnce({list:[row],page:1,pageSize:5,total:6}).mockResolvedValue({list:[{...row,id:4}],page:2,pageSize:5,total:6});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-row-2')).toBeTruthy());
 expect(v.queryByText('test contact')).toBeNull();await act(async()=>mockListProps.onEndReached?.());
 await waitFor(()=>expect(v.getByTestId('errand-row-4')).toBeTruthy());expect(mockListProps.pagination.hasMore).toBe(false);
 await fireEvent.press(v.getByTestId('errand-row-2'));expect(mockPush).toHaveBeenCalledWith('/errand/2');
});
it('列表泄漏联系方式作为错误，不展示内容',async()=>{
 list.mockResolvedValue({list:[{...row,contactInfo:'test contact'}],page:1,pageSize:5,total:1});
 const v=await renderApp(<ErrandListScreen/>);await waitFor(()=>expect(v.getByTestId('errand-list-error')).toBeTruthy());expect(v.queryByText('test contact')).toBeNull();expect(v.queryByTestId('errand-row-2')).toBeNull();
});
it('详情展示联系信息，非所有者不出现状态操作',async()=>{
 detail.mockResolvedValue(full);me.mockResolvedValue({id:9,role:'student'});
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByText('test contact')).toBeTruthy());
 expect(v.queryByTestId('errand-take')).toBeNull();expect(v.queryByTestId('errand-done')).toBeNull();
});
it('发布者确认接单后重读详情，完成操作也二次确认',async()=>{
 detail.mockResolvedValueOnce(full).mockResolvedValueOnce({...full,status:'taken'}).mockResolvedValue({...full,status:'done'});me.mockResolvedValue({id:3,role:'student'});take.mockResolvedValue(undefined);done.mockResolvedValue(undefined);
 const v=await renderApp(<ErrandDetailScreen errandId="2"/>);await waitFor(()=>expect(v.getByTestId('errand-take')).toBeTruthy());
 await fireEvent.press(v.getByTestId('errand-take'));expect(take).not.toHaveBeenCalled();await fireEvent.press(v.getByTestId('errand-confirm-confirm'));
 await waitFor(()=>expect(v.getByText('取消接单')).toBeTruthy());expect(take).toHaveBeenCalledWith(2);
 await fireEvent.press(v.getByTestId('errand-done'));await fireEvent.press(v.getByTestId('errand-confirm-confirm'));
 await waitFor(()=>expect(v.getByText('撤销完成')).toBeTruthy());expect(done).toHaveBeenCalledWith(2);expect(v.queryByTestId('errand-take')).toBeNull();
});
it('游客不读取我的身份也没有写按钮，英文404可返回',async()=>{
 mockSession.isSignedIn=false;detail.mockRejectedValue({status:404});const v=await renderApp(<ErrandDetailScreen errandId="999"/>,{locale:'en'});
 await waitFor(()=>expect(v.getByText('Task is unavailable')).toBeTruthy());expect(me).not.toHaveBeenCalled();expect(take).not.toHaveBeenCalled();
});
