import * as React from 'react';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { MarkdownReader } from '@/components/ui/MarkdownReader';
import { DetailScreen } from '@/proto/P3';
import { useI18n } from '@/i18n';
import { getQueryClient } from '@/shared/queryClient';
import { QK } from '../../../../shared/query/queryKeys';
import type { AppError } from '@/i18n/errors';
import { listHandbookArticles, getHandbookArticleDetail } from '../../../../shared/api/handbook';

type Article = { id: number; title: string; summary?: string; content?: string; contentType?: string; externalUrl?: string; authorInfo?: { nickname?: string; username?: string } };
function asArticle(value: unknown): Article {
 if (!value || typeof value !== 'object') throw { kind: 'content' };
 const row = value as Article;
 if (!Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.title !== 'string') throw { kind: 'content' };
 return row;
}
function errorFor(error: unknown): AppError {
 if (error && typeof error === 'object') {
  const e = error as { kind?: AppError['kind']; status?: number; name?: string };
  if (e.kind && ['offline','unreachable','timeout','validation','permission','content','conflict','unknown'].includes(e.kind)) return { kind: e.kind };
  if (e.status === 404) return { kind: 'content' };
  if (e.status === 401 || e.status === 403) return { kind: 'permission' };
  if (e.name === 'AbortError') return { kind: 'timeout' };
  if (error instanceof TypeError) return { kind: 'unreachable' };
 }
 return { kind: 'unknown' };
}

type ListSnapshot = { rows: readonly Article[]; page: number; hasMore: boolean };
const guidesKey = QK.handbookArticles({ pageSize: 10 });
const guidesScope = { primaryTab: 'square', secondaryTab: 'guides' };

/** 数据放入既有 QueryClient；位置和游标仍由公共列表仓库维护。 */
export function GuidesListScreen(): React.ReactElement {
 const { t } = useI18n();
 const router = useRouter();
 const client = getQueryClient();
 const initial = React.useRef(client.getQueryData<ListSnapshot>(guidesKey));
 const snapshot = React.useRef<ListSnapshot>(initial.current ?? { rows: [], page: 0, hasMore: true });
 const [rows, setRows] = React.useState<readonly Article[]>(snapshot.current.rows);
 const [revision, setRevision] = React.useState(0);
 const { pagination, dispatch, restoredScrollOffset, persistScrollOffset, setCursor } = useListPagination({
  scope: guidesScope, initial: { hasMore: snapshot.current.hasMore },
 });
 const generation = React.useRef(0);
 const pending = React.useRef<'refresh' | 'append' | null>(null);
 const load = React.useCallback(async (mode: 'refresh' | 'append') => {
  if (pending.current === 'refresh' || (mode === 'append' && (pending.current || !snapshot.current.hasMore))) return;
  const request = ++generation.current;
  const page = mode === 'refresh' ? 1 : snapshot.current.page + 1;
  pending.current = mode;
  dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
  try {
   const payload = await listHandbookArticles({ page, pageSize: 10 });
   if (request !== generation.current) return;
   if (!Array.isArray(payload?.list) || typeof payload.hasMore !== 'boolean') throw { kind: 'content' };
   const incoming = payload.list.map(asArticle);
   const merged = new Map<number, Article>();
   for (const row of mode === 'refresh' ? [] : snapshot.current.rows) merged.set(row.id, row);
   for (const row of incoming) merged.set(row.id, row);
   const next = { rows: Array.from(merged.values()), page, hasMore: payload.hasMore };
   snapshot.current = next;
   client.setQueryData(guidesKey, next);
   setRows(next.rows);
   setCursor(String(page));
   if (mode === 'refresh') {
    persistScrollOffset(0);
    setRevision(value => value + 1);
   }
   dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore: next.hasMore });
  } catch (error) {
   if (request === generation.current) dispatch({
    type: mode === 'refresh' ? 'refresh:failure' : 'append:failure', error: errorFor(error),
   });
  } finally { if (request === generation.current) pending.current = null; }
 }, [client, dispatch, persistScrollOffset, setCursor]);
 React.useEffect(() => {
  if (!initial.current) void load('refresh');
  return () => { generation.current++; pending.current = null; };
 }, [load]);
 const refresh = () => void load('refresh');
 const append = () => void load('append');
 return <Screen titleKey="square.guides.title" showMailbox={false} testID="guides-screen">
  {rows.length > 0 && pagination.errorScope === 'refresh' ?
   <Button label={t('square.guides.refreshFailed')} onPress={refresh} /> : null}
  <ListScreen key={revision} testID="guides-list" data={rows} keyExtractor={row => String(row.id)} pagination={pagination}
   restoredScrollOffset={revision === 0 && initial.current ? restoredScrollOffset : 0}
   onScrollOffset={persistScrollOffset}
   onRefresh={refresh} onEndReached={append} onRetryRefresh={refresh} onRetryAppend={append}
   labels={{ retryLabel: t('action.retry'), endLabel: t('square.guides.end'),
    empty: { kind: 'noResult', title: t('square.guides.empty'), actionLabel: t('action.retry'), onAction: refresh } }}
   renderItem={row => <ListItem testID={`guide-row-${row.id}`} title={row.title} subtitle={row.summary}
    onPress={() => router.push(`/guides/${row.id}` as never)} />} />
 </Screen>;
}

export function GuideDetailScreen({ articleId }: { articleId: string }): React.ReactElement {
 const { t } = useI18n(); const router = useRouter();
 const [article, setArticle] = React.useState<Article | null>(null);
 const [error, setError] = React.useState<AppError | null>(null);
 const [loading, setLoading] = React.useState(true);
 const generation = React.useRef(0);
 const load = React.useCallback(async () => {
  const request = ++generation.current;
  setArticle(null); setError(null); setLoading(true);
  try {
   if (!/^[1-9]\d*$/.test(articleId) || !Number.isSafeInteger(Number(articleId))) throw { kind: 'content' };
   const row = asArticle(await getHandbookArticleDetail(Number(articleId)));
   if (row.id !== Number(articleId)) throw { kind: 'content' };
   if (row.contentType !== 'markdown' && row.contentType !== 'external_link') throw { kind: 'content' };
   if (row.contentType === 'markdown' && typeof row.content !== 'string') throw { kind: 'content' };
   if (request === generation.current) setArticle(row);
  } catch (failure) { if (request === generation.current) setError(errorFor(failure)); }
  finally { if (request === generation.current) setLoading(false); }
 }, [articleId]);
 React.useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
 const openExternal = async (url: string) => {
  try { const target = new URL(url); if (!['https:', 'http:'].includes(target.protocol)) throw { kind: 'content' }; await Linking.openURL(url); }
  catch (failure) { setError(errorFor(failure)); }
 };
 const back = () => router.canGoBack() ? router.back() : router.replace('/guides' as never);
 return <DetailScreen testID="guide-detail" title={article?.title ?? t('square.guides.title')}
  author={article?.authorInfo ? { kind: 'named', name: article.authorInfo.nickname || article.authorInfo.username || t('square.guides.author') } : { kind: 'anonymous' }}
  interactions={{}} onBack={back} onRetry={() => error?.kind === 'unknown' || error?.kind === 'content' ? back() : void load()} error={error}
  state={loading ? 'loading' : error ? 'error' : article ? 'content' : 'empty'}
  body={article?.contentType === 'markdown' ? <MarkdownReader testID="guide-markdown" content={article.content ?? ''} /> : <Button label={t('action.openInBrowser')} onPress={() => void openExternal(article?.externalUrl ?? '')} />}
  labels={{ back: t('action.back'), like: t('square.guides.like'), favorite: t('action.save'), comment: t('square.guides.comments'), report: t('square.guides.more'), countPlaceholder: '—', anonymous: t('square.guides.author'),
   comments: { anonymous: t('square.guides.author'), deleteLabel: t('square.guides.delete'), replyLabel: t('square.guides.reply'), likeLabel: t('square.guides.like'), moreReplies: n => String(n), collapse: t('square.guides.collapse') }, commentsEnd: t('square.guides.end'), commentsRetry: t('action.retry') }} />;
}
