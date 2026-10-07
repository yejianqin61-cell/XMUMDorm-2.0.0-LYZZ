import * as React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {CampusSearchScreen} from '@/features/campus/CampusSearchScreen';
import {getPostList} from '../../../shared/api/posts';
import {getQueryClient} from '@/shared/queryClient';
const mockPush=jest.fn();
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn(),replace:jest.fn(),canGoBack:()=>true})}));
jest.mock('../../../shared/api/posts',()=>({getPostList:jest.fn()}));
import type {ListScreenProps} from '@/components/ui/ListScreen';
let mockListProps:ListScreenProps<unknown>;
jest.mock('@/components/ui/ListScreen',()=>{
 const actual=jest.requireActual('@/components/ui/ListScreen'),React=require('react');
 return {...actual,ListScreen:(props:ListScreenProps<unknown>)=>{mockListProps=props;return React.createElement(actual.ListScreen,{...props,onEndReached:()=>undefined});}};
});
const list=getPostList as jest.Mock;
beforeEach(()=>{getQueryClient().clear();list.mockReset();mockPush.mockClear();});
afterEach(()=>getQueryClient().clear());
it('空关键词不请求，提交修剪后的关键词并进入详情',async()=>{
 list.mockResolvedValue({list:[{id:7,title:'运动',content:'打球'}],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>);
 expect(list).not.toHaveBeenCalled();
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'), '  运动  ');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await waitFor(()=>expect(list).toHaveBeenCalledWith({page:1,pageSize:10,q:'运动'}));
 await waitFor(()=>expect(v.getByTestId('campus-row-7')).toBeTruthy());
 await fireEvent.press(v.getByTestId('campus-row-7'));
 expect(mockPush).toHaveBeenCalledWith('/campus/7');
});
it('英文无结果给出更换关键词入口',async()=>{
 list.mockResolvedValue({list:[],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>,{locale:'en'});
 await fireEvent.changeText(v.getByPlaceholderText('Search Treehole'),'unknown');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await waitFor(()=>expect(v.getByText('No matching posts. Try another keyword.')).toBeTruthy());
 await fireEvent.press(v.getByText('Change keyword'));
 expect(v.getByText('Enter a keyword to search posts')).toBeTruthy();
});

it('分页和失败重试保持同一关键词与页码',async()=>{
 list.mockResolvedValueOnce({list:[{id:1,content:'篮球'}],hasMore:true})
 .mockRejectedValueOnce(new TypeError('private')).mockResolvedValueOnce({list:[{id:2,content:'篮球场'}],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>);
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'篮球');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await waitFor(()=>expect(v.getByTestId('campus-row-1')).toBeTruthy());
 await act(async()=>mockListProps.onEndReached?.());
 await waitFor(()=>expect(list).toHaveBeenCalledTimes(2));
 expect(v.getByTestId('campus-row-1')).toBeTruthy();expect(v.queryByText('private')).toBeNull();
 await act(async()=>mockListProps.onRetryAppend?.());
 await waitFor(()=>expect(v.getByTestId('campus-row-2')).toBeTruthy());
 expect(list.mock.calls.map(call=>call[0])).toEqual([{page:1,pageSize:10,q:'篮球'},{page:2,pageSize:10,q:'篮球'},{page:2,pageSize:10,q:'篮球'}]);
});
it('旧请求晚到不会覆盖新关键词，清除恢复搜索历史',async()=>{
 let finish:(value:unknown)=>void=()=>undefined;
 list.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValue({list:[{id:2,content:'新关键词'}],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>);
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'旧');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'新');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await waitFor(()=>expect(v.getByTestId('campus-row-2')).toBeTruthy());
 await act(async()=>finish({list:[{id:1,content:'旧结果'}],hasMore:false}));
 expect(v.queryByTestId('campus-row-1')).toBeNull();
 await fireEvent.press(v.getByTestId('campus-search-field-clear'));
 expect(v.getByText('最近搜索')).toBeTruthy();
 await fireEvent.press(v.getByText('清除搜索记录'));
 expect(v.queryByText('最近搜索')).toBeNull();
});
it('连续输入只在停顿后发出最后关键词请求',async()=>{
 list.mockResolvedValue({list:[],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>);
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'篮');
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'篮球');
 expect(list).not.toHaveBeenCalled();
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,450));});
 expect(list).toHaveBeenCalledTimes(1);expect(list).toHaveBeenCalledWith({page:1,pageSize:10,q:'篮球'});
});

it('首屏搜索失败可以重试且不泄漏内部错误',async()=>{
 list.mockRejectedValueOnce(new TypeError('private-host')).mockResolvedValueOnce({list:[{id:9,content:'恢复'}],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>);
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'恢复');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await waitFor(()=>expect(v.getByTestId('campus-list-error')).toBeTruthy());
 expect(v.queryByText('private-host')).toBeNull();
 await fireEvent.press(v.getByText('连上校园网后重试'));
 await waitFor(()=>expect(v.getByTestId('campus-row-9')).toBeTruthy());
 expect(list.mock.calls.map(call=>call[0].q)).toEqual(['恢复','恢复']);
});
it('关键词标点按字面高亮',async()=>{
 list.mockResolvedValue({list:[{id:9,title:'a.b',content:'a.b 和 axb'}],hasMore:false});
 const v=await renderApp(<CampusSearchScreen/>);
 await fireEvent.changeText(v.getByPlaceholderText('搜索树洞'),'a.b');
 await fireEvent.press(v.getByTestId('campus-search-submit'));
 await waitFor(()=>expect(v.getAllByTestId('campus-search-match')).toHaveLength(2));
 expect(v.getAllByTestId('campus-search-match').map(item=>item.props.children)).toEqual(['a.b','a.b']);
});
