import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { EntityCard } from '@/components/ui/EntityCard';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { getFoodArticles } from '../../../../shared/api/canteen';
import { getUploadUrl } from '../../../../shared/api/config';
import { canteenRevision, requestCanteen, subscribeCanteen } from './canteenCache';
import { normalizeFoodArticlePage, mergeFoodArticles, type FoodArticle } from './foodArticles';
import { toResourceError } from './useCanteenResource';

export function FoodArticleFeed({ header }: { header?: React.ReactNode }): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = React.useState<readonly FoodArticle[]>([]);
  const { pagination, dispatch } = useListPagination({ initial: { hasMore: false } });
  const cursor = React.useRef(0);
  const generation = React.useRef(0);
  const busy = React.useRef(false);
  const hasMore = React.useRef(false);
  const load = React.useCallback(async (mode: 'refresh' | 'append') => {
    if (mode === 'append' && (busy.current || !hasMore.current)) return;
    const request = ++generation.current;
    const revision = canteenRevision();
    const active = () => request === generation.current && revision === canteenRevision();
    busy.current = true;
    dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
    try {
      const page = mode === 'refresh' ? 1 : cursor.current + 1;
      const result = normalizeFoodArticlePage(await requestCanteen(`canteen:articles:${page}`, () => getFoodArticles({ page, pageSize: 10 })));
      if (!active()) return;
      if (!result) throw { kind: 'unknown' };
      cursor.current = page; hasMore.current = result.hasMore;
      setRows((previous) => mode === 'refresh' ? result.rows : mergeFoodArticles(previous, result.rows));
      dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore: result.hasMore });
    } catch (error) {
      if (active()) dispatch({ type: mode === 'refresh' ? 'refresh:failure' : 'append:failure', error: toResourceError(error) });
    } finally { if (active()) busy.current = false; }
  }, [dispatch]);
  React.useEffect(() => {
    void load('refresh');
    const unsubscribe = subscribeCanteen(() => { generation.current += 1; busy.current = false; void load('refresh'); });
    return () => { generation.current += 1; unsubscribe(); };
  }, [load]);
  const list = <ListScreen<FoodArticle> testID="food-articles" data={rows} keyExtractor={(row) => String(row.id)} pagination={pagination}
      listHeader={header} onRefresh={() => void load('refresh')} onEndReached={() => void load('append')}
      onRetryRefresh={() => void load('refresh')} onRetryAppend={() => void load('append')}
      labels={{ empty: { kind: 'noResult', title: t('screen.campus.read.empty'), actionLabel: t('action.refresh'), onAction: () => void load('refresh') }, retryLabel: t('action.retry'), endLabel: t('screen.list.end') }}
      renderItem={(row) => <EntityCard testID={`food-article-${row.id}`} domain="post" title={row.title} authorLabel={row.author ?? t('canteen.anonymous')}
        mediaUri={row.cover ? getUploadUrl(row.cover) : null} onPress={() => router.push({ pathname: '/campus/[id]', params: { id: String(row.id) } })} />}
    />;
  return <View style={{ flex: 1 }}>
    {rows.length ? list : <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{list}</ScrollView>}
    {pagination.hasMore ? <Button testID="food-articles-more" label={t('canteen.loadMore')} variant="secondary" loading={pagination.append === 'loading'} onPress={() => void load('append')} /> : null}
  </View>;
}
