import {getPostList} from '../../../shared/api/posts';
import {get} from '../../../shared/api/request';
jest.mock('../../../shared/api/request',()=>({get:jest.fn(),post:jest.fn(),del:jest.fn(),request:jest.fn()}));
beforeEach(()=>jest.clearAllMocks());
it('现有搜索接口裁掉首尾空白并对关键词编码',async()=>{
 (get as jest.Mock).mockResolvedValue({list:[],hasMore:false});
 await getPostList({q:'  study & sport  ',page:1,pageSize:10});
 expect(get).toHaveBeenCalledWith('/api/posts?page=1&pageSize=10&q=study+%26+sport',{});
});
it('空白关键词不发 q 参数',async()=>{
 await getPostList({q:'  '});expect(get).toHaveBeenCalledWith('/api/posts?page=1&pageSize=10',{});
});
it('翻页保留关键词及既有令牌入口',async()=>{
 await getPostList({q:'study',page:2,pageSize:10,token:'test-only-token'});
 expect(get).toHaveBeenCalledWith('/api/posts?page=2&pageSize=10&q=study',{token:'test-only-token'});
});
