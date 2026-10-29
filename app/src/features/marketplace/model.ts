type Row=Record<string,unknown>;
function record(value:unknown):Row {if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid marketplace data');return value as Row;}
export type MarketItem={id:number;title:string;description:string;price:number;status:string;category?:string;cover?:string;sellerName?:string};
export type MarketDetail=MarketItem&{sellerName:string;want:boolean;canWant:boolean;canEdit?:boolean;canMarkSold?:boolean;deliveryMethod?:string;dormArea?:string;tags:string[];images:string[]};
function item(value:unknown):MarketItem {
 const r=record(value);
 if(!Number.isSafeInteger(r.id)||Number(r.id)<=0||typeof r.title!=='string'||typeof r.description!=='string'||typeof r.price!=='number'||!Number.isFinite(r.price)||r.price<0||!['on_sale','sold'].includes(String(r.status)))throw new Error('Invalid marketplace item');
 return {id:r.id as number,title:r.title,description:r.description,price:r.price,status:String(r.status),category:typeof r.category==='string'&&r.category?String(r.category):undefined,cover:typeof r.cover==='string'?r.cover:undefined,sellerName:typeof r.sellerName==='string'?r.sellerName:undefined};
}
export function readMarketPage(value:unknown){const r=record(value);if(!Array.isArray(r.list)||typeof r.hasMore!=='boolean')throw new Error('Invalid marketplace page');return {rows:r.list.map(item),hasMore:r.hasMore};}
export function readMarketDetail(value:unknown):MarketDetail{const r=record(value),base=item(r),seller=record(r.sellerInfo),viewer=record(r.viewer),actions=record(r.actions);
 if(typeof seller.name!=='string'||typeof viewer.want!=='boolean'||typeof actions.want!=='boolean'||!Array.isArray(r.images))throw new Error('Invalid marketplace detail');
 const tags=Array.isArray(r.tags)?r.tags.filter((tag):tag is string=>typeof tag==='string'):[];
 return {...base,sellerName:seller.name,want:viewer.want,canWant:actions.want,
  canEdit:typeof viewer.canEdit==='boolean'?viewer.canEdit:undefined,
  canMarkSold:typeof actions.markSold==='boolean'?actions.markSold:undefined,
  deliveryMethod:typeof r.delivery_method==='string'?r.delivery_method:undefined,
  dormArea:typeof r.dorm_area==='string'?r.dorm_area:undefined,tags,
  images:r.images.map(value=>{const image=record(value);if(typeof image.url!=='string')throw new Error('Invalid marketplace image');return image.url;})};
}
