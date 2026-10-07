import * as React from 'react';
import {submitReport} from '../../../../shared/api/admin';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';
export type CampusReportReason='spam'|'fraud'|'abuse'|'nsfw'|'trolling'|'privacy'|'illegal_trade'|'other';
export type CampusReportState='idle'|'sending'|'success'|'failed'|'login'|'denied'|'invalid';
const reasons:readonly string[]=['spam','fraud','abuse','nsfw','trolling','privacy','illegal_trade','other'];
/** Business seam for O14: the public panel owns reason selection and retains its draft. */
export function useCampusReport(target:{id:number;kind:'confession'|'wall'}|null,signedIn:boolean,onAuthFailure:(error:unknown)=>Promise<unknown>){
 const [state,setState]=React.useState<CampusReportState>('idle');
 const epoch=React.useRef(0),locked=React.useRef(false),completed=React.useRef(false);
 const id=target?.id,kind=target?.kind;
 React.useEffect(()=>{++epoch.current;locked.current=false;completed.current=false;setState('idle');return()=>{++epoch.current;};},[id,kind]);
 const submit=async(reason:CampusReportReason,detail:string):Promise<void>=>{
  if(locked.current||completed.current)return;
  if(!signedIn){setState('login');return;}
  if(!Number.isSafeInteger(id)||Number(id)<=0||!kind||!reasons.includes(reason)||typeof detail!=='string'){setState('invalid');return;}
  const request=epoch.current;locked.current=true;setState('sending');
  try{
   const response=await submitReport({target_type:kind==='wall'?'confession':'post',target_id:id,reason,detail:detail.trim(),screenshots:undefined});
   if(request!==epoch.current)return;
   if(!Number.isSafeInteger(response?.id)||response.id<=0)throw new Error('Invalid report response');
   completed.current=true;setState('success');
  }catch(error){
   if(request!==epoch.current)return;
   const failure=classifyAuthFailure(error);
   if(isSessionInvalid(failure))await onAuthFailure(error);
   if(request===epoch.current)setState(isSessionInvalid(failure)?'login':failure==='sanctioned'?'denied':'failed');
  }finally{if(request===epoch.current)locked.current=false;}
 };
 return {state,submit};
}
