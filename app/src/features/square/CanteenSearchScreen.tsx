import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { EntityCard } from '@/components/ui/EntityCard';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { toResourceError } from './useCanteenResource';
import { searchCanteen } from '../../../../shared/api/canteen';
import { getUploadUrl } from '../../../../shared/api/config';
import { mergeSearchRows, normalizeSearchPage, validateSearchQuery, type SearchRow, type SearchType } from './canteenSearch';

export function CanteenSearchScreen(): React.ReactElement {
  const badge = useMailboxBadge();
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [type, setType] = React.useState<SearchType>('all');
  const [rows, setRows] = React.useState<readonly SearchRow[]>([]);
  const [problem, setProblem] = React.useState<'empty' | 'tooLong' | null>('empty');
  const { pagination, dispatch } = useListPagination({ initial: { hasMore: false } });
  const queryRef = React.useRef('');
  const typeRef = React.useRef<SearchType>('all');
  const pageRef = React.useRef(1);
  const generation = React.useRef(0);
  const loading = React.useRef(false);
  const hasMore = React.useRef(false);

  React.useEffect(() => () => { generation.current += 1; }, []);
  const load = async (query: string, selected: SearchType, mode: 'refresh' | 'append') => {
    if (mode === 'append' && (loading.current || !hasMore.current)) return;
    const issue = validateSearchQuery(query);
    if (issue) { generation.current += 1; loading.current = false; setRows([]); setProblem(issue); queryRef.current = ''; dispatch({ type: 'refresh:success', hasMore: false }); return; }
    query = query.trim();
    const request = ++generation.current;
    queryRef.current = query; typeRef.current = selected; setProblem(null); loading.current = true;
    if (mode === 'refresh') setRows([]);
    dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
    try {
      const page = mode === 'refresh' ? 1 : pageRef.current + 1;
      const data = normalizeSearchPage(await searchCanteen(query, { type: selected, page, pageSize: 10 }));
      if (data === null) throw { kind: 'unknown' };
      if (generation.current !== request) return;
      pageRef.current = page;
      hasMore.current = selected === 'products' ? data.hasMore.products : selected === 'articles' ? data.hasMore.articles : data.hasMore.products || data.hasMore.articles;
      setRows((previous) => mode === 'refresh' ? data.rows : mergeSearchRows(previous, data.rows));
      dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore: hasMore.current });
    } catch (error) {
      if (generation.current !== request) return;
      dispatch({ type: mode === 'refresh' ? 'refresh:failure' : 'append:failure', error: toResourceError(error) });
    } finally { if (generation.current === request) loading.current = false; }
  };
  const submit = () => void load(input, type, 'refresh');
  const edit = (next: string) => {
    generation.current += 1; loading.current = false; queryRef.current = ''; setInput(next); setRows([]);
    setProblem(validateSearchQuery(next) ?? 'empty'); dispatch({ type: 'refresh:success', hasMore: false });
  };
  return <Screen titleKey="canteen.search.title" testID="screen-canteen-search" bottomMode="own" {...badge}>
    <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_3') }}>
      <SearchField testID="canteen-search-field" appearance="full" value={input} onChangeText={edit} onSubmit={submit} placeholder={t('canteen.search.placeholder')} clearLabel={t('action.clear')} />
      <Button testID="canteen-search-submit" label={t('canteen.search.submit')} onPress={submit} />
      <SegmentedControl testID="canteen-search-type" value={type} options={[{ value: 'all', label: t('canteen.search.all') }, { value: 'products', label: t('canteen.search.products') }, { value: 'articles', label: t('canteen.search.articles') }]}
        onChange={(next) => { const selected = next as SearchType; setType(selected); if (queryRef.current) void load(queryRef.current, selected, 'refresh'); }} />
      <ListScreen testID="canteen-search-list" data={rows} keyExtractor={(row) => `${row.kind}:${row.id}`} pagination={pagination}
        onRefresh={() => void load(queryRef.current || input, typeRef.current, 'refresh')} onEndReached={() => void load(queryRef.current, typeRef.current, 'append')}
        onRetryRefresh={() => void load(queryRef.current, typeRef.current, 'refresh')} onRetryAppend={() => void load(queryRef.current, typeRef.current, 'append')}
        labels={{ empty: { kind: 'noResult', title: t(problem === 'tooLong' ? 'canteen.search.tooLong' : problem === 'empty' ? 'canteen.search.enterQuery' : 'canteen.search.noResults'), description: t('canteen.search.emptyHelp'), actionLabel: t('canteen.search.submit'), onAction: submit }, retryLabel: t('action.retry'), endLabel: t('canteen.search.end') }}
        renderItem={(row) => row.kind === 'product' ? <EntityCard testID={`search-product-${row.id}`} domain="food" title={row.title} subtitle={row.subtitle ?? undefined} mediaUri={row.cover ? getUploadUrl(row.cover) : null} score={row.score} onPress={() => router.push({ pathname: '/canteen/product/[id]', params: { id: String(row.id) } })} /> :
          <Surface testID={`search-article-${row.id}`} padding="space_3" bordered="subtle"><Text role="body" emphasis="strong">{row.title}</Text><Text role="caption" colorToken="text-secondary">{row.subtitle ?? t('canteen.anonymous')}</Text></Surface>} />
    </View>
  </Screen>;
}
