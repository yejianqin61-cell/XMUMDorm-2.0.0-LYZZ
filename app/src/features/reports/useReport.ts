import * as React from 'react';
import {submitReport} from '../../../../shared/api/admin';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';

export type ReportReason='spam'|'fraud'|'abuse'|'nsfw'|'trolling'|'privacy'|'illegal_trade'|'other';
export type ReportState='idle'|'sending'|'success'|'failed'|'login'|'denied'|'invalid';
export type ReportTargetType='confession'|'confession_comment'|'post'|'marketplace'|'errand';
const reasons:readonly ReportReason[]=['spam','fraud','abuse','nsfw','trolling','privacy','illegal_trade','other'];

/** One client state machine for the server's single report contract. The controlled panel keeps its own draft. */
export function useReport(target:{id:number;type:ReportTargetType}|null,signedIn:boolean,onAuthFailure:(error:unknown)=>Promise<unknown>){
 const [state,setState]=React.useState<ReportState>('idle');
 const epoch=React.useRef(0),locked=React.useRef(false),completed=React.useRef(false);
 const id=target?.id,type=target?.type;
 React.useEffect(()=>{++epoch.current;locked.current=false;completed.current=false;setState('idle');return()=>{++epoch.current;};},[id,type]);
 const submit=async(reason:ReportReason,detail:string):Promise<void>=>{
  if(locked.current||completed.current)return;
  if(!signedIn){setState('login');return;}
  if(!Number.isSafeInteger(id)||Number(id)<=0||!type||!reasons.includes(reason)||typeof detail!=='string'){setState('invalid');return;}
  const request=epoch.current;locked.current=true;setState('sending');
  try{
   const response=await submitReport({target_type:type,target_id:id,reason,detail:detail.trim(),screenshots:undefined});
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
