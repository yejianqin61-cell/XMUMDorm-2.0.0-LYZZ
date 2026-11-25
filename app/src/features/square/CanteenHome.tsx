/** S-07 Canteen, P7 discovery: search, one ranking, areas, random meal and food articles. */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MapPin from 'lucide-react-native/icons/map-pin';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { QuickActionGrid, type QuickAction } from '@/components/ui/QuickActionGrid';
import { FeatureScreen } from '@/components/ui/FeatureScreen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useToast } from '@/components/ui/Toast';
import { getRegions, pickRandomMeal } from '../../../../shared/api/canteen';
import { normalizeRegions, canteenCacheKey, CANTEEN_CACHE_TTL_MS } from './canteen';
import { useCanteenResource } from './useCanteenResource';
import { SearchField } from '@/components/ui/SearchField';
import { FoodArticleFeed } from './FoodArticleFeed';
import { CanteenRankings } from './CanteenRankings';
import { PickResultCard, type PickedMeal } from './PickResultCard';
import type { RankingTab } from './canteenRankingModel';

export function CanteenHome({ embedded = false, rankingTabs = [{ key: 'hotProducts', labelKey: 'canteen.dishes' }] }: { embedded?: boolean; rankingTabs?: readonly RankingTab[] } = {}): React.ReactElement {
  const badge = useMailboxBadge();
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = React.useState('');
  const [picking, setPicking] = React.useState(false);
  const [picked, setPicked] = React.useState<PickedMeal | null>(null);

  const regions = useCanteenResource(getRegions, normalizeRegions, [], { key: canteenCacheKey('regions'), ttlMs: CANTEEN_CACHE_TTL_MS.regions });

  const actions = React.useMemo<readonly QuickAction[]>(
    () =>
      (regions.data ?? []).map((region) => ({
        key: String(region.id),
        label: region.name,
        icon: MapPin,
        onPress: () =>
          router.push({ pathname: '/canteen/region/[id]', params: { id: String(region.id), name: region.name } }),
      })),
    [regions.data, router]
  );

  const pickForMe = async (): Promise<void> => {
    if (picking) return;
    setPicking(true);
    try {
      const data = await pickRandomMeal();
      const id = (data as { id?: unknown } | null)?.id;
      if (typeof id === 'number') {
        const meal = data as { name?: unknown; shop_name?: unknown };
        setPicked({ id, name: typeof meal.name === 'string' && meal.name ? meal.name : t('canteen.pick'), shop: typeof meal.shop_name === 'string' ? meal.shop_name : '' });
      } else {
        setPicked(null);
        // `/pick-random` 在没有可推荐项时也可能给空 → **如实说**，⛔ 不假装跳转
        toast.show({ message: t('canteen.pickEmpty'), tone: 'info' });
      }
    } catch {
      toast.show({ message: t('canteen.pickFailed'), tone: 'danger' });
    } finally {
      setPicking(false);
    }
  };

  return (
    <FeatureScreen embedded={embedded} testID="screen-canteen" titleKey="canteen.title" bottomMode="own" {...badge}>
      <FoodArticleFeed header={<View style={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        <SearchField testID="canteen-home-search" appearance="full" value={query} onChangeText={setQuery} placeholder={t('canteen.search.placeholder')} clearLabel={t('action.clear')} onSubmit={() => router.push({ pathname: '/canteen/search', params: { query: query.trim() } })} />
        <CanteenRankings tabs={rankingTabs} />
        {regions.stale ? <OfflineBanner testID="canteen-stale" variant="stale" message={t('canteen.cache.stale')} actionLabel={t('action.refresh')} onAction={regions.reload} /> : null}
        {regions.loading && regions.data === null ? (
          <LoadingState testID="canteen-loading" />
        ) : regions.error !== null && regions.data === null ? (
          <ErrorState testID="canteen-error" error={regions.error} onAction={regions.reload} />
        ) : actions.length === 0 ? (
          <EmptyState
            testID="canteen-empty"
            kind="noResult"
            title={t('canteen.noRegions')}
            actionLabel={t('action.refresh')}
            onAction={regions.reload}
          />
        ) : (
          <>
            <SectionHeader title={t('canteen.regions')} />
            <QuickActionGrid testID="canteen-regions" actions={actions} />
          </>
        )}

        {/* 「今天吃什么」：内容动作，不是发布入口（⛔ 不新建 `Fab`：组件定义 §2.6 无此 ID） */}
        {picked ? <PickResultCard meal={picked} busy={picking} onAgain={() => { void pickForMe(); }}
          onOpen={() => router.push({ pathname: '/canteen/product/[id]', params: { id: String(picked.id) } })} /> : null}
        <Button
          testID="canteen-pick"
          label={t('canteen.pick')}
          variant="secondary"
          loading={picking}
          onPress={() => {
            void pickForMe();
          }}
        />
      </View>} />
    </FeatureScreen>
  );
}
