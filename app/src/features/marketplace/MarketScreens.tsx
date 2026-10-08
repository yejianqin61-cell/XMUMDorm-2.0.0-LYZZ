import * as React from 'react';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/ui/Screen';
import {ListScreen,useListPagination} from '@/components/ui/ListScreen';
import {ListItem} from '@/components/ui/ListItem';
import {FilterChips} from '@/components/ui/FilterChips';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {MediaGrid} from '@/components/ui/MediaGrid';
import {DetailScreen} from '@/proto/P3';
import {useI18n} from '@/i18n';
import type {AppError} from '@/i18n/errors';
import {getQueryClient} from '@/shared/queryClient';
import {useSession} from '@/features/auth/session';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';
import {listMarketplaceItems,getMarketplaceItemDetail,toggleMarketplaceWant} from '../../../../shared/api/marketplace';
import {readMarketPage,readMarketDetail,type MarketItem} from './model';
type Filters={category?:string;status?:string;q?:string;priceMin?:number;priceMax?:number};
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
export function MarketListScreen():React.ReactElement {
 const {t}=useI18n();const client=getQueryClient();
 const [filters,setFilters]=React.useState<Filters>(()=>client.getQueryData<Filters>(['bing-market','selected'])??{});
 const [q,setQ]=React.useState(filters.q??''),[min,setMin]=React.useState(filters.priceMin==null?'':String(filters.priceMin)),[max,setMax]=React.useState(filters.priceMax==null?'':String(filters.priceMax));
 const [invalid,setInvalid]=React.useState(false);
 const select=(next:Filters)=>{client.setQueryData(['bing-market','selected'],next);setFilters(next);};
 const apply=()=>{const priceMin=min.trim()===''?undefined:Number(min),priceMax=max.trim()===''?undefined:Number(max);
  if((priceMin!==undefined&&(!Number.isFinite(priceMin)||priceMin<0))||(priceMax!==undefined&&(!Number.isFinite(priceMax)||priceMax<0))||(priceMin!==undefined&&priceMax!==undefined&&priceMin>priceMax)){setInvalid(true);return;}
  setInvalid(false);select({...filters,q:q.trim()||undefined,priceMin,priceMax});
 };
 return <Screen titleKey="screen.market.title" showMailbox={false} testID="market-screen">
  <FilterChips testID="market-categories" options={categories} selected={[filters.category??'all']} onToggle={key=>select({...filters,category:key==='all'?undefined:key})}/>
  <SegmentedControl testID="market-status" value={filters.status??'all'} options={['all','on_sale','sold'].map(value=>({value,label:t(statusKeys[value as keyof typeof statusKeys])}))} onChange={status=>select({...filters,status:status==='all'?undefined:status})}/>
  <Input testID="market-query-input" value={q} onChangeText={setQ} label={t('screen.market.query')} maxLength={80}/>
  <Input testID="market-min-input" value={min} onChangeText={setMin} label={t('screen.market.min')} kind="number"/>
  <Input testID="market-max-input" value={max} onChangeText={setMax} label={t('screen.market.max')} kind="number"/>
  {invalid?<Text role="body">{t('screen.market.priceInvalid')}</Text>:null}
  <Button testID="market-apply" label={t('screen.market.apply')} onPress={apply}/>
  <MarketFeed key={JSON.stringify(filters)} filters={filters}/>
 </Screen>;
}
function MarketFeed({filters}:{filters:Filters}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const client=getQueryClient();
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
 React.useEffect(()=>client.getQueryCache().subscribe(event=>{
  if(event.type==='removed'&&JSON.stringify(event.query.queryKey)===JSON.stringify(key)){
   generation.current++;pending.current=null;void load('refresh');
  }
 }),[client,key,load]);
 const refresh=()=>void load('refresh'),append=()=>void load('append');
 return <>
  {rows.length>0&&pagination.errorScope==='refresh'?<Button label={t('screen.market.refreshFailed')} onPress={refresh}/>:null}
  <ListScreen key={revision} testID="market-list" data={rows} keyExtractor={r=>String(r.id)} pagination={pagination} restoredScrollOffset={revision===0?initial.current?.scrollOffset??0:0} onScrollOffset={saveScroll}
   onRefresh={refresh} onEndReached={append} onRetryRefresh={refresh} onRetryAppend={append}
   labels={{retryLabel:t('action.retry'),endLabel:t('screen.market.end'),empty:{kind:'noResult',title:t('screen.market.empty'),actionLabel:t('action.retry'),onAction:refresh}}}
   renderItem={r=><ListItem testID={`market-row-${r.id}`} title={r.title} subtitle={r.description} meta={`RM ${r.price.toFixed(2)} · ${t(r.status==='sold'?'screen.market.sold':'screen.market.on_sale')}`} onPress={()=>router.push(`/market/${r.id}` as never)}/>}/>
 </>;
}
type Detail=ReturnType<typeof readMarketDetail>;
function safeCount(value:unknown):number|null{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;}
export function MarketDetailScreen({itemId}:{itemId:string}):React.ReactElement {
 const {t}=useI18n();const router=useRouter();const session=useSession();const [item,setItem]=React.useState<Detail|null>(null),[count,setCount]=React.useState<number|null>(null);
 const [loading,setLoading]=React.useState(true),[error,setError]=React.useState<AppError|null>(null),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState<'login'|'denied'|'failed'|null>(null);
 const epoch=React.useRef(0),lock=React.useRef(false),uncertain=React.useRef(false);
 const load=React.useCallback(async()=>{const request=++epoch.current;lock.current=false;setBusy(false);setItem(null);setNotice(null);setError(null);setLoading(true);
  try{if(!/^[1-9]\d*$/.test(itemId)||!Number.isSafeInteger(Number(itemId)))throw {status:404};const raw=await getMarketplaceItemDetail(Number(itemId));const data=readMarketDetail(raw);if(data.id!==Number(itemId))throw {status:404};if(request===epoch.current){setItem(data);setCount(safeCount(raw.wants_count));uncertain.current=false;}}
  catch(failure){if(request===epoch.current)setError(errorFor(failure));}finally{if(request===epoch.current)setLoading(false);}
 },[itemId]);
 React.useEffect(()=>{void load();return()=>{epoch.current++;};},[load]);
 const toggle=async()=>{if(!item||lock.current)return;if(uncertain.current){await load();return;}if(!session.isSignedIn){setNotice('login');return;}if(!item.canWant){setNotice('denied');return;}
  lock.current=true;setBusy(true);setNotice(null);const request=epoch.current;
  try{const data=await toggleMarketplaceWant(item.id);if(request!==epoch.current)return;if(typeof data?.want!=='boolean')throw new Error('Invalid want response');setItem(current=>current?{...current,want:data.want}:null);setCount(safeCount(data.wants_count));
   if(safeCount(data.wants_count)===null){try{const raw=await getMarketplaceItemDetail(item.id);const refreshed=readMarketDetail(raw);if(request===epoch.current&&refreshed.id===item.id){setItem(refreshed);setCount(safeCount(raw.wants_count));}}catch{/* Successful toggle is not repeated if count refresh fails. */}}
  }catch(failure){if(request!==epoch.current)return;uncertain.current=true;const auth=classifyAuthFailure(failure);if(isSessionInvalid(auth))await session.handleAuthFailure(failure);if(request===epoch.current)setNotice(isSessionInvalid(auth)?'login':auth==='sanctioned'?'denied':'failed');}
  finally{if(request===epoch.current){lock.current=false;setBusy(false);}}
 };
 const back=()=>router.canGoBack()?router.back():router.replace('/market' as never);
 return <DetailScreen testID="market-detail" title={item?.title??t('screen.market.detail')} author={{kind:'named',name:item?.sellerName??t('screen.market.seller')}} interactions={{}} onBack={back} onRetry={()=>void load()} state={loading?'loading':error?.kind==='content'?'empty':error?'error':item?'content':'empty'} error={error}
  empty={{kind:'noResult',title:t('screen.market.unavailable'),actionLabel:t('screen.market.back'),onAction:back}}
  hero={item&&item.images.length?<MediaGrid testID="market-media" variant="hero" uris={item.images}/>:undefined}
  body={item?<><Text role="body">{item.description}</Text><Text role="body">{`RM ${item.price.toFixed(2)} · ${t(item.status==='sold'?'screen.market.sold':'screen.market.on_sale')}`}</Text>
   <Button testID="market-want" disabled={busy} label={`${t(item.want?'screen.market.wanted':'screen.market.want')} · ${count??'—'}`} onPress={()=>void toggle()}/>
   {notice==='login'?<Button label={t('screen.market.login')} onPress={()=>router.push('/login')}/>:notice?<Text role="body">{t(notice==='denied'?'screen.market.denied':'screen.market.failed')}</Text>:null}</>:null}
  labels={{back:t('action.back'),like:t('screen.campus.read.like'),favorite:t('action.save'),comment:t('screen.campus.read.comments'),report:t('screen.campus.read.report'),countPlaceholder:'—',anonymous:t('screen.campus.read.anonymous'),comments:{anonymous:t('screen.campus.read.anonymous'),deleteLabel:t('screen.campus.read.delete'),replyLabel:t('screen.campus.read.reply'),likeLabel:t('screen.campus.read.like'),moreReplies:n=>String(n),collapse:t('screen.campus.read.collapse')},commentsEnd:t('screen.campus.read.end'),commentsRetry:t('action.retry')}}/>;
}
