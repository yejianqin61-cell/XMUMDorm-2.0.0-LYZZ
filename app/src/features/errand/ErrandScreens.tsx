import { FeatureScreen } from '@/components/ui/FeatureScreen';
import * as React from 'react';
import {View} from 'react-native';
import {ContactCopy} from './ContactCopy';
import * as Linking from 'expo-linking';
import {useRouter} from 'expo-router';
import {ListScreen,useListPagination} from '@/components/ui/ListScreen';
import {EntityCard} from '@/components/ui/EntityCard';
import {Surface} from '@/components/ui/Surface';
import {Badge} from '@/components/ui/Badge';
import {FloatingBackToTop} from '@/components/ui/FloatingBackToTop';
import {UnderlineFilter} from '@/components/ui/UnderlineFilter';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {ReportSheet} from '@/components/ui/ReportSheet';
import {useToast} from '@/components/ui/Toast';
import {DetailScreen} from '@/proto/P3';
import {useI18n} from '@/i18n';
import {useTheme} from '@/design-system/theme';
import type {AppError} from '@/i18n/errors';
import {getQueryClient} from '@/shared/queryClient';
import {useSession} from '@/features/auth/session';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';
import {useReport,type ReportReason} from '@/features/reports/useReport';
import {listErrands,getErrandDetail,takeErrand,doneErrand,deleteErrand} from '../../../../shared/api/errands';
import {getMe} from '../../../../shared/api/users';
import {AlertDialog} from '@/components/ui/AlertDialog';
import {errandTimeLeft,formatErrandDeadline,readErrandPage,readErrandDetail,type ErrandItem} from './model';
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
 const leftKeys={overdue:'screen.errand.left.overdue',days:'screen.errand.left.days',hours:'screen.errand.left.hours',minutes:'screen.errand.left.minutes'} as const;
export function ErrandListScreen({ embedded = false }: { embedded?: boolean } = {}):React.ReactElement {
 const {t}=useI18n();const client=getQueryClient();const theme=useTheme();
 const [filters,setFilters]=React.useState<Filters>(()=>client.getQueryData<Filters>(['bing-errand','selected'])??{});
 const select=(next:Filters)=>{client.setQueryData(['bing-errand','selected'],next);setFilters(next);};
 const clearType=()=>{const next={...filters,type:undefined};client.removeQueries({queryKey:['bing-errand','list',next]});select(next);};
 const clearStatus=()=>{const next={...filters,status:undefined};client.removeQueries({queryKey:['bing-errand','list',next]});select(next);};
 const hasFilters=filters.type!==undefined||filters.status!==undefined;
 // 2026-10-18 所有者裁决：两行筛选**随内容滚走**（放进 ListScreen 的 listHeader），
 // ⛔ 不再固定在顶部；"Task type / Task status" 这两行分区文字也去掉。
 const header=<View testID="errand-filters" style={{paddingTop:theme.space('space_2'),gap:theme.space('space_2')}}>
  {/* 类型 / 状态：下划线式筛选（⛔ 不用圆角按钮冒充 Tab，也不加分区标题） */}
  <UnderlineFilter testID="errand-type" options={(['all','delivery','purchase','urgent'] as const).map(key=>({key,labelKey:typeKeys[key]}))} selectedKey={filters.type??'all'} onSelect={type=>select({...filters,type:type==='all'?undefined:type})}/>
  <UnderlineFilter tone="light" testID="errand-status" options={(['all','open','taken','done'] as const).map(key=>({key,labelKey:statusKeys[key]}))} selectedKey={filters.status??'all'} onSelect={status=>select({...filters,status:status==='all'?undefined:status})}/>
  {hasFilters?<View style={{flexDirection:'row',gap:theme.space('space_3'),paddingHorizontal:theme.space('space_4')}}>
   {filters.type?<Button testID="errand-type-clear" label={t('action.clear')} variant="link" size="small" onPress={clearType}/>:null}
   {filters.status?<Button testID="errand-status-clear" label={t('action.clear')} variant="link" size="small" onPress={clearStatus}/>:null}
  </View>:null}
 </View>;
 return <FeatureScreen embedded={embedded} titleKey="screen.errand.title" showMailbox={false} testID="errand-screen">
  <ErrandFeed key={JSON.stringify(filters)} filters={filters} header={header}/>
 </FeatureScreen>;
}
function ErrandFeed({filters,header}:{filters:Filters;header:React.ReactNode}):React.ReactElement {
 const {t,locale}=useI18n();const theme=useTheme();const router=useRouter();const client=getQueryClient();
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
 // Publishing removes snapshots; mounted feeds must also refresh, not only future mounts.
 React.useEffect(()=>{
  const unsubscribe=client.getQueryCache().subscribe(event=>{
  if(event.type==='removed'&&JSON.stringify(event.query.queryKey)===JSON.stringify(key)){
   generation.current++;pending.current=null;void load('refresh');
  }
  });
  return unsubscribe;
 },[client,key,load]);
 const refresh=()=>void load('refresh'),append=()=>void load('append');
 const [offset,setOffset]=React.useState(0);
 const [scrollTopSignal,setScrollTopSignal]=React.useState(0);
 const onScroll=(value:number)=>{saveScroll(value);setOffset(value);};
 return <View style={{flex:1,minHeight:0}}>
  {rows.length>0&&pagination.errorScope==='refresh'?<Button testID="errand-refresh-retry" label={t('screen.errand.refreshFailed')} onPress={refresh}/>:null}
  <ListScreen key={revision} testID="errand-list" data={[...rows].sort((a,b)=>Number(b.type==='urgent')-Number(a.type==='urgent'))} keyExtractor={r=>String(r.id)} pagination={pagination} listHeader={header} restoredScrollOffset={revision===0?initial.current?.scrollOffset??0:0} onScrollOffset={onScroll} scrollToTopSignal={scrollTopSignal}
   onRefresh={refresh} onEndReached={append} onRetryRefresh={refresh} onRetryAppend={append}
   labels={{retryLabel:t('action.retry'),endLabel: t('screen.list.end'),empty:{kind:'noResult',title:t('screen.errand.empty'),actionLabel:t('action.retry'),onAction:refresh}}}
   renderItem={r=>{const typeKey=typeKeys[r.type as keyof typeof typeKeys]??typeKeys.all;const left=r.status==='open'?errandTimeLeft(r.deadline,Date.now()):null;const deadline=formatErrandDeadline(r.deadline,locale);return <View style={{marginBottom:theme.space('space_3'),paddingHorizontal:theme.space('space_4')}}><EntityCard domain="errand" testID={`errand-row-${r.id}`} title={r.title} subtitle={[r.location,deadline].filter(Boolean).join(' · ')||undefined} badges={<><Badge text={t(typeKey)} tone={r.type==='urgent'?'warning':'neutral'}/><Badge text={t(statusKeys[r.status as 'open'|'taken'|'done'])} tone={r.status==='open'?'success':r.status==='taken'?'brand':'neutral'}/>{left?<Badge text={t(leftKeys[left.unit],{n:left.n})} tone={left.unit==='overdue'?'neutral':'warning'}/>:null}</>} metrics={[`RM ${r.reward.toFixed(2)}`]} style={{alignSelf:'stretch'}} onPress={()=>router.push(`/errand/${r.id}` as never)}/></View>;}}/>
  <FloatingBackToTop visible={offset>480} onPress={()=>setScrollTopSignal(value=>value+1)} label={t('action.backToTop')} testID="errand-back-to-top"/>
 </View>;
}
type Detail=ReturnType<typeof readErrandDetail>;
type Viewer={id:number;role:string};
export function ErrandDetailScreen({published=false,errandId}:{published?:boolean;errandId:string}):React.ReactElement {
 const {t,locale}=useI18n();const theme=useTheme();const router=useRouter();const session=useSession();const toast=useToast();
 const [item,setItem]=React.useState<Detail|null>(null),[viewer,setViewer]=React.useState<Viewer|null>(null),[identityError,setIdentityError]=React.useState(false);
 const [loading,setLoading]=React.useState(true),[error,setError]=React.useState<AppError|null>(null),[busy,setBusy]=React.useState(false),[confirm,setConfirm]=React.useState<'take'|'done'|'delete'|null>(null),[notice,setNotice]=React.useState<'failed'|'login'|'denied'|'conflict'|null>(null);
 const [reportOpen,setReportOpen]=React.useState(false),[reportReason,setReportReason]=React.useState<string|null>(null),[reportDetail,setReportDetail]=React.useState('');
 const epoch=React.useRef(0),lock=React.useRef(false),uncertain=React.useRef(false);
 const report=useReport(item?{id:item.id,type:'errand'}:null,session.isSignedIn,session.handleAuthFailure);
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
 React.useEffect(()=>{setReportOpen(false);setReportReason(null);setReportDetail('');},[errandId]);
 React.useEffect(()=>{if(report.state==='success'){setReportOpen(false);toast.show({message:t('screen.campus.report.success'),tone:'success'});}},[report.state,t,toast]);
 const manages=!!(item&&viewer&&(viewer.id===item.ownerId||viewer.role==='admin'));
 // 发布者/管理员切换状态；其他人认领待接单任务，或放弃自己认领的
 const canTake=!!(item&&viewer&&item.status!=='done'&&(manages||item.status==='open'||viewer.id===item.takerId));
 const canDelete=!!(item&&viewer&&(viewer.id===item.ownerId||viewer.role==='admin'));
 const phone=item?.contactInfo.trim();
 const dialNumber=phone&&/^\+?[\d ()-]{5,24}$/.test(phone)?phone.replace(/[ ()-]/g,''):null;
 const [contactError,setContactError]=React.useState(false);
 const dial=async()=>{if(!dialNumber)return;setContactError(false);try{await Linking.openURL(`tel:${dialNumber}`);}catch{setContactError(true);}};
 const canDone=!!(item&&viewer&&(viewer.id===item.ownerId||viewer.id===item.takerId));
 const action=async(operation:'take'|'done'|'delete')=>{
  setConfirm(null);if(!item||lock.current||uncertain.current)return;
  if(!session.isSignedIn){setNotice('login');return;}if(operation==='take'?!canTake:operation==='delete'?!canDelete:!canDone){setNotice('denied');return;}
  lock.current=true;setBusy(true);setNotice(null);const request=epoch.current;
  try{
   if(operation==='delete'){await deleteErrand(item.id);if(request===epoch.current){getQueryClient().removeQueries({queryKey:['bing-errand','list']});router.replace('/errand' as never);}return;}
   if(operation==='take')await takeErrand(item.id);else await doneErrand(item.id);
   if(request!==epoch.current)return;
   uncertain.current=true;
   const fresh=readErrandDetail(await getErrandDetail(item.id));if(fresh.id!==item.id)throw new Error('Wrong errand');
   if(request===epoch.current){setItem(fresh);uncertain.current=false;}
  }catch(failure){if(request!==epoch.current)return;const rejected=failure as {status?:number;body?:{message?:string}};
   const businessDenied=rejected?.status===403&&['无权限操作','无权限删除','仅发布者或管理员可切换接单状态'].includes(rejected.body?.message??'');
   const auth=businessDenied?'other':classifyAuthFailure(failure);
   if(isSessionInvalid(auth))await session.handleAuthFailure(failure);
   if(request===epoch.current){const status=(failure as {status?:number})?.status;setNotice(isSessionInvalid(auth)?'login':status===403?'denied':status===409?'conflict':'failed');uncertain.current=true;}
  }finally{if(request===epoch.current){lock.current=false;setBusy(false);}}
 };
 const back=()=>published?router.replace('/errand' as never):router.canGoBack()?router.back():router.replace('/errand' as never);
 const reportReasons=['spam','fraud','abuse','nsfw','trolling','privacy','illegal_trade','other'] as const;
 const reportReasonKeys={spam:'screen.campus.report.spam',fraud:'screen.campus.report.fraud',abuse:'screen.campus.report.abuse',nsfw:'screen.campus.report.nsfw',trolling:'screen.campus.report.trolling',privacy:'screen.campus.report.privacy',illegal_trade:'screen.campus.report.illegal_trade',other:'screen.campus.report.other'} as const;
 const reportPanel=<ReportSheet maxDetailLength={1000} visible={reportOpen} reasons={reportReasons.map(value=>({value,label:t(reportReasonKeys[value])}))} reason={reportReason} detail={reportDetail} onReason={setReportReason} onDetail={setReportDetail}
  busy={report.state==='sending'} onSubmit={()=>{if(reportReason)void report.submit(reportReason as ReportReason,reportDetail);}} onCancel={()=>setReportOpen(false)}
  message={['failed','denied','invalid','login'].includes(report.state)?t(report.state==='login'?'screen.errand.login':report.state==='denied'?'screen.errand.denied':'screen.campus.report.failed'):undefined}
  action={report.state==='login'?{label:t('screen.errand.login'),onPress:()=>{setReportOpen(false);router.push('/login');}}:undefined}
  labels={{title:t('screen.campus.read.report'),reason:t('screen.campus.report.reason'),detail:t('screen.campus.report.detail'),submit:t('screen.campus.read.report'),cancel:t('action.cancel')}}/>;
 return <DetailScreen testID="errand-detail" title={item?.title??t('screen.errand.detail')} author={{kind:'named',name:item?.ownerName??t('screen.errand.owner')}} onReport={item&&report.state!=='success'?()=>setReportOpen(true):undefined} interactions={{}} onBack={back} onRetry={()=>void load()} state={loading?'loading':error?.kind==='content'?'empty':error?'error':item?'content':'empty'} error={error}
  empty={{kind:'noResult',title:t('screen.errand.unavailable'),actionLabel:t('screen.errand.back'),onAction:back}}
  body={item?<><View testID="errand-detail-summary" style={{gap:theme.space('space_2')}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text role="title" emphasis="strong" colorToken="text-brand">{`RM ${item.reward.toFixed(2)}`}</Text><Badge text={t(statusKeys[item.status as 'open'|'taken'|'done'])} tone={item.status==='open'?'success':item.status==='taken'?'brand':'neutral'}/></View>{item.location||formatErrandDeadline(item.deadline,locale)?<Surface rounded="radius_large" padding="space_3" style={{gap:theme.space('space_1')}}>{item.location?<Text role="body">{item.location}</Text>:null}{formatErrandDeadline(item.deadline,locale)?<Text role="caption" colorToken="text-secondary">{formatErrandDeadline(item.deadline,locale)}</Text>:null}</Surface>:null}</View><Text role="body">{item.description}</Text>
   <Surface testID="errand-contact-actions" rounded="radius_large" padding="space_3" style={{gap:theme.space('space_2')}}><Text role="caption" colorToken="text-secondary">{t('screen.errand.contact')}</Text>{item.contactInfo?<Text role="headline">{item.contactInfo}</Text>:<Text testID="errand-contact-hidden" role="body" colorToken="text-secondary">{t(session.isSignedIn?'screen.errand.contactAfterTake':'screen.errand.contactSignin')}</Text>}
   {item.contactInfo?<ContactCopy value={item.contactInfo}/>:null}{dialNumber?<Button testID="errand-dial" label={t('screen.errand.dial')} onPress={()=>void dial()}/>:null}
   {contactError?<Text role="body">{t('screen.errand.dialFailed')}</Text>:null}</Surface>
   <View testID="errand-status-actions">{canDelete?<Button testID="errand-delete" disabled={busy||uncertain.current} label={t('screen.errand.delete')} onPress={()=>setConfirm('delete')}/>:null}
   {identityError?<Button label={t('screen.errand.identityFailed')} onPress={()=>void load()}/>:null}
   {canTake?<Button testID="errand-take" disabled={busy||uncertain.current} label={t(item.status==='taken'?'screen.errand.untake':manages?'screen.errand.take':'screen.errand.claim')} onPress={()=>setConfirm('take')}/>:null}
   {canDone?<Button testID="errand-done" disabled={busy||uncertain.current} label={t(item.status==='done'?'screen.errand.undo':'screen.errand.complete')} onPress={()=>setConfirm('done')}/>:null}
   {notice?<><Text role="body">{t(noticeKeys[notice])}</Text><Button testID="errand-detail-refresh" label={t('screen.errand.refresh')} onPress={()=>void load()}/></>:null}</View>
   <AlertDialog testID="errand-confirm" visible={confirm!==null} title={t('screen.errand.detail')} body={t(confirm==='delete'?'screen.errand.deleteConfirm':'screen.errand.confirmBody')} confirmLabel={t('screen.errand.confirm')} cancelLabel={t('action.cancel')} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(confirm)void action(confirm);}}/>{reportPanel}
  </>:null}
  labels={{back:t('action.back'),like:t('screen.campus.read.like'),favorite:t('action.save'),comment:t('screen.campus.read.comments'),report:t('screen.campus.read.report'),countPlaceholder:'—',anonymous:t('screen.campus.read.anonymous'),comments:{anonymous:t('screen.campus.read.anonymous'),deleteLabel:t('screen.campus.read.delete'),replyLabel:t('screen.campus.read.reply'),likeLabel:t('screen.campus.read.like'),moreReplies:n=>String(n),collapse:t('screen.campus.read.collapse')},commentsEnd:t('screen.campus.read.end'),commentsRetry:t('action.retry')}}/>;
}
