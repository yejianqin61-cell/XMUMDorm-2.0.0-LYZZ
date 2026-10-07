import * as React from 'react';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/ui/Screen';
import {ListScreen,useListPagination} from '@/components/ui/ListScreen';
import {ListItem} from '@/components/ui/ListItem';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {DetailScreen} from '@/proto/P3';
import {useI18n} from '@/i18n';
import type {AppError} from '@/i18n/errors';
import {getQueryClient} from '@/shared/queryClient';
import {useSession} from '@/features/auth/session';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';
import {listErrands,getErrandDetail,takeErrand,doneErrand} from '../../../../shared/api/errands';
import {getMe} from '../../../../shared/api/users';
import {AlertDialog} from '@/components/ui/AlertDialog';
import {readErrandPage,readErrandDetail,type ErrandItem} from './model';
type Filters={type?:string;status?:string};
type Snapshot={rows:readonly ErrandItem[];page:number;hasMore:boolean;scrollOffset:number};
function errorFor(error:unknown):AppError {
 const e=error as {status?:number;name?:string}|null;
 if(e?.status===404)return {kind:'content'};
 if(e?.status===401||e?.status===403)return {kind:'permission'};
 if(e?.name==='AbortError')return {kind:'timeout'};
 return {kind:error instanceof TypeError?'unreachable':'unknown'};
}
const typeKeys={all:'screen.errand.all',delivery:'screen.errand.delivery',purchase:'screen.errand.purchase',urgent:'screen.errand.urgent'} as const;
const statusKeys={all:'screen.errand.all',open:'screen.errand.open',taken:'screen.errand.taken',done:'screen.errand.done'} as const;
const noticeKeys={failed:'screen.errand.failed',login:'screen.errand.login',denied:'screen.errand.denied',conflict:'screen.errand.conflict'} as const;
export function ErrandListScreen():React.ReactElement {
 const {t}=useI18n();const client=getQueryClient();
 const [filters,setFilters]=React.useState<Filters>(()=>client.getQueryData<Filters>(['bing-errand','selected'])??{});
 const select=(next:Filters)=>{client.setQueryData(['bing-errand','selected'],next);setFilters(next);};
 return <Screen titleKey="screen.errand.title" showMailbox={false} testID="errand-screen">
  <SegmentedControl testID="errand-type" value={filters.type??'all'} options={(['all','delivery','purchase','urgent'] as const).map(value=>({value,label:t(typeKeys[value as keyof typeof typeKeys])}))} onChange={type=>select({...filters,type:type==='all'?undefined:type})}/>
  <SegmentedControl testID="errand-status" value={filters.status??'all'} options={(['all','open','taken','done'] as const).map(value=>({value,label:t(statusKeys[value])}))} onChange={status=>select({...filters,status:status==='all'?undefined:status})}/>
  <ErrandFeed key={JSON.stringify(filters)} filters={filters}/>
 </Screen>;
}
function ErrandFeed({filters}:{filters:Filters}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const client=getQueryClient();
 const key=React.useMemo(()=>['bing-errand','list',filters] as const,[filters]);
 const initial=React.useRef(client.getQueryData<Snapshot>(key));
 const snapshot=React.useRef<Snapshot>(initial.current??{rows:[],page:0,hasMore:true,scrollOffset:0});
 const [rows,setRows]=React.useState(snapshot.current.rows),[revision,setRevision]=React.useState(0);
 const {pagination,dispatch}=useListPagination({initial:{hasMore:snapshot.current.hasMore}});
 const generation=React.useRef(0),pending=React.useRef<'refresh'|'append'|null>(null);
 const saveScroll=(offset:number)=>{snapshot.current={...snapshot.current,scrollOffset:offset};client.setQueryData(key,snapshot.current);};
 const load=React.useCallback(async(mode:'refresh'|'append')=>{
  if(pending.current==='refresh'||(mode==='append'&&(pending.current||!snapshot.current.hasMore)))return;
  const request=++generation.current,page=mode==='refresh'?1:snapshot.current.page+1;pending.current=mode;
  dispatch({type:mode==='refresh'?'refresh:start':'append:start'});
  try{const data=readErrandPage(await listErrands({page,pageSize:10,...filters}));if(request!==generation.current)return;
   const unique=new Map<number,ErrandItem>();for(const row of mode==='refresh'?[]:snapshot.current.rows)unique.set(row.id,row);for(const row of data.rows)unique.set(row.id,row);
   const next={rows:Array.from(unique.values()),page,hasMore:data.hasMore,scrollOffset:mode==='refresh'?0:snapshot.current.scrollOffset};snapshot.current=next;client.setQueryData(key,next);setRows(next.rows);
   if(mode==='refresh')setRevision(n=>n+1);dispatch({type:mode==='refresh'?'refresh:success':'append:success',hasMore:data.hasMore});
  }catch(error){if(request===generation.current)dispatch({type:mode==='refresh'?'refresh:failure':'append:failure',error:errorFor(error)});}
  finally{if(request===generation.current)pending.current=null;}
 },[client,key,filters,dispatch]);
 React.useEffect(()=>{if(!initial.current)void load('refresh');return()=>{generation.current++;pending.current=null;};},[load]);
 const refresh=()=>void load('refresh'),append=()=>void load('append');
 return <>
  {rows.length>0&&pagination.errorScope==='refresh'?<Button label={t('screen.errand.refreshFailed')} onPress={refresh}/>:null}
  <ListScreen key={revision} testID="errand-list" data={rows} keyExtractor={r=>String(r.id)} pagination={pagination} restoredScrollOffset={revision===0?initial.current?.scrollOffset??0:0} onScrollOffset={saveScroll}
   onRefresh={refresh} onEndReached={append} onRetryRefresh={refresh} onRetryAppend={append}
   labels={{retryLabel:t('action.retry'),endLabel:t('screen.errand.end'),empty:{kind:'noResult',title:t('screen.errand.empty'),actionLabel:t('action.retry'),onAction:refresh}}}
   renderItem={r=><ListItem testID={`errand-row-${r.id}`} title={r.title} subtitle={r.location} meta={`RM ${r.reward.toFixed(2)} · ${t(statusKeys[r.status as 'open'|'taken'|'done'])}`} onPress={()=>router.push(`/errand/${r.id}` as never)}/>}/>
 </>;
}
type Detail=ReturnType<typeof readErrandDetail>;
type Viewer={id:number;role:string};
export function ErrandDetailScreen({errandId}:{errandId:string}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const session=useSession();
 const [item,setItem]=React.useState<Detail|null>(null),[viewer,setViewer]=React.useState<Viewer|null>(null),[identityError,setIdentityError]=React.useState(false);
 const [loading,setLoading]=React.useState(true),[error,setError]=React.useState<AppError|null>(null),[busy,setBusy]=React.useState(false),[confirm,setConfirm]=React.useState<'take'|'done'|null>(null),[notice,setNotice]=React.useState<'failed'|'login'|'denied'|'conflict'|null>(null);
 const epoch=React.useRef(0),lock=React.useRef(false),uncertain=React.useRef(false);
 const load=React.useCallback(async()=>{
  const request=++epoch.current;lock.current=false;uncertain.current=false;setBusy(false);setItem(null);setViewer(null);setConfirm(null);setNotice(null);setIdentityError(false);setError(null);setLoading(true);
  try{
   if(!/^[1-9]\d*$/.test(errandId)||!Number.isSafeInteger(Number(errandId)))throw {status:404};
   const data=readErrandDetail(await getErrandDetail(Number(errandId)));if(data.id!==Number(errandId))throw {status:404};
   if(request!==epoch.current)return;setItem(data);
   if(session.isSignedIn){try{const me=await getMe();if(!Number.isSafeInteger(me?.id)||me.id<=0||typeof me.role!=='string')throw new Error('Invalid identity');if(request===epoch.current)setViewer({id:me.id,role:me.role});}
    catch(failure){if(request!==epoch.current)return;const auth=classifyAuthFailure(failure);if(isSessionInvalid(auth))await session.handleAuthFailure(failure);if(request===epoch.current)setIdentityError(true);}}
  }catch(failure){if(request===epoch.current)setError(errorFor(failure));}finally{if(request===epoch.current)setLoading(false);}
 },[errandId,session.isSignedIn,session.handleAuthFailure]);
 React.useEffect(()=>{void load();return()=>{epoch.current++;};},[load]);
 const canTake=!!(item&&viewer&&(viewer.id===item.ownerId||viewer.role==='admin')&&item.status!=='done');
 const canDone=!!(item&&viewer&&(viewer.id===item.ownerId||viewer.id===item.takerId));
 const action=async(operation:'take'|'done')=>{
  setConfirm(null);if(!item||lock.current||uncertain.current)return;
  if(!session.isSignedIn){setNotice('login');return;}if(operation==='take'?!canTake:!canDone){setNotice('denied');return;}
  lock.current=true;setBusy(true);setNotice(null);const request=epoch.current;
  try{
   if(operation==='take')await takeErrand(item.id);else await doneErrand(item.id);
   if(request!==epoch.current)return;
   uncertain.current=true;
   const fresh=readErrandDetail(await getErrandDetail(item.id));if(fresh.id!==item.id)throw new Error('Wrong errand');
   if(request===epoch.current){setItem(fresh);uncertain.current=false;}
  }catch(failure){if(request!==epoch.current)return;const rejected=failure as {status?:number;body?:{message?:string}};
   const businessDenied=rejected?.status===403&&['无权限操作','仅发布者或管理员可切换接单状态'].includes(rejected.body?.message??'');
   const auth=businessDenied?'other':classifyAuthFailure(failure);
   if(isSessionInvalid(auth))await session.handleAuthFailure(failure);
   if(request===epoch.current){const status=(failure as {status?:number})?.status;setNotice(isSessionInvalid(auth)?'login':status===403?'denied':status===409?'conflict':'failed');uncertain.current=true;}
  }finally{if(request===epoch.current){lock.current=false;setBusy(false);}}
 };
 const back=()=>router.canGoBack()?router.back():router.replace('/errand' as never);
 return <DetailScreen testID="errand-detail" title={item?.title??t('screen.errand.detail')} author={{kind:'named',name:item?.ownerName??t('screen.errand.owner')}} interactions={{}} onBack={back} onRetry={()=>void load()} state={loading?'loading':error?.kind==='content'?'empty':error?'error':item?'content':'empty'} error={error}
  empty={{kind:'noResult',title:t('screen.errand.unavailable'),actionLabel:t('screen.errand.back'),onAction:back}}
  body={item?<><Text role="body">{item.description}</Text><Text role="body">{`RM ${item.reward.toFixed(2)} · ${t(statusKeys[item.status as 'open'|'taken'|'done'])}`}</Text>
   <Text role="body">{item.location}</Text>{item.deadline?<Text role="body">{item.deadline}</Text>:null}
   <Text role="label">{t('screen.errand.contact')}</Text><Text role="body">{item.contactInfo}</Text>
   {identityError?<Button label={t('screen.errand.identityFailed')} onPress={()=>void load()}/>:null}
   {canTake?<Button testID="errand-take" disabled={busy||uncertain.current} label={t(item.status==='taken'?'screen.errand.untake':'screen.errand.take')} onPress={()=>setConfirm('take')}/>:null}
   {canDone?<Button testID="errand-done" disabled={busy||uncertain.current} label={t(item.status==='done'?'screen.errand.undo':'screen.errand.complete')} onPress={()=>setConfirm('done')}/>:null}
   {notice?<><Text role="body">{t(noticeKeys[notice])}</Text><Button label={t('screen.errand.refresh')} onPress={()=>void load()}/></>:null}
   <AlertDialog testID="errand-confirm" visible={confirm!==null} title={t('screen.errand.detail')} body={t('screen.errand.confirmBody')} confirmLabel={t('screen.errand.confirm')} cancelLabel={t('action.cancel')} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(confirm)void action(confirm);}}/>
  </>:null}
  labels={{back:t('action.back'),like:t('screen.campus.read.like'),favorite:t('action.save'),comment:t('screen.campus.read.comments'),report:t('screen.campus.read.report'),countPlaceholder:'—',anonymous:t('screen.campus.read.anonymous'),comments:{anonymous:t('screen.campus.read.anonymous'),deleteLabel:t('screen.campus.read.delete'),replyLabel:t('screen.campus.read.reply'),likeLabel:t('screen.campus.read.like'),moreReplies:n=>String(n),collapse:t('screen.campus.read.collapse')},commentsEnd:t('screen.campus.read.end'),commentsRetry:t('action.retry')}}/>;
}
