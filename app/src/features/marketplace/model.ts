type Row=Record<string,unknown>;
function record(value:unknown):Row {if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid marketplace data');return value as Row;}
export type MarketItem={id:number;title:string;description:string;price:number;status:string;cover?:string;sellerName?:string};
function item(value:unknown):MarketItem {
 const r=record(value);
 if(!Number.isSafeInteger(r.id)||Number(r.id)<=0||typeof r.title!=='string'||typeof r.description!=='string'||typeof r.price!=='number'||!Number.isFinite(r.price)||r.price<0||!['on_sale','sold'].includes(String(r.status)))throw new Error('Invalid marketplace item');
 return {id:r.id as number,title:r.title,description:r.description,price:r.price,status:String(r.status),cover:typeof r.cover==='string'?r.cover:undefined,sellerName:typeof r.sellerName==='string'?r.sellerName:undefined};
}
export function readMarketPage(value:unknown){const r=record(value);if(!Array.isArray(r.list)||typeof r.hasMore!=='boolean')throw new Error('Invalid marketplace page');return {rows:r.list.map(item),hasMore:r.hasMore};}
export function readMarketDetail(value:unknown){const r=record(value),base=item(r),seller=record(r.sellerInfo),viewer=record(r.viewer),actions=record(r.actions);
 if(typeof seller.name!=='string'||typeof viewer.want!=='boolean'||typeof actions.want!=='boolean'||!Array.isArray(r.images))throw new Error('Invalid marketplace detail');
 return {...base,sellerName:seller.name,want:viewer.want,canWant:actions.want,images:r.images.map(value=>{const image=record(value);if(typeof image.url!=='string')throw new Error('Invalid marketplace image');return image.url;})};
}
