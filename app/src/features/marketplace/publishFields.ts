import type {FormValues,FormFieldDescriptor,FormOption} from '@/components/ui/FormField';
import {validateAll} from '@/components/ui/Form';
import type {Translate} from '@/i18n';
import {fieldsOf,type PublishFormDescriptor} from '@/features/publish/descriptor';
import {getQueryClient} from '@/shared/queryClient';
const invalid='publish.bing.invalid' as const;
const text=(max:number)=>(value:unknown)=>typeof value==='string'&&value.trim().length<=max?undefined:invalid;
const money=(value:unknown)=>typeof value==='string'&&/^\d+(?:\.\d{1,2})?$/.test(value.trim())&&Number.isFinite(Number(value))?undefined:invalid;
const idOf=(result:unknown)=>{const id=(result as {id?:unknown})?.id;if(typeof id!=='number'||!Number.isSafeInteger(id)||id<=0)throw {kind:'unknown'};return id;};
function validate(d:PublishFormDescriptor,values:FormValues){if(Object.keys(validateAll(fieldsOf(d),values)).length)throw {kind:'validation'};}
export type PublishImage={uri:string;name:string;type:string;size:number};
type MediaRender=NonNullable<FormFieldDescriptor['render']>;
function imagesValid(value:unknown,max:number,gif:boolean){return value===''||Array.isArray(value)&&value.length<=max&&value.every(x=>x&&typeof x.uri==='string'&&/^(file:|content:|blob:)/.test(x.uri)&&typeof x.name==='string'&&x.name.length>0&&typeof x.size==='number'&&x.size>0&&x.size<=8*1024*1024&&['image/jpeg','image/png','image/webp',...(gif?['image/gif']:[])].includes(x.type))?undefined:invalid;}
import {createMarketplaceItem} from '../../../../shared/api/marketplace';
export function createMarketplacePublishDescriptor(t:Translate,options:{categories:readonly FormOption[];renderMedia:MediaRender}):PublishFormDescriptor {
 const dorms=['LY1','LY2','LY4','LY5','LY6','LY7','LY8','LY9','D1','D2','D3','D4','D5'];
 const delivery=[{value:'pickup',label:t('publish.bing.pickup')},{value:'delivery',label:t('publish.bing.deliver')}];
 const d:PublishFormDescriptor={id:'marketplace',semantic:'create',mediaFields:['images'],sections:[{title:'publish.entry.marketplace',fields:[
 {kind:'text',name:'title',labelKey:'publish.bing.title',required:true,maxLength:120,validate:text(120)},
 {kind:'textarea',name:'description',labelKey:'publish.bing.description',required:true,maxLength:3000,validate:text(3000)},
 {kind:'number',name:'price',labelKey:'publish.bing.price',required:true,validate:money},
 {kind:'select',name:'category',labelKey:'publish.bing.category',required:true,source:{kind:'remote',options:options.categories},validate:v=>options.categories.some(x=>x.value===v)?undefined:invalid},
 {kind:'segmented',name:'delivery_method',labelKey:'publish.bing.delivery',required:true,source:{kind:'static',options:delivery},validate:v=>delivery.some(x=>x.value===v)?undefined:invalid},
 {kind:'select',name:'dorm_area',labelKey:'publish.bing.dorm',required:true,source:{kind:'static',options:dorms.map(value=>({value,label:value}))},validate:v=>dorms.includes(String(v))?undefined:invalid},
 {kind:'tags',name:'tags',labelKey:'publish.bing.tags',max:10,maxLength:20,validate:v=>Array.isArray(v)&&v.length<=10&&v.every(x=>typeof x==='string'&&x.trim().length>0&&x.length<=20)?undefined:invalid},
 {kind:'custom',name:'images',labelKey:'publish.bing.images',neverDraft:true,render:options.renderMedia,validate:v=>imagesValid(v,4,false)},
 ]}],submit:async values=>{validate(d,values);const form=new FormData();for(const name of ['title','description','category','delivery_method','dorm_area'])form.append(name,String(values[name]).trim());form.append('price',String(Number(values.price)));form.append('tags',JSON.stringify(values.tags));for(const image of Array.isArray(values.images)?values.images:[])form.append('images',{uri:image.uri,name:image.name,type:image.type} as unknown as Blob);const id=idOf(await createMarketplaceItem(form));getQueryClient().removeQueries({queryKey:['bing-market','list']});return {id};},routeAfterSubmit:r=>r?.id?`/market/${r.id}`:'/market'};
 return d;
}
