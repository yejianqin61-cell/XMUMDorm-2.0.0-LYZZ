import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CanteenMedia } from './CanteenMedia';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import { RankingRow } from '@/components/ui/RankingRow';
import { Text } from '@/components/ui/Text';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { getRankingsHotProducts, getRankingsBusyShops, getRankingsTopShops, getRankingsNewHitProducts, getRankingsActiveUsers } from '../../../../shared/api/rankings';
import { useCanteenResource } from './useCanteenResource';
import { canteenCacheKey, CANTEEN_CACHE_TTL_MS } from './canteen';
import { normalizeRanking, type RankingCategory, type RankingTab } from './canteenRankingModel';

const loaders: Record<RankingCategory, () => Promise<unknown>> = {
  hotProducts: getRankingsHotProducts, busyShops: getRankingsBusyShops, topShops: getRankingsTopShops,
  newProducts: getRankingsNewHitProducts, activeUsers: getRankingsActiveUsers,
};
export function CanteenRankings({ tabs }: { tabs: readonly RankingTab[] }): React.ReactElement | null {
  const [selected, setSelected] = React.useState<RankingCategory>(tabs[0]?.key ?? 'hotProducts');
  const category = tabs.some((tab) => tab.key === selected) ? selected : tabs[0]?.key ?? 'hotProducts';
  const result = useCanteenResource(() => tabs.length ? loaders[category]() : Promise.resolve([]),
    (raw) => normalizeRanking(category, raw), [category, tabs.length], { key: canteenCacheKey('ranking', category), ttlMs: CANTEEN_CACHE_TTL_MS.rankings });
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  if (!tabs.length) return null;
  return <View testID="canteen-ranking" style={{ gap: theme.space('space_2') }}>
    <TopTabStrip tabs={tabs} selectedKey={category} onSelect={(key) => { const tab = tabs.find((item) => item.key === key); if (tab) setSelected(tab.key); }} />
    {result.stale ? <OfflineBanner variant="stale" message={t('canteen.cache.stale')} actionLabel={t('action.refresh')} onAction={result.reload} /> : null}
    {result.loading && result.data === null ? <LoadingState testID="canteen-ranking-loading" /> :
      result.error && result.data === null ? <ErrorState testID="canteen-ranking-error" error={result.error} onAction={result.reload} /> :
      !result.data?.length ? <EmptyState testID="canteen-ranking-empty" kind="noResult" title={t('canteen.search.noResults')} actionLabel={t('action.refresh')} onAction={result.reload} /> :
      result.data.map((row) => row.kind === 'user' ?
        <View key={row.id} testID={`canteen-ranking-user-${row.id}`} style={{ minHeight: theme.touchTarget, padding: theme.space('space_3'), gap: theme.space('space_1') }}>
          <Text role="body" emphasis="strong">{row.rank}. {row.name}</Text>
          <Text role="caption" colorToken="text-secondary">{row.count === null ? t('canteen.valueNone') : t('canteen.reviewCount', { n: row.count })}</Text>
        </View> :
        <RankingRow key={row.id} testID={`canteen-ranking-${row.kind}-${row.id}`} rank={row.rank} title={row.name} leading={<CanteenMedia uri={row.image} name={row.name} />} subtitle={row.subtitle ?? undefined}
          metric={row.score === null ? row.count === null ? t('canteen.scoreNone') : t('canteen.reviewCount', { n: row.count }) : `${t('canteen.score', { score: row.score })}${row.count === null ? '' : ` · ${t('canteen.reviewCount', { n: row.count })}`}`}
          onPress={() => router.push(row.kind === 'product' ? { pathname: '/canteen/product/[id]', params: { id: String(row.id) } } : { pathname: '/canteen/shop/[id]', params: { id: String(row.id) } })} />)}
  </View>;
}
