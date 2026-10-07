import {createErrandPublishDescriptor} from '@/features/errand/publishFields';
import {createMarketplacePublishDescriptor} from '@/features/marketplace/publishFields';
import {createPostPublishDescriptor} from '@/features/campus/postPublishFields';
import {createErrand} from '../../../shared/api/errands';
import {createMarketplaceItem} from '../../../shared/api/marketplace';
import {createPost} from '../../../shared/api/posts';
import {fieldsOf,assertDescriptorInvariants} from '@/features/publish/descriptor';
import {validateAll} from '@/components/ui/Form';
import {zh,en} from '@/i18n';
import {getQueryClient} from '@/shared/queryClient';
jest.mock('../../../shared/api/errands',()=>({createErrand:jest.fn()}));
jest.mock('../../../shared/api/marketplace',()=>({createMarketplaceItem:jest.fn()}));
jest.mock('../../../shared/api/posts',()=>({createPost:jest.fn()}));
const t=(key:keyof typeof en)=>en[key];
const options={categories:[{value:'books',label:'Books'}],tags:[{value:'7',label:'Study'}],renderMedia:()=>null};
const errand=()=>createErrandPublishDescriptor(t);
const market=()=>createMarketplacePublishDescriptor(t,options);
const post=()=>createPostPublishDescriptor(t,options);
const ev={title:'Pickup',description:'Package',reward:'5.50',type:'delivery',contactInfo:'Phone',location:'Gate',deadline:''};
const mv={title:'Book',description:'Used',price:'12.50',category:'books',delivery_method:'pickup',dorm_area:'LY1',tags:[],images:[]};
const pv={title:'Study',content:'Looking for a group',tagIds:['7'],images:[]};
beforeEach(()=>{jest.clearAllMocks();getQueryClient().clear();});
it('三份描述符符合公共契约且媒体禁止落草稿',()=>{
 const ds=[post(),market(),errand()];expect(()=>assertDescriptorInvariants(ds,Object.keys(zh))).not.toThrow();
 for(const d of ds)for(const name of d.mediaFields??[])expect(fieldsOf(d).find(f=>f.name===name)?.neverDraft).toBe(true);
});
it('跑腿联系方式、金额、期限校验阻止接口',async()=>{
 const d=errand();for(const values of [{...ev,contactInfo:' '},{...ev,reward:'-1'},{...ev,deadline:'bad-date'},{...ev,title:'x'.repeat(121)}])await expect(d.submit(values)).rejects.toMatchObject({kind:'validation'});
 expect(createErrand).not.toHaveBeenCalled();expect(validateAll(fieldsOf(d),ev)).toEqual({});
});
it('跑腿提交白名单并清列表缓存',async()=>{
 (createErrand as jest.Mock).mockResolvedValue({id:19});getQueryClient().setQueryData(['bing-errand','list',{}],{});
 const d=errand();expect(await d.submit({...ev,owner_user_id:99})).toEqual({id:19});expect(createErrand).toHaveBeenCalledWith({...ev,reward:5.5,deadline:null});expect(getQueryClient().getQueryData(['bing-errand','list',{}])).toBeUndefined();expect(d.routeAfterSubmit?.({id:19})).toBe('/errand/19');
});
it('二手价格、远程分类、宿舍与图片格式限制',async()=>{
 const d=market();for(const values of [{...mv,price:'Infinity'},{...mv,category:'unknown'},{...mv,dorm_area:'LY3'},{...mv,images:[{uri:'file:///a.gif',name:'a.gif',type:'image/gif',size:20}]}])await expect(d.submit(values)).rejects.toMatchObject({kind:'validation'});expect(createMarketplaceItem).not.toHaveBeenCalled();
});
it('二手提交multipart白名单并返回详情',async()=>{
 (createMarketplaceItem as jest.Mock).mockResolvedValue({id:21});const d=market();expect(await d.submit({...mv,seller_user_id:99})).toEqual({id:21});const data=(createMarketplaceItem as jest.Mock).mock.calls[0][0] as FormData;expect(data.getParts().find((p:any)=>p.fieldName==='price')?.string).toBe('12.5');expect(data.getParts().some((p:any)=>p.fieldName==='seller_user_id')).toBe(false);expect(d.routeAfterSubmit?.({id:21})).toBe('/market/21');
});
it('树洞普通帖固定type并校验标签与标题',async()=>{
 const d=post();await expect(d.submit({...pv,tagIds:['99']})).rejects.toMatchObject({kind:'validation'});await expect(d.submit({...pv,title:''})).rejects.toMatchObject({kind:'validation'});(createPost as jest.Mock).mockResolvedValue({id:23});await d.submit({...pv,type:'announcement'});expect(createPost).toHaveBeenCalledWith({...pv,type:'normal',tagIds:[7]});expect(d.routeAfterSubmit?.({id:23})).toBe('/post/23');
});
it('提交失败不清缓存且无效返回id不宣称成功',async()=>{
 getQueryClient().setQueryData(['bing-errand','list',{}],{old:true});(createErrand as jest.Mock).mockRejectedValue({kind:'unreachable'});await expect(errand().submit(ev)).rejects.toMatchObject({kind:'unreachable'});expect(getQueryClient().getQueryData(['bing-errand','list',{}])).toEqual({old:true});(createErrand as jest.Mock).mockResolvedValue({id:0});await expect(errand().submit(ev)).rejects.toMatchObject({kind:'unknown'});
});
