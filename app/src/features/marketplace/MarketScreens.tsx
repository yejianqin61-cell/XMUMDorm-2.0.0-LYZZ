import { FeatureScreen } from '@/components/ui/FeatureScreen';
import * as React from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {ListScreen,useListPagination} from '@/components/ui/ListScreen';
import {GridCard} from '@/components/ui/GridCard';
import {FloatingBackToTop} from '@/components/ui/FloatingBackToTop';
import {UnderlineFilter} from '@/components/ui/UnderlineFilter';
import {Badge} from '@/components/ui/Badge';
import {SearchField} from '@/components/ui/SearchField';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {MediaGrid} from '@/components/ui/MediaGrid';
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
import {listMarketplaceItems,getMarketplaceItemDetail,toggleMarketplaceWant,updateMarketplaceItemStatus} from '../../../../shared/api/marketplace';
import {readMarketPage,readMarketDetail,type MarketItem} from './model';
type Filters={category?:string;status?:string;q?:string};
type Snapshot={rows:readonly MarketItem[];page:number;hasMore:boolean;scrollOffset:number};
function errorFor(error:unknown):AppError {
 const e=error as {status?:number;name?:string}|null;
 if(e?.status===404)return {kind:'content'};
 if(e?.status===401||e?.status===403)return {kind:'permission'};
 if(e?.name==='AbortError')return {kind:'timeout'};
 return {kind:error instanceof TypeError?'unreachable':'unknown'};
}
const categories=[{key:'all',labelKey:'screen.market.all'},{key:'electronics',labelKey:'screen.market.electronics'},{key:'transport',labelKey:'screen.market.transport'},{key:'dailyuse',labelKey:'screen.market.dailyuse'},{key:'books',labelKey:'screen.market.books'},{key:'others',labelKey:'screen.market.others'}] as const;
const statusKeys={all:'screen.market.all',on_sale:'screen.market.on_sale',sold:'screen.market.sold'} as const;
export function MarketListScreen({ embedded = false }: { embedded?: boolean } = {}):React.ReactElement {
 const {t}=useI18n();const client=getQueryClient();const theme=useTheme();
 const [filters,setFilters]=React.useState<Filters>(()=>client.getQueryData<Filters>(['bing-market','selected'])??{});
 const [q,setQ]=React.useState(filters.q??'');
 const select=(next:Filters)=>{client.setQueryData(['bing-market','selected'],next);setFilters(next);};
 const applyQuery=React.useCallback(()=>{const next=q.trim();select({...filters,q:next===''?undefined:next});},[filters,q]);
 const clearFilters=()=>{setQ('');client.removeQueries({queryKey:['bing-market','list',{}]});select({});};
 const hasAppliedFilters=Object.values(filters).some(value=>value!==undefined&&value!=='');
 // 2026-10-18 所有者裁决：搜索与两行筛选**随内容滚走**（放进 ListScreen 的 listHeader），
 // ⛔ 不再固定在顶部吃掉半屏；价格筛选整块删除；分区标题文字也不要了。
 // 第五轮：列表改成**双列瀑布流**，所以头部左右内边距与网格首列对齐（space_4）。
 const header=<View testID="market-filters" style={{paddingTop:theme.space('space_2'),paddingBottom:theme.space('space_3'),gap:theme.space('space_2')}}>
  <View style={{paddingHorizontal:theme.space('space_4')}}>
   <SearchField testID="market-search-field" appearance="full" value={q} onChangeText={setQ} onSubmit={applyQuery} placeholder={t('screen.market.query')}/>
  </View>
  {/* 分类 / 状态：下划线式筛选（⛔ 不用圆角按钮冒充 Tab，也不再加分区标题） */}
  <UnderlineFilter testID="market-category" options={categories} selectedKey={filters.category??'all'} onSelect={key=>select({...filters,category:key==='all'?undefined:key})}/>
  <UnderlineFilter testID="market-status" options={['all','on_sale','sold'].map(key=>({key,labelKey:statusKeys[key as keyof typeof statusKeys]}))} selectedKey={filters.status??'all'} onSelect={status=>select({...filters,status:status==='all'?undefined:status})}/>
  {hasAppliedFilters?<View style={{paddingHorizontal:theme.space('space_4')}}><Button testID="market-filter-clear" label={t('action.clear')} variant="link" size="small" onPress={clearFilters}/></View>:null}
 </View>;
 return <FeatureScreen embedded={embedded} titleKey="screen.market.title" showMailbox={false} testID="market-screen">
  <MarketFeed key={JSON.stringify(filters)} filters={filters} header={header}/>
 </FeatureScreen>;
}
function MarketFeed({filters,header}:{filters:Filters;header:React.ReactNode}):React.ReactElement {
 const {t}=useI18n();const theme=useTheme();const router=useRouter();const client=getQueryClient();
 const key=React.useMemo(()=>['bing-market','list',filters] as const,[filters]);
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
  try{const data=readMarketPage(await listMarketplaceItems({page,pageSize:10,...filters}));if(request!==generation.current)return;
   const unique=new Map<number,MarketItem>();for(const row of mode==='refresh'?[]:snapshot.current.rows)unique.set(row.id,row);for(const row of data.rows)unique.set(row.id,row);
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
 // 2026-10-18 第五轮：**双列瀑布流**（所有者：一页商品不能太少，卡片不能太大）。
 // 卡片信息只留「图 / 标题 / 分类（左下）/ 价格（右下）」；卖家与描述只在详情页出现。
 const categoryLabel=(category?:string)=>category?t(categories.find(option=>option.key===category)?.labelKey??'screen.market.all'):undefined;
 return <View style={{flex:1,minHeight:0}}>
  {rows.length>0&&pagination.errorScope==='refresh'?<Button testID="market-refresh-retry" label={t('screen.market.refreshFailed')} onPress={refresh}/>:null}
  <ListScreen key={revision} testID="market-list" data={rows} keyExtractor={r=>String(r.id)} numColumns={2} pagination={pagination} listHeader={header} restoredScrollOffset={revision===0?initial.current?.scrollOffset??0:0} onScrollOffset={onScroll} scrollToTopSignal={scrollTopSignal}
   onRefresh={refresh} onEndReached={append} onRetryRefresh={refresh} onRetryAppend={append}
   labels={{retryLabel:t('action.retry'),endLabel:t('screen.market.end'),empty:{kind:'noResult',title:t('screen.market.empty'),actionLabel:t('action.retry'),onAction:refresh}}}
   renderItem={(r,index)=><View testID={`market-cell-${r.id}`} style={{marginBottom:theme.space('space_3'),paddingLeft:index%2===0?theme.space('space_4'):theme.space('space_2'),paddingRight:index%2===0?theme.space('space_2'):theme.space('space_4')}}>
    <GridCard testID={`market-row-${r.id}`} title={r.title} mediaUri={r.cover} meta={categoryLabel(r.category)} highlight={`RM ${r.price.toFixed(2)}`}
     badge={r.status==='sold'?<Badge text={t('screen.market.sold')} tone="neutral"/>:undefined}
     onPress={()=>router.push(`/market/${r.id}` as never)}/>
   </View>}/>
  <FloatingBackToTop visible={offset>480} onPress={()=>setScrollTopSignal(value=>value+1)} label={t('action.backToTop')} testID="market-back-to-top"/>
 </View>;
}
type Detail=ReturnType<typeof readMarketDetail>;
function safeCount(value:unknown):number|null{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;}
export function MarketDetailScreen({published=false,itemId}:{published?:boolean;itemId:string}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const session=useSession();const toast=useToast();const [item,setItem]=React.useState<Detail|null>(null),[count,setCount]=React.useState<number|null>(null);
 const [loading,setLoading]=React.useState(true),[error,setError]=React.useState<AppError|null>(null),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState<'login'|'denied'|'failed'|null>(null);
 const [reportOpen,setReportOpen]=React.useState(false),[reportReason,setReportReason]=React.useState<string|null>(null),[reportDetail,setReportDetail]=React.useState('');
 const epoch=React.useRef(0),lock=React.useRef(false),uncertain=React.useRef(false);
 const report=useReport(item?{id:item.id,type:'marketplace'}:null,session.isSignedIn,session.handleAuthFailure);
 const load=React.useCallback(async()=>{const request=++epoch.current;lock.current=false;setBusy(false);setItem(null);setNotice(null);setError(null);setLoading(true);
  try{if(!/^[1-9]\d*$/.test(itemId)||!Number.isSafeInteger(Number(itemId)))throw {status:404};const raw=await getMarketplaceItemDetail(Number(itemId));const data=readMarketDetail(raw);if(data.id!==Number(itemId))throw {status:404};if(request===epoch.current){setItem(data);setCount(safeCount(raw.wants_count));uncertain.current=false;}}
  catch(failure){if(request===epoch.current)setError(errorFor(failure));}finally{if(request===epoch.current)setLoading(false);}
 },[itemId]);
 React.useEffect(()=>{void load();return()=>{epoch.current++;};},[load]);
 React.useEffect(()=>{setReportOpen(false);setReportReason(null);setReportDetail('');},[itemId]);
 React.useEffect(()=>{if(report.state==='success'){setReportOpen(false);toast.show({message:t('screen.campus.report.success'),tone:'success'});}},[report.state,t,toast]);
 const toggle=async()=>{if(!item||lock.current)return;if(uncertain.current){await load();return;}if(!session.isSignedIn){setNotice('login');return;}if(!item.canWant){setNotice('denied');return;}
  lock.current=true;setBusy(true);setNotice(null);const request=epoch.current;
  try{const data=await toggleMarketplaceWant(item.id);if(request!==epoch.current)return;if(typeof data?.want!=='boolean')throw new Error('Invalid want response');setItem(current=>current?{...current,want:data.want}:null);setCount(safeCount(data.wants_count));
   if(safeCount(data.wants_count)===null){try{const raw=await getMarketplaceItemDetail(item.id);const refreshed=readMarketDetail(raw);if(request===epoch.current&&refreshed.id===item.id){setItem(refreshed);setCount(safeCount(raw.wants_count));}}catch{/* Successful toggle is not repeated if count refresh fails. */}}
  }catch(failure){if(request!==epoch.current)return;uncertain.current=true;const auth=classifyAuthFailure(failure);if(isSessionInvalid(auth))await session.handleAuthFailure(failure);if(request===epoch.current)setNotice(isSessionInvalid(auth)?'login':auth==='sanctioned'?'denied':'failed');}
  finally{if(request===epoch.current){lock.current=false;setBusy(false);}}
 };
 const back=()=>published?router.replace('/market' as never):router.canGoBack()?router.back():router.replace('/market' as never);
 // 阶段B-04（丁 A-5）：只有卖家且服务端允许时才能标记已售；成功后刷详情并失效列表缓存
 const markSold=async()=>{if(!item||!item.canMarkSold||lock.current)return;lock.current=true;setBusy(true);setNotice(null);const request=epoch.current;
  try{await updateMarketplaceItemStatus(item.id,'sold');if(request!==epoch.current)return;getQueryClient().removeQueries({queryKey:['bing-market','list']});await load();}
  catch(failure){if(request!==epoch.current)return;const auth=classifyAuthFailure(failure);if(isSessionInvalid(auth))await session.handleAuthFailure(failure);if(request===epoch.current)setNotice(isSessionInvalid(auth)?'login':auth==='sanctioned'?'denied':'failed');}
  finally{if(request===epoch.current){lock.current=false;setBusy(false);}}
 };
 const reportReasons=['spam','fraud','abuse','nsfw','trolling','privacy','illegal_trade','other'] as const;
 const reportReasonKeys={spam:'screen.campus.report.spam',fraud:'screen.campus.report.fraud',abuse:'screen.campus.report.abuse',nsfw:'screen.campus.report.nsfw',trolling:'screen.campus.report.trolling',privacy:'screen.campus.report.privacy',illegal_trade:'screen.campus.report.illegal_trade',other:'screen.campus.report.other'} as const;
 const reportPanel=<ReportSheet maxDetailLength={1000} visible={reportOpen} reasons={reportReasons.map(value=>({value,label:t(reportReasonKeys[value])}))} reason={reportReason} detail={reportDetail} onReason={setReportReason} onDetail={setReportDetail}
  busy={report.state==='sending'} onSubmit={()=>{if(reportReason)void report.submit(reportReason as ReportReason,reportDetail);}} onCancel={()=>setReportOpen(false)}
  message={['failed','denied','invalid','login'].includes(report.state)?t(report.state==='login'?'screen.market.login':report.state==='denied'?'screen.market.denied':'screen.campus.report.failed'):undefined}
  action={report.state==='login'?{label:t('screen.market.login'),onPress:()=>{setReportOpen(false);router.push('/login');}}:undefined}
  labels={{title:t('screen.campus.read.report'),reason:t('screen.campus.report.reason'),detail:t('screen.campus.report.detail'),submit:t('screen.campus.read.report'),cancel:t('action.cancel')}}/>;
 return <DetailScreen testID="market-detail" title={item?.title??t('screen.market.detail')} author={{kind:'named',name:item?.sellerName??t('screen.market.seller')}} onReport={item&&report.state!=='success'?()=>setReportOpen(true):undefined} interactions={{}} onBack={back} onRetry={()=>void load()} state={loading?'loading':error?.kind==='content'?'empty':error?'error':item?'content':'empty'} error={error}
  empty={{kind:'noResult',title:t('screen.market.unavailable'),actionLabel:t('screen.market.back'),onAction:back}}
  hero={item&&item.images.length?<MediaGrid testID="market-media" variant="hero" uris={item.images} alt={item.images.map(()=>item.title)}/>:undefined}
  body={item?<><View testID="market-detail-summary"><Text role="headline" emphasis="strong">{`RM ${item.price.toFixed(2)}`}</Text><Text role="label" colorToken="text-secondary">{t(item.status==='sold'?'screen.market.sold':'screen.market.on_sale')}</Text></View><Text role="body">{item.description}</Text>
   <View testID="market-transaction-actions"><Button testID="market-want" disabled={busy} label={`${t(item.want?'screen.market.wanted':'screen.market.want')} · ${count??'—'}`} onPress={()=>void toggle()}/>
   {item.canMarkSold?<Button testID="market-mark-sold" disabled={busy} label={t('screen.market.markSold')} onPress={()=>void markSold()}/>:null}
   {item.canEdit?<Button testID="market-edit" disabled={busy} label={t('screen.market.edit')} onPress={()=>router.push(`/market/${item.id}/edit` as never)}/>:null}
   {notice==='login'?<Button label={t('screen.market.login')} onPress={()=>router.push('/login')}/>:notice?<Text role="body">{t(notice==='denied'?'screen.market.denied':'screen.market.failed')}</Text>:null}</View>{reportPanel}</>:null}
  labels={{back:t('action.back'),like:t('screen.campus.read.like'),favorite:t('action.save'),comment:t('screen.campus.read.comments'),report:t('screen.campus.read.report'),countPlaceholder:'—',anonymous:t('screen.campus.read.anonymous'),comments:{anonymous:t('screen.campus.read.anonymous'),deleteLabel:t('screen.campus.read.delete'),replyLabel:t('screen.campus.read.reply'),likeLabel:t('screen.campus.read.like'),moreReplies:n=>String(n),collapse:t('screen.campus.read.collapse')},commentsEnd:t('screen.campus.read.end'),commentsRetry:t('action.retry')}}/>;
}
