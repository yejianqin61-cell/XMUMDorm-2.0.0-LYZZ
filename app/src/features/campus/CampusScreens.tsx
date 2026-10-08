import {ReportSheet} from '@/components/ui/ReportSheet';
import {useToast} from '@/components/ui/Toast';
import type {CampusReportReason} from './useCampusReport';
import {useCampusActions} from './useCampusActions';
import * as React from 'react';
import {useRouter} from 'expo-router';
import {Button} from '@/components/ui/Button';
import {TopTabStrip} from '@/components/ui/TopTabStrip';
import {getSecondaryTabs} from '@/features/navigation/secondaryTabs';
import {getQueryClient} from '@/shared/queryClient';
import {QK} from '../../../../shared/query/queryKeys';
import {getConfessionWindow,getConfession} from '../../../../shared/api/confessions';
import {Screen, type ScreenProps} from '@/components/ui/Screen';
import {ListScreen, useListPagination} from '@/components/ui/ListScreen';
import {ListItem} from '@/components/ui/ListItem';
import {Text} from '@/components/ui/Text';
import {Pressable} from '@/components/ui/Pressable';
import {SearchHighlight} from './SearchHighlight';
import {MediaGrid} from '@/components/ui/MediaGrid';
import {DetailScreen} from '@/proto/P3';
import {useI18n} from '@/i18n';
import type {AppError} from '@/i18n/errors';
import {getPostList, getPostDetail} from '../../../../shared/api/posts';

type Post={id:number;liked?:boolean;user_liked?:boolean;like_count?:number;comment_count?:number;title?:string|null;content:string;author?:{nickname?:string;username?:string}|null;images?:{url:string}[]};
function asPost(value:unknown):Post {
 if(!value || typeof value!=='object') throw {kind:'content'};
 const row=value as Post & {hidden?:boolean;deleted_at?:unknown;hidden_by_admin?:boolean};
 if(!Number.isSafeInteger(row.id)||row.id<=0||typeof row.content!=='string'||row.hidden||row.deleted_at||row.hidden_by_admin) throw {kind:'content'};
 if(row.title!=null && typeof row.title!=='string') throw {kind:'content'};
 return row;
}
function errorFor(failure:unknown):AppError {
 if(failure && typeof failure==='object') {
  const e=failure as {kind?:AppError['kind'];status?:number;name?:string};
  if(e.kind && ['offline','unreachable','timeout','validation','permission','content','conflict','unknown'].includes(e.kind)) return {kind:e.kind};
  if(e.status===404) return {kind:'content'};
  if(e.status===401||e.status===403) return {kind:'permission'};
  if(e.name==='AbortError') return {kind:'timeout'};
  if(failure instanceof TypeError) return {kind:'unreachable'};
 }
 return {kind:'unknown'};
}

type CampusKind='confession'|'wall';
type Snapshot={rows:readonly Post[];page:number;cursor:number|null;hasMore:boolean;scrollOffset?:number};
function asWall(value:unknown):Post {
 const row=asPost(value);
 // Never retain raw identity, title or images from an anonymous response.
 return {id:row.id,content:row.content,liked:row.liked,like_count:row.like_count,comment_count:row.comment_count};
}
function snapshotKey(kind:CampusKind){
 return [...(kind==='wall'?QK.confessionWindow('_guest'):QK.postsInfinite('_guest',10)), 'campusReadSnapshot'];
}

export function CampusListScreen({initialTab='confession', ...screenProps}:{initialTab?:CampusKind} & Omit<ScreenProps, 'children' | 'titleKey'>={}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const [selected,setSelected]=React.useState<CampusKind>(initialTab);
 React.useEffect(() => setSelected(initialTab), [initialTab]);
 return <Screen titleKey="screen.campus" showMailbox={false} testID="campus-screen" {...screenProps}>
  <TopTabStrip tabs={getSecondaryTabs('campus')} selectedKey={selected} onSelect={key=>{
   if(key!=='confession'&&key!=='wall')return;
   setSelected(key);router.setParams({tab:key});
  }}/>
  {selected==='confession'?<Button label={t('screen.campus.search.title')} onPress={()=>router.push('/campus/search' as never)}/>:null}
  <CampusFeed key={selected} kind={selected}/>
 </Screen>;
}

/** A keyed child owns one fixed scope; switching tabs unmounts its pending requests. */
export function CampusFeed({kind,query}:{kind:CampusKind;query?:string}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const client=getQueryClient();
 const key=React.useMemo(()=>query?[...snapshotKey(kind),'search',query]:snapshotKey(kind),[kind,query]);
 const initial=React.useRef(client.getQueryData<Snapshot>(key));
 const snapshot=React.useRef<Snapshot>(initial.current??{rows:[],page:0,cursor:null,hasMore:true});
 const [rows,setRows]=React.useState(snapshot.current.rows),[revision,setRevision]=React.useState(0);
 const {pagination,dispatch,restoredScrollOffset,persistScrollOffset: persistTabScrollOffset,setCursor}=useListPagination({scope:query?undefined:{primaryTab:'campus',secondaryTab:kind},initial:{hasMore:snapshot.current.hasMore}});
 const persistScrollOffset=React.useCallback((offset:number)=>{
  if(query){snapshot.current={...snapshot.current,scrollOffset:offset};client.setQueryData(key,snapshot.current);}
  else persistTabScrollOffset(offset);
 },[query,client,key,persistTabScrollOffset]);
 const generation=React.useRef(0),pending=React.useRef<'refresh'|'append'|null>(null);
 const load=React.useCallback(async(mode:'refresh'|'append')=>{
  if(pending.current==='refresh'||(mode==='append'&&(pending.current||!snapshot.current.hasMore)))return;
  const request=++generation.current,page=mode==='refresh'?1:snapshot.current.page+1;
  pending.current=mode;dispatch({type:mode==='refresh'?'refresh:start':'append:start'});
  try {
   let incoming:Post[],hasMore:boolean,cursor:number|null=null;
   if(kind==='wall'){
    const data=await getConfessionWindow({cursor:mode==='refresh'?null:snapshot.current.cursor,direction:'older',limit:5});
    if(request!==generation.current)return;
    if(!Array.isArray(data?.items)||typeof data.has_older!=='boolean')throw {kind:'content'};
    incoming=data.items.map(asWall);hasMore=data.has_older;
    cursor=typeof data.oldest_cursor==='number'&&Number.isSafeInteger(data.oldest_cursor)&&data.oldest_cursor>0?data.oldest_cursor:null;
    if(hasMore&&(!Number.isSafeInteger(cursor)||Number(cursor)<=0||cursor===snapshot.current.cursor&&mode==='append'))throw {kind:'content'};
   }else{
    const data=await getPostList({page,pageSize:10,...(query?{q:query}:{})});
    if(request!==generation.current)return;
    if(!Array.isArray(data?.list)||typeof data.hasMore!=='boolean')throw {kind:'content'};
    incoming=data.list.map(asPost);hasMore=data.hasMore;
   }
   const unique=new Map<number,Post>();
   for(const row of mode==='refresh'?[]:snapshot.current.rows)unique.set(row.id,row);
   for(const row of incoming)unique.set(row.id,row);
   const next={rows:Array.from(unique.values()),page,cursor,hasMore,scrollOffset:mode==='refresh'?0:snapshot.current.scrollOffset};snapshot.current=next;
   client.setQueryData(key,next);setRows(next.rows);setCursor(kind==='wall'?cursor==null?null:String(cursor):String(page));
   if(mode==='refresh'){persistScrollOffset(0);setRevision(value=>value+1);}
   dispatch({type:mode==='refresh'?'refresh:success':'append:success',hasMore});
  }catch(error){if(request===generation.current)dispatch({type:mode==='refresh'?'refresh:failure':'append:failure',error:errorFor(error)});}
  finally{if(request===generation.current)pending.current=null;}
 },[kind,query,key,client,dispatch,setCursor,persistScrollOffset]);
 React.useEffect(()=>{if(!initial.current)void load('refresh');return()=>{generation.current++;pending.current=null;};},[load]);
 // Publishing removes snapshots; mounted feeds must also refresh, not only future mounts.
 React.useEffect(()=>client.getQueryCache().subscribe(event=>{
  if(event.type==='removed'&&JSON.stringify(event.query.queryKey)===JSON.stringify(key)){
   generation.current++;pending.current=null;void load('refresh');
  }
 }),[client,key,load]);
 const refresh=()=>void load('refresh'),append=()=>void load('append');
 return <>
  {rows.length>0&&pagination.errorScope==='refresh'?<Button label={t('screen.campus.read.refreshFailed')} onPress={refresh}/>:null}
  <ListScreen key={revision} testID="campus-list" data={rows} keyExtractor={row=>String(row.id)} pagination={pagination}
   restoredScrollOffset={revision===0&&initial.current?(query?initial.current.scrollOffset??0:restoredScrollOffset):0} onScrollOffset={persistScrollOffset}
   onRefresh={refresh} onEndReached={append} onRetryRefresh={refresh} onRetryAppend={append}
   labels={{retryLabel:t('action.retry'),endLabel:t('screen.campus.read.listEnd'),empty:{kind:'noResult',title:t(query?'screen.campus.search.empty':'screen.campus.read.empty'),actionLabel:t('action.retry'),onAction:refresh}}}
   renderItem={row=>query?<Pressable testID={`campus-row-${row.id}`} accessibilityRole="button"
    accessibilityLabel={`${row.title||t('screen.campus.read.post')}: ${row.content}`}
    onPress={()=>router.push(`/campus/${row.id}` as never)}>
    <SearchHighlight value={row.title||t('screen.campus.read.post')} query={query}/>
    <SearchHighlight value={row.content} query={query}/>
   </Pressable>:<ListItem testID={`campus-row-${row.id}`} title={kind==='wall'?t('screen.campus.read.anonymous'):row.title||t('screen.campus.read.post')} subtitle={row.content}
    onPress={()=>router.push((kind==='wall'?`/campus/wall/${row.id}`:`/campus/${row.id}`) as never)}/>}/>
 </>;
}

export function CampusDetailScreen({published=false,postId,kind='confession'}:{published?:boolean;postId:string;kind?:CampusKind}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();
 const [post,setPost]=React.useState<Post|null>(null),[error,setError]=React.useState<AppError|null>(null);
 const [loading,setLoading]=React.useState(true);const generation=React.useRef(0);
 const load=React.useCallback(async()=>{
  const request=++generation.current;setPost(null);setError(null);setLoading(true);
  try {
   if(!/^[1-9]\d*$/.test(postId)||!Number.isSafeInteger(Number(postId)))throw {kind:'content'};
   const row=kind==='wall'?asWall(await getConfession(Number(postId))):asPost(await getPostDetail(Number(postId)));
   if(row.id!==Number(postId))throw {kind:'content'};
   if(request===generation.current)setPost(row);
  }catch(failure){if(request===generation.current)setError(errorFor(failure));}
  finally{if(request===generation.current)setLoading(false);}
 },[postId,kind]);
 React.useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const actions=useCampusActions(post,kind);
 const toast=useToast();
 const [reportOpen,setReportOpen]=React.useState(false),[reportReason,setReportReason]=React.useState<string|null>(null),[reportDetail,setReportDetail]=React.useState('');
 React.useEffect(()=>{setReportOpen(false);setReportReason(null);setReportDetail('');},[postId,kind]);
 React.useEffect(()=>{if(actions.report.state==='success'){setReportOpen(false);toast.show({message:t('screen.campus.report.success'),tone:'success'});}},[actions.report.state,t,toast]);
 const reportReasons=['spam','fraud','abuse','nsfw','trolling','privacy','illegal_trade','other'] as const;
 const reportReasonKeys={spam:'screen.campus.report.spam',fraud:'screen.campus.report.fraud',abuse:'screen.campus.report.abuse',nsfw:'screen.campus.report.nsfw',trolling:'screen.campus.report.trolling',privacy:'screen.campus.report.privacy',illegal_trade:'screen.campus.report.illegal_trade',other:'screen.campus.report.other'} as const;
 const reportPanel=<ReportSheet maxDetailLength={1000} visible={reportOpen} reasons={reportReasons.map(value=>({value,label:t(reportReasonKeys[value])}))} reason={reportReason} detail={reportDetail} onReason={setReportReason} onDetail={setReportDetail}
  busy={actions.report.state==='sending'} onSubmit={()=>{if(reportReason)void actions.report.submit(reportReason as CampusReportReason,reportDetail);}} onCancel={()=>setReportOpen(false)}
  message={['failed','denied','invalid','login'].includes(actions.report.state)?t(actions.report.state==='login'?'screen.campus.write.login':actions.report.state==='denied'?'screen.campus.write.denied':'screen.campus.report.failed'):undefined}
  action={actions.report.state==='login'?{label:t('screen.campus.write.login'),onPress:()=>{setReportOpen(false);router.push('/login');}}:undefined}
  labels={{title:t('screen.campus.read.report'),reason:t('screen.campus.report.reason'),detail:t('screen.campus.report.detail'),submit:t('screen.campus.read.report'),cancel:t('action.cancel')}}/>;
 const back=()=>published?router.replace('/(tabs)/campus' as never):router.canGoBack()?router.back():router.replace((kind==='wall'?'/campus?tab=wall':'/campus') as never);
 const images=Array.isArray(post?.images)?post.images.filter(image=>image&&typeof image.url==='string').map(image=>image.url):[];
 return <DetailScreen testID="campus-detail" title={kind==='wall'?t('screen.campus.read.wallTitle'):post?.title||t('screen.campus.read.title')}
  author={post?.author ? {kind:'named',name:post.author.nickname||post.author.username||t('screen.campus.read.author')} : {kind:'anonymous'}}
  onReport={post&&actions.report.state!=='success'?()=>setReportOpen(true):undefined} interactions={actions.interactions} onToggleLike={post?actions.onToggleLike:undefined} comments={post?actions.comments:undefined} state={loading?'loading':error?.kind==='content'?'empty':error?'error':post?'content':'empty'} error={error}
  empty={{kind:'noResult',title:t('screen.campus.read.unavailable'),actionLabel:t('screen.campus.read.backToList'),onAction:back}}
  onBack={back} onRetry={()=>error?.kind==='content'?back():void load()}
  hero={images.length>0?<MediaGrid testID="campus-media" uris={images} variant="hero"/>:undefined}
  body={<><Text role="body">{post?.content}</Text>{post?actions.body:null}{reportPanel}</>}
  labels={{back:t('action.back'),like:t('screen.campus.read.like'),favorite:t('action.save'),comment:t('screen.campus.read.comments'),report:t('screen.campus.read.report'),countPlaceholder:'—',anonymous:t('screen.campus.read.anonymous'),
   comments:{anonymous:t('screen.campus.read.anonymous'),deleteLabel:t('screen.campus.read.delete'),replyLabel:t('screen.campus.read.reply'),likeLabel:t('screen.campus.read.like'),moreReplies:n=>String(n),collapse:t('screen.campus.read.collapse')},commentsEnd:t('screen.campus.read.end'),commentsRetry:t('action.retry')}}/>;
}
