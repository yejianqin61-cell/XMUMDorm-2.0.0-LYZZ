import * as React from 'react';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/ui/Screen';
import {ListScreen, useListPagination} from '@/components/ui/ListScreen';
import {ListItem} from '@/components/ui/ListItem';
import {Text} from '@/components/ui/Text';
import {MediaGrid} from '@/components/ui/MediaGrid';
import {DetailScreen} from '@/proto/P3';
import {useI18n} from '@/i18n';
import type {AppError} from '@/i18n/errors';
import {getPostList, getPostDetail} from '../../../../shared/api/posts';

type Post={id:number;title?:string|null;content:string;author?:{nickname?:string;username?:string}|null;images?:{url:string}[]};
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

/** 首项只接阅读；两栏分页和缓存在下一项使用既有公开接缝。 */
export function CampusListScreen():React.ReactElement {
 const {t}=useI18n();const router=useRouter();
 const [rows,setRows]=React.useState<readonly Post[]>([]);
 const {pagination,dispatch}=useListPagination();
 const generation=React.useRef(0);
 const load=React.useCallback(async()=>{
  const request=++generation.current;dispatch({type:'refresh:start'});
  try {
   const payload=await getPostList({page:1,pageSize:10});
   if(request!==generation.current)return;
   if(!Array.isArray(payload?.list)||typeof payload.hasMore!=='boolean')throw {kind:'content'};
   const unique=new Map<number,Post>();for(const row of payload.list.map(asPost))unique.set(row.id,row);
   setRows(Array.from(unique.values()));dispatch({type:'refresh:success',hasMore:false});
  }catch(error){if(request===generation.current)dispatch({type:'refresh:failure',error:errorFor(error)});}
 },[dispatch]);
 React.useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const refresh=()=>void load();
 return <Screen titleKey="screen.campus" showMailbox={false} testID="campus-screen">
  <ListScreen testID="campus-list" data={rows} keyExtractor={row=>String(row.id)} pagination={pagination}
   onRefresh={refresh} onEndReached={()=>undefined} onRetryRefresh={refresh} onRetryAppend={refresh}
   labels={{retryLabel:t('action.retry'),endLabel:t('screen.campus.read.firstPage'),empty:{kind:'noResult',title:t('screen.campus.read.empty'),actionLabel:t('action.retry'),onAction:refresh}}}
   renderItem={row=><ListItem testID={`campus-row-${row.id}`} title={row.title||t('screen.campus.read.title')} subtitle={row.content}
    onPress={()=>router.push(`/campus/${row.id}` as never)}/>}/>
 </Screen>;
}

export function CampusDetailScreen({postId}:{postId:string}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();
 const [post,setPost]=React.useState<Post|null>(null),[error,setError]=React.useState<AppError|null>(null);
 const [loading,setLoading]=React.useState(true);const generation=React.useRef(0);
 const load=React.useCallback(async()=>{
  const request=++generation.current;setPost(null);setError(null);setLoading(true);
  try {
   if(!/^[1-9]\d*$/.test(postId)||!Number.isSafeInteger(Number(postId)))throw {kind:'content'};
   const row=asPost(await getPostDetail(Number(postId)));
   if(row.id!==Number(postId))throw {kind:'content'};
   if(request===generation.current)setPost(row);
  }catch(failure){if(request===generation.current)setError(errorFor(failure));}
  finally{if(request===generation.current)setLoading(false);}
 },[postId]);
 React.useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const back=()=>router.canGoBack()?router.back():router.replace('/campus' as never);
 const images=Array.isArray(post?.images)?post.images.filter(image=>image&&typeof image.url==='string').map(image=>image.url):[];
 return <DetailScreen testID="campus-detail" title={post?.title||t('screen.campus.read.title')}
  author={post?.author ? {kind:'named',name:post.author.nickname||post.author.username||t('screen.campus.read.author')} : {kind:'anonymous'}}
  interactions={{}} state={loading?'loading':error?'error':post?'content':'empty'} error={error}
  onBack={back} onRetry={()=>error?.kind==='content'?back():void load()}
  hero={images.length>0?<MediaGrid testID="campus-media" uris={images} variant="hero"/>:undefined}
  body={<Text role="body">{post?.content}</Text>}
  labels={{back:t('action.back'),like:t('screen.campus.read.like'),favorite:t('action.save'),comment:t('screen.campus.read.comments'),report:t('screen.campus.read.report'),countPlaceholder:'—',anonymous:t('screen.campus.read.anonymous'),
   comments:{anonymous:t('screen.campus.read.anonymous'),deleteLabel:t('screen.campus.read.delete'),replyLabel:t('screen.campus.read.reply'),likeLabel:t('screen.campus.read.like'),moreReplies:n=>String(n),collapse:t('screen.campus.read.collapse')},commentsEnd:t('screen.campus.read.end'),commentsRetry:t('action.retry')}}/>;
}
