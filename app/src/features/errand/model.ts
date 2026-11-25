type Row=Record<string,unknown>;
function record(value:unknown):Row {if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid errand data');return value as Row;}
export type ErrandItem={id:number;title:string;reward:number;type:string;status:string;location:string;deadline:string|null;ownerId:number;ownerName:string};
export function formatErrandDeadline(value:string|null,locale:'zh'|'en'='zh'):string|null {
 if(!value)return null;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
 return new Intl.DateTimeFormat(locale==='en'?'en-GB':'zh-CN',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
}
/** 距截止还有多久（只给待接单用）：过期 / 剩几天 / 剩几小时 / 剩几分钟；没有或无法解析时 `null` */
export function errandTimeLeft(value:string|null,now:number):{unit:'overdue'|'days'|'hours'|'minutes';n:number}|null {
 if(!value)return null;const due=new Date(value).getTime();if(!Number.isFinite(due))return null;
 const minutes=Math.floor((due-now)/60_000);
 if(minutes<=0)return {unit:'overdue',n:0};
 if(minutes>=1440)return {unit:'days',n:Math.floor(minutes/1440)};
 if(minutes>=60)return {unit:'hours',n:Math.floor(minutes/60)};
 return {unit:'minutes',n:minutes};
}
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
