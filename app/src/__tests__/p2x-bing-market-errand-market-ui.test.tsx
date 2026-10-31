import * as React from 'react';
import {act,fireEvent,waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {within} from '@testing-library/react-native';
import {MarketListScreen,MarketDetailScreen} from '@/features/marketplace/MarketScreens';
import {listMarketplaceItems,getMarketplaceItemDetail,toggleMarketplaceWant,updateMarketplaceItemStatus} from '../../../shared/api/marketplace';
import {getQueryClient} from '@/shared/queryClient';
import type {ListScreenProps} from '@/components/ui/ListScreen';
const mockPush=jest.fn();const mockSession={isSignedIn:true,handleAuthFailure:jest.fn()};let mockListProps:ListScreenProps<unknown>;
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn(),replace:jest.fn(),canGoBack:()=>false})}));
jest.mock('@/features/auth/session',()=>({useSession:()=>mockSession}));
jest.mock('../../../shared/api/marketplace',()=>({listMarketplaceItems:jest.fn(),getMarketplaceItemDetail:jest.fn(),toggleMarketplaceWant:jest.fn(),updateMarketplaceItemStatus:jest.fn()}));
jest.mock('@/components/ui/ListScreen',()=>{const actual=jest.requireActual('@/components/ui/ListScreen'),React=require('react');return {...actual,ListScreen:(p:ListScreenProps<unknown>)=>{mockListProps=p;return React.createElement(actual.ListScreen,{...p,onEndReached:()=>undefined});}};});
const list=listMarketplaceItems as jest.Mock,detail=getMarketplaceItemDetail as jest.Mock,want=toggleMarketplaceWant as jest.Mock;
const markSoldApi=updateMarketplaceItemStatus as jest.Mock;
const row={id:1,title:'Book',description:'Used',price:12,status:'on_sale',category:'books',sellerName:'Alice'};
const full={...row,sellerInfo:{name:'Seller'},viewer:{want:false},actions:{want:true},images:[],wants_count:2};
beforeEach(()=>{getQueryClient().clear();jest.clearAllMocks();list.mockReset();detail.mockReset();want.mockReset();markSoldApi.mockReset();mockSession.isSignedIn=true;});
afterEach(()=>getQueryClient().clear());
it('列表到详情，并带修剪查询及价格筛选',async()=>{
 list.mockResolvedValue({list:[row],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 const rendered=mockListProps.renderItem(row,0) as React.ReactElement<{style?:unknown}>;
 expect(rendered.props.style).toEqual(expect.objectContaining({marginBottom:12}));
 await fireEvent.press(v.getByTestId('market-row-1'));expect(mockPush).toHaveBeenCalledWith('/market/1');
 expect(v.getByTestId('market-search-field')).toBeTruthy();
 // 2026-10-18 所有者裁决：搜索与筛选行随内容滚走（放进 listHeader），不再固定在顶部
 expect(mockListProps.listHeader).toBeTruthy();
 await fireEvent.changeText(v.getByTestId('market-search-field'),' Book ');
 await fireEvent(v.getByTestId('market-search-field-input'),'submitEditing');
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10,q:'Book'}));
});
it('网格卡只留分类与价格：卖家与描述不进列表',async()=>{
 const sellerRow={...row,sellerName:'Alice',description:'Used copy'};
 list.mockResolvedValue({list:[sellerRow],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 const card=within(v.getByTestId('market-row-1'));
 // 2026-10-18 第五轮：列表不展示卖家（详情页才展示）与描述；分类 + 价格保留
 expect(card.getByText('书籍资料')).toBeTruthy();
 expect(card.getByText('RM 12.00')).toBeTruthy();
 expect(card.queryByText('Alice')).toBeNull();
 expect(card.queryByText('Used copy')).toBeNull();
 // 双列瀑布流：ListScreen 拿到 numColumns=2
 expect(mockListProps.numColumns).toBe(2);
});
it('价格筛选已移除；分类切换独立请求',async()=>{
 list.mockResolvedValue({list:[row],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(list).toHaveBeenCalledTimes(1));
 expect(v.queryByTestId('market-min-input')).toBeNull();
 expect(v.queryByTestId('market-apply')).toBeNull();
 await fireEvent.press(v.getByTestId('market-category-books'));
 await waitFor(()=>expect(list).toHaveBeenCalledWith({page:1,pageSize:10,category:'books'}));
});
it('二手组合筛选显示已应用条件并可清除',async()=>{
 list.mockResolvedValue({list:[row],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-category-books'));
 await fireEvent.press(v.getByTestId('market-status-on_sale'));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10,category:'books',status:'on_sale'}));
 expect(v.getByTestId('market-filter-clear')).toBeTruthy();
 expect(v.getByTestId('market-category-books').props.accessibilityState.selected).toBe(true);
 expect(v.getByTestId('market-status-on_sale').props.accessibilityState.selected).toBe(true);
 await fireEvent.press(v.getByTestId('market-filter-clear'));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith({page:1,pageSize:10}));
});
it('滚过一屏才出现回顶悬浮按钮，点它下发滚动信号',async()=>{
 list.mockResolvedValue({list:[row],hasMore:false});const v=await renderApp(<MarketListScreen/>);
 await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 expect(v.queryByTestId('market-back-to-top')).toBeNull();
 await act(async()=>mockListProps.onScrollOffset?.(900));
 expect(v.getByTestId('market-back-to-top')).toBeTruthy();
 await fireEvent.press(v.getByTestId('market-back-to-top'));
 await waitFor(()=>expect(mockListProps.scrollToTopSignal).toBe(1));
});
it('刷新失败保留二手行并可从提示重试',async()=>{
 list.mockResolvedValueOnce({list:[row],hasMore:false}).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({list:[{...row,id:3}],hasMore:false});
 const v=await renderApp(<MarketListScreen/>);await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 await act(async()=>mockListProps.onRefresh?.());
 await waitFor(()=>expect(v.getByTestId('market-refresh-retry')).toBeTruthy());
 expect(v.getByTestId('market-row-1')).toBeTruthy();
 await fireEvent.press(v.getByTestId('market-refresh-retry'));
 await waitFor(()=>expect(v.getByTestId('market-row-3')).toBeTruthy());
});
it('追加失败保留行，重试同页，返回分类恢复滚动与数据',async()=>{
 list.mockResolvedValueOnce({list:[row],hasMore:true}).mockRejectedValueOnce(new TypeError('private'))
 .mockResolvedValueOnce({list:[{...row,id:2}],hasMore:false}).mockResolvedValue({list:[],hasMore:false});
 const v=await renderApp(<MarketListScreen/>);await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 await act(async()=>mockListProps.onScrollOffset?.(480));await act(async()=>mockListProps.onEndReached?.());
 await waitFor(()=>expect(list).toHaveBeenCalledTimes(2));expect(v.getByTestId('market-row-1')).toBeTruthy();
 await act(async()=>mockListProps.onRetryAppend?.());await waitFor(()=>expect(v.getByTestId('market-row-2')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-category-books'));await waitFor(()=>expect(list).toHaveBeenCalledTimes(4));
 await fireEvent.press(v.getByTestId('market-category-all'));await waitFor(()=>expect(mockListProps.restoredScrollOffset).toBe(480));
 expect(v.getByTestId('market-row-2')).toBeTruthy();expect(list).toHaveBeenCalledTimes(4);
});
it('英文空态与详情404显示业务返回入口',async()=>{
 detail.mockRejectedValue({status:404});const v=await renderApp(<MarketDetailScreen itemId="999"/>,{locale:'en'});
 await waitFor(()=>expect(v.getByText('Item is unavailable or deleted')).toBeTruthy());expect(v.getByText('Back to listings')).toBeTruthy();
});
it('商品详情首屏显示媒体和交易摘要',async()=>{
 detail.mockResolvedValue({...full,images:[{url:'https://example.com/book.jpg'}]});
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);await waitFor(()=>expect(v.getByText('Seller')).toBeTruthy());
 expect(v.getByTestId('market-media')).toBeTruthy();expect(v.getByTestId('market-detail-summary')).toBeTruthy();
 expect(v.getByText('RM 12.00')).toBeTruthy();expect(v.getByText('在售')).toBeTruthy();
});
it('商品交易动作位于独立操作区',async()=>{
 detail.mockResolvedValue(full);const v=await renderApp(<MarketDetailScreen itemId="1"/>);
 await waitFor(()=>expect(v.getByTestId('market-want')).toBeTruthy());
 expect(v.getByTestId('market-transaction-actions')).toBeTruthy();
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
 await fireEvent.press(v.getByTestId('market-category-books'));await waitFor(()=>expect(v.getByTestId('market-row-2')).toBeTruthy());
 await act(async()=>finish({list:[row],hasMore:false}));expect(v.queryByTestId('market-row-1')).toBeNull();
});
it('连续点击想要只发送一次写请求',async()=>{
 let finish:(x:unknown)=>void=()=>{};detail.mockResolvedValue(full);want.mockReturnValue(new Promise(r=>{finish=r;}));
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);await waitFor(()=>expect(v.getByTestId('market-want')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-want'));await fireEvent.press(v.getByTestId('market-want'));
 expect(want).toHaveBeenCalledTimes(1);await act(async()=>finish({want:true,wants_count:3}));await waitFor(()=>expect(v.getByText('已想要 · 3')).toBeTruthy());
});

it('发布清除缓存后已挂载二手列表重新读取新内容',async()=>{
 list.mockResolvedValueOnce({list:[row],hasMore:false}).mockResolvedValue({list:[{...row,id:9,title:'New'}],hasMore:false});
 const v=await renderApp(<MarketListScreen/>);await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
 await act(async()=>getQueryClient().removeQueries({queryKey:['bing-market','list']}));
 await waitFor(()=>expect(v.getByTestId('market-row-9')).toBeTruthy());expect(v.queryByTestId('market-row-1')).toBeNull();
});
it('想要响应丢失后下一次操作先读权威状态，不能反向切换',async()=>{
 detail.mockResolvedValueOnce(full).mockResolvedValue({...full,viewer:{want:true},wants_count:3});want.mockRejectedValue(new TypeError('response lost'));
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);await waitFor(()=>expect(v.getByTestId('market-want')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-want'));await waitFor(()=>expect(want).toHaveBeenCalledTimes(1));
 await fireEvent.press(v.getByTestId('market-want'));await waitFor(()=>expect(v.getByText('已想要 · 3')).toBeTruthy());expect(want).toHaveBeenCalledTimes(1);
});

it('卖家可标记已售：只发一次写请求并刷新为已售',async()=>{
 detail.mockResolvedValueOnce({...full,viewer:{want:false,canEdit:true},actions:{want:true,markSold:true}})
  .mockResolvedValue({...full,status:'sold',viewer:{want:false,canEdit:true},actions:{want:true,markSold:false}});
 markSoldApi.mockResolvedValue({});
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);
 await waitFor(()=>expect(v.getByTestId('market-mark-sold')).toBeTruthy());
 await fireEvent.press(v.getByTestId('market-mark-sold'));
 await waitFor(()=>expect(markSoldApi).toHaveBeenCalledWith(1,'sold'));
 expect(markSoldApi).toHaveBeenCalledTimes(1);
 await waitFor(()=>expect(v.getByText('已售')).toBeTruthy());
});
it('买家没有标记已售入口',async()=>{
 detail.mockResolvedValue(full);
 const v=await renderApp(<MarketDetailScreen itemId="1"/>);
 await waitFor(()=>expect(v.getByTestId('market-want')).toBeTruthy());
 expect(v.queryByTestId('market-mark-sold')).toBeNull();
});

it('二手列表卸载时解绑查询缓存订阅',async()=>{ const unsubscribe=jest.fn();
 const subscribe=jest.spyOn(getQueryClient().getQueryCache(),'subscribe').mockReturnValue(unsubscribe);
 try{
  list.mockResolvedValue({list:[row],hasMore:false});
  const v=await renderApp(<MarketListScreen/>);
  await waitFor(()=>expect(v.getByTestId('market-row-1')).toBeTruthy());
  await act(async()=>{v.unmount();});
  expect(unsubscribe).toHaveBeenCalledTimes(1);
 }finally{subscribe.mockRestore();}
});
