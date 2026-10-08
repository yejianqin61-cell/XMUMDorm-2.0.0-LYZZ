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
import {ERRAND_TYPES} from '../../../../shared/constants/serviceEnums';
import {renderDeadline} from './DeadlineField';
import {createErrand} from '../../../../shared/api/errands';
export function createErrandPublishDescriptor(t:Translate):PublishFormDescriptor {
 const types=ERRAND_TYPES.map(value=>({value,label:t(value==='delivery'?'screen.errand.delivery':value==='purchase'?'screen.errand.purchase':'screen.errand.urgent')}));
 const d:PublishFormDescriptor={id:'errand',semantic:'create',listAfterSubmit:'/errand',sections:[{title:'publish.entry.errand',fields:[
 {kind:'text',name:'title',labelKey:'publish.bing.title',required:true,maxLength:120,validate:text(120)},
 {kind:'textarea',name:'description',labelKey:'publish.bing.description',maxLength:5000,validate:text(5000)},
 {kind:'number',name:'reward',labelKey:'publish.bing.reward',required:true,validate:money},
 {kind:'segmented',name:'type',labelKey:'publish.bing.type',required:true,source:{kind:'constants',options:types},validate:v=>types.some(x=>x.value===v)?undefined:invalid},
 {kind:'text',name:'contactInfo',labelKey:'publish.bing.contact',helpKey:'publish.bing.contactHelp',required:true,maxLength:255,neverDraft:true,validate:text(255)},
 {kind:'text',name:'location',labelKey:'publish.bing.location',maxLength:120,validate:text(120)},
 {kind:'custom',render:renderDeadline,name:'deadline',labelKey:'publish.bing.deadline',helpKey:'publish.bing.deadlineHelp',validate:v=>v===''||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?undefined:invalid},
 ]}],submit:async values=>{validate(d,values);const result=await createErrand({title:String(values.title).trim(),description:String(values.description).trim(),reward:Number(values.reward),type:values.type,contactInfo:String(values.contactInfo).trim(),location:String(values.location).trim(),deadline:values.deadline?new Date(String(values.deadline)).toISOString():null});const id=idOf(result);getQueryClient().removeQueries({queryKey:['bing-errand','list']});return {id};},routeAfterSubmit:r=>r?.id?`/errand/${r.id}?published=1`:'/errand'};
 return d;
}
