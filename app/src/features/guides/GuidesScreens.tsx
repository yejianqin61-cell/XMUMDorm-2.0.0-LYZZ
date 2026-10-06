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

/** 首项只接通第一页；追加与刷新完整状态在指南任务 02 验收。 */
export function GuidesListScreen(): React.ReactElement {
 const { t } = useI18n(); const router = useRouter();
 const [rows, setRows] = React.useState<readonly Article[]>([]);
 const { pagination, dispatch } = useListPagination();
 const generation = React.useRef(0);
 const load = React.useCallback(async () => {
  const request = ++generation.current;
  dispatch({ type: 'refresh:start' });
  try {
   const payload = await listHandbookArticles({ page: 1, pageSize: 10 });
   if (request !== generation.current) return;
   if (!Array.isArray(payload?.list)) throw { kind: 'content' };
   setRows(payload.list.map(asArticle));
   dispatch({ type: 'refresh:success', hasMore: false });
  } catch (error) {
   if (request === generation.current) dispatch({ type: 'refresh:failure', error: errorFor(error) });
  }
 }, [dispatch]);
 React.useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
 return <Screen titleKey="square.guides.title" showMailbox={false} testID="guides-screen">
  <ListScreen testID="guides-list" data={rows} keyExtractor={row => String(row.id)} pagination={pagination}
   onRefresh={() => void load()} onEndReached={() => undefined} onRetryRefresh={() => void load()}
   labels={{ empty: { kind: 'noResult', title: t('square.guides.empty'), actionLabel: t('action.retry'), onAction: () => void load() } }}
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
