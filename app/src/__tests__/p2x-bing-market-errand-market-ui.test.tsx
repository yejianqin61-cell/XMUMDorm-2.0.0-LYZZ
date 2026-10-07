import * as React from 'react';
import {act,fireEvent,waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {MarketListScreen,MarketDetailScreen} from '@/features/marketplace/MarketScreens';
import {listMarketplaceItems,getMarketplaceItemDetail,toggleMarketplaceWant} from '../../../shared/api/marketplace';
import {getQueryClient} from '@/shared/queryClient';
import type {ListScreenProps} from '@/components/ui/ListScreen';
const mockPush=jest.fn();const mockSession={isSignedIn:true,handleAuthFailure:jest.fn()};let mockListProps:ListScreenProps<unknown>;
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn(),replace:jest.fn(),canGoBack:()=>false})}));
jest.mock('@/features/auth/session',()=>({useSession:()=>mockSession}));
jest.mock('../../../shared/api/marketplace',()=>({listMarketplaceItems:jest.fn(),getMarketplaceItemDetail:jest.fn(),toggleMarketplaceWant:jest.fn()}));
jest.mock('@/components/ui/ListScreen',()=>{const actual=jest.requireActual('@/components/ui/ListScreen'),React=require('react');return {...actual,ListScreen:(p:ListScreenProps<unknown>)=>{mockListProps=p;return React.createElement(actual.ListScreen,{...p,onEndReached:()=>undefined});}};});
const list=listMarketplaceItems as jest.Mock,detail=getMarketplaceItemDetail as jest.Mock,want=toggleMarketplaceWant as jest.Mock;
const row={id:1,title:'Book',description:'Used',price:12,status:'on_sale'};
const full={...row,sellerInfo:{name:'Seller'},viewer:{want:false},actions:{want:true},images:[],wants_count:2};
beforeEach(()=>{getQueryClient().clear();jest.clearAllMocks();list.mockReset();detail.mockReset();want.mockReset();mockSession.isSignedIn=true;});
afterEach(()=>getQueryClient().clear());
it('列表到详情，并带修剪查询及价格筛选',async()=>{
 list.mockResolvedValue({list:[row],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-row-1'));expect(mockPush).toHaveBeenCalledWith('/market/1');
 await fireEvent.changeText(v.getByTestId('market-query-input'),' Book ');
 await fireEvent.changeText(v.getByTestId('market-min-input'),'5');
 await fireEvent.changeText(v.getByTestId('market-max-input'),'15');
 await fireEvent.press(v.getByTestId('market-apply'));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10,q:'Book',priceMin:5,priceMax:15}));
});
it('无效价格不请求，分类切换独立',async()=>{
 list.mockResolvedValue({list:[row],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(list).toHaveBeenCalledTimes(1));
 await fireEvent.changeText(v.getByTestId('market-min-input'),'20');await fireEvent.changeText(v.getByTestId('market-max-input'),'10');
 await fireEvent.press(v.getByTestId('market-apply'));expect(v.getByText('请输入有效价格，最低价不能高于最高价')).toBeTruthy();expect(list).toHaveBeenCalledTimes(1);
 await fireEvent.press(v.getByTestId('filter-chip-books'));
 await waitFor(()=>expect(list).toHaveBeenCalledWith({page:1,pageSize:10,category:'books'}));
});
it('追加失败保留行，重试同页，返回分类恢复滚动与数据',async()=>{
 list.mockResolvedValueOnce({list:[row],hasMore:true}).mockRejectedValueOnce(new TypeError('private'))
 .mockResolvedValueOnce({list:[{...row,id:2}],hasMore:false}).mockResolvedValue({list:[],hasMore:false});
 const v=await renderApp(<MarketListScreen/>);await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 await act(async()=>mockListProps.onScrollOffset?.(480));await act(async()=>mockListProps.onEndReached?.());
 await waitFor(()=>expect(list).toHaveBeenCalledTimes(2));expect(v.getByTestId('market-row-1')).toBeTruthy();
 await act(async()=>mockListProps.onRetryAppend?.());await waitFor(()=>expect(v.getByTestId('market-row-2')).toBeTruthy());
 await fireEvent.press(v.getByTestId('filter-chip-books'));await waitFor(()=>expect(list).toHaveBeenCalledTimes(4));
 await fireEvent.press(v.getByTestId('filter-chip-all'));await waitFor(()=>expect(mockListProps.restoredScrollOffset).toBe(480));
 expect(v.getByTestId('market-row-2')).toBeTruthy();expect(list).toHaveBeenCalledTimes(4);
});
it('英文空态与详情404显示业务返回入口',async()=>{
 detail.mockRejectedValue({status:404});const v=await renderApp(<MarketDetailScreen itemId="999"/>,{locale:'en'});
 await waitFor(()=>expect(v.getByText('Item is unavailable or deleted')).toBeTruthy());expect(v.getByText('Back to listings')).toBeTruthy();
});
it('想要响应缺少计数时重读详情，不重复切换',async()=>{
 detail.mockResolvedValueOnce(full).mockResolvedValue({...full,viewer:{want:true},wants_count:3});want.mockResolvedValue({want:true});
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);await waitFor(()=>expect(v.getByText('Seller')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-want'));await waitFor(()=>expect(v.getByText('已想要 · 3')).toBeTruthy());
 expect(want).toHaveBeenCalledTimes(1);expect(detail).toHaveBeenCalledTimes(2);
});
it('游客想要只提示登录，不调用写接口',async()=>{
 mockSession.isSignedIn=false;detail.mockResolvedValue({...full,actions:{want:false}});
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);await waitFor(()=>expect(v.getByTestId('market-want')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-want'));expect(v.getByText('登录后操作')).toBeTruthy();expect(want).not.toHaveBeenCalled();
});
it('切换分类后旧请求晚到不会覆盖新分类',async()=>{
 let finish:(x:unknown)=>void=()=>{};list.mockReturnValueOnce(new Promise(r=>{finish=r;})).mockResolvedValue({list:[{...row,id:2}],hasMore:false});
 const v=await renderApp(<MarketListScreen/>);await waitFor(()=>expect(list).toHaveBeenCalledTimes(1));
 await fireEvent.press(v.getByTestId('filter-chip-books'));await waitFor(()=>expect(v.getByTestId('market-row-2')).toBeTruthy());
 await act(async()=>finish({list:[row],hasMore:false}));expect(v.queryByTestId('market-row-1')).toBeNull();
});
it('连续点击想要只发送一次写请求',async()=>{
 let finish:(x:unknown)=>void=()=>{};detail.mockResolvedValue(full);want.mockReturnValue(new Promise(r=>{finish=r;}));
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);await waitFor(()=>expect(v.getByTestId('market-want')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-want'));await fireEvent.press(v.getByTestId('market-want'));
 expect(want).toHaveBeenCalledTimes(1);await act(async()=>finish({want:true,wants_count:3}));await waitFor(()=>expect(v.getByText('已想要 · 3')).toBeTruthy());
});
