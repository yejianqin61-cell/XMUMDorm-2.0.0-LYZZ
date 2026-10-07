type Row=Record<string,unknown>;
function record(value:unknown):Row {if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid errand data');return value as Row;}
export type ErrandItem={id:number;title:string;reward:number;type:string;status:string;location:string;deadline:string|null;ownerId:number;ownerName:string};
function item(value:unknown):ErrandItem {
 const r=record(value),owner=record(r.owner);
 if(!Number.isSafeInteger(r.id)||Number(r.id)<=0||typeof r.title!=='string'||typeof r.reward!=='number'||!Number.isFinite(r.reward)||r.reward<0||!['delivery','purchase','urgent'].includes(String(r.type))||!['open','taken','done'].includes(String(r.status))||!Number.isSafeInteger(owner.id)||Number(owner.id)<=0)throw new Error('Invalid errand item');
 return {id:r.id as number,title:r.title,reward:r.reward,type:String(r.type),status:String(r.status),location:typeof r.location==='string'?r.location:'',deadline:typeof r.deadline==='string'?r.deadline:null,ownerId:owner.id as number,ownerName:typeof owner.nickname==='string'&&owner.nickname?owner.nickname:typeof owner.username==='string'?owner.username:'—'};
}
export function readErrandPage(value:unknown){const r=record(value);
 if(!Array.isArray(r.list)||!Number.isSafeInteger(r.page)||Number(r.page)<1||!Number.isSafeInteger(r.pageSize)||Number(r.pageSize)<1||!Number.isSafeInteger(r.total)||Number(r.total)<0)throw new Error('Invalid errand page');
 const rows=r.list.map(value=>{const row=record(value);if('contactInfo' in row||'contact_info' in row)throw new Error('Contact exposed in errand list');return item(row);});
 return {rows,hasMore:Number(r.page)*Number(r.pageSize)<Number(r.total)};
}
export function readErrandDetail(value:unknown){const r=record(value);if(typeof r.contactInfo!=='string'||typeof r.description!=='string')throw new Error('Invalid errand detail');const taker=r.taker==null?null:record(r.taker);if(taker&&(!Number.isSafeInteger(taker.id)||Number(taker.id)<=0))throw new Error('Invalid taker');return {...item(r),contactInfo:r.contactInfo,description:r.description,takerId:taker?taker.id as number:null};}
