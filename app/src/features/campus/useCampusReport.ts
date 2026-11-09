import {useReport,type ReportReason,type ReportState} from '@/features/reports/useReport';

export type CampusReportReason=ReportReason;
export type CampusReportState=ReportState;

/** Campus names remain at the feature boundary; all targets share one server-report state machine. */
export function useCampusReport(target:{id:number;kind:'confession'|'wall'|'comment'}|null,signedIn:boolean,onAuthFailure:(error:unknown)=>Promise<unknown>){
 const type=target===null?null:target.kind==='wall'?'confession':target.kind==='comment'?'confession_comment':'post';
 return useReport(target&&type?{id:target.id,type}:null,signedIn,onAuthFailure);
}
