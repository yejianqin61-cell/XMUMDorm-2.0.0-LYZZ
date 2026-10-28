import {readMarketPage,readMarketDetail} from '@/features/marketplace/model';
import {formatErrandDeadline,readErrandPage,readErrandDetail} from '@/features/errand/model';
const market={id:1,title:'Book',description:'Used',price:12,status:'on_sale'};
const errand={id:2,title:'Pickup',reward:5,type:'delivery',status:'open',owner:{id:3,username:'test'}};
it('二手列表保留金额并读取hasMore',()=>{
 expect(readMarketPage({list:[market],hasMore:true}).hasMore).toBe(true);
 expect(readMarketPage({list:[market],hasMore:false}).rows[0].price).toBe(12);
});
it('二手列表保留服务端分类用于商品卡',()=>{
 expect(readMarketPage({list:[{...market,category:'books'}],hasMore:false}).rows[0].category).toBe('books');
});
it('二手详情使用服务端viewer及actions权限',()=>{
 const row=readMarketDetail({...market,delivery_method:'meetup',dorm_area:'LY1',tags:['books'],sellerInfo:{name:'Seller'},viewer:{want:true,canEdit:true},actions:{want:false,markSold:true},images:[{url:'https://example.com/book.jpg'}]});
 expect(row.sellerName).toBe('Seller');expect(row.want).toBe(true);expect(row.canWant).toBe(false);
 expect(row.canEdit).toBe(true);expect(row.canMarkSold).toBe(true);
 expect(row.deliveryMethod).toBe('meetup');expect(row.dormArea).toBe('LY1');expect(row.tags).toEqual(['books']);
});
it('跑腿按实际返回页大小计算分页',()=>{
 expect(readErrandPage({list:[errand],page:1,pageSize:5,total:6}).hasMore).toBe(true);
 expect(readErrandPage({list:[errand],page:2,pageSize:5,total:6}).hasMore).toBe(false);
});
it('跑腿列表保留类型地点和截止时间用于任务卡',()=>{
 const row=readErrandPage({list:[{...errand,location:'Library',deadline:'2026-10-16T12:00:00.000Z'}],page:1,pageSize:5,total:1}).rows[0];
 expect(row.type).toBe('delivery');
 expect(row.location).toBe('Library');
 expect(row.deadline).toBe('2026-10-16T12:00:00.000Z');
});
it('跑腿截止时间格式化为本地可读时间，空值保持为空',()=>{
 expect(formatErrandDeadline('2026-10-16T12:00:00.000Z','zh')).toContain('2026');
 expect(formatErrandDeadline(null,'zh')).toBeNull();
});
it('跑腿列表响应包含联系方式判为契约违例，不能靠隐藏掩盖',()=>{
 expect(()=>readErrandPage({list:[{...errand,contactInfo:'secret'}],page:1,pageSize:5,total:1})).toThrow();
 expect(()=>readErrandPage({list:[{...errand,contact_info:'secret'}],page:1,pageSize:5,total:1})).toThrow();
});
it('跑腿联系方式仅在详情保留',()=>{
 expect(readErrandDetail({...errand,contactInfo:'test-contact',description:'Task'}).contactInfo).toBe('test-contact');
 expect(readErrandPage({list:[errand],page:1,pageSize:5,total:1}).rows[0]).not.toHaveProperty('contactInfo');
});
it('非法标识、金额和分页拒绝',()=>{
 expect(()=>readMarketPage({list:[{...market,id:0}],hasMore:false})).toThrow();
 expect(()=>readMarketPage({list:[{...market,price:NaN}],hasMore:false})).toThrow();
 expect(()=>readErrandPage({list:[],page:1,pageSize:0,total:3})).toThrow();
});
