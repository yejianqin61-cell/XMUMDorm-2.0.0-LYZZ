import * as React from 'react';
import {Button} from '@/components/ui/Button';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {CampusListScreen, CampusDetailScreen} from '@/features/campus/CampusScreens';
import {getPostList, getPostDetail} from '../../../shared/api/posts';
const mockPush=jest.fn(), mockBack=jest.fn(), mockReplace=jest.fn();
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:mockBack,replace:mockReplace,canGoBack:()=>true})}));
jest.mock('../../../shared/api/posts',()=>({getPostList:jest.fn(),getPostDetail:jest.fn()}));
const list=getPostList as jest.Mock, detail=getPostDetail as jest.Mock;
beforeEach(()=>{jest.clearAllMocks();list.mockReset();detail.mockReset();});
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
