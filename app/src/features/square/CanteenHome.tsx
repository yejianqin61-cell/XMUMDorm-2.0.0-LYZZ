/**
 * `S-07` 食堂首页 / Canteen（父 `S-01`，原型 `P7`）
 *
 * 页面清单给的接口是 `/regions`、`/banners`、`/pick-random`、`/rankings/*`，
 * 组件是 `BannerSlot` `QuickActionGrid` `SectionHeader` `RankingRow` `Fab`（今天吃什么）。
 *
 * ⚠️ **本轮交付范围**（如实登记，见 P1-17 §3）：
 *   ✅ 区域网格（`QuickActionGrid` → `S-08`）
 *   ✅ 「今天吃什么」（`/pick-random` → 随机跳一个菜品详情）
 *   ⛔ **`/banners` 与 `/rankings/*` 未做**：广告位要先把 6 种 `link_type` 的目标解析
 *      （含 https-only 规则）做出来，而那是**广告模块**的既有逻辑（`S-02`/`S-03`）——
 *      在这里再实现一遍就是"同语义两层"（9.14-①）。榜单同理（4 个 `/rankings/*` 接口）。
 *
 * ⛔ 页面清单里 `S-07` 的 `Fab`（今天吃什么）**不是发布入口**：宪法第三轮裁决只禁
 *    "第二个**发布**入口"，而"今天吃什么"是内容动作 → 用普通按钮实现，
 *    ⛔ 不新建 `Fab` 组件（组件定义 §2.6 里没有它）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MapPin from 'lucide-react-native/icons/map-pin';
import Shuffle from 'lucide-react-native/icons/shuffle';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { QuickActionGrid, type QuickAction } from '@/components/ui/QuickActionGrid';
import { Screen } from '@/components/ui/Screen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useToast } from '@/components/ui/Toast';
import { getRegions, pickRandomMeal } from '../../../../shared/api/canteen';
import { normalizeRegions, canteenCacheKey, CANTEEN_CACHE_TTL_MS } from './canteen';
import { useCanteenResource } from './useCanteenResource';

export function CanteenHome(): React.ReactElement {
  const badge = useMailboxBadge();
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [picking, setPicking] = React.useState(false);

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
        router.push({ pathname: '/canteen/product/[id]', params: { id: String(id) } });
      } else {
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
    <Screen testID="screen-canteen" titleKey="canteen.title" bottomMode="own" {...badge}>
      <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        <Button testID="canteen-search-entry" label={t('canteen.search.title')} variant="secondary" onPress={() => router.push('/canteen/search')} />
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
        <Button
          testID="canteen-pick"
          label={t('canteen.pick')}
          variant="secondary"
          loading={picking}
          onPress={() => {
            void pickForMe();
          }}
        />
      </View>
    </Screen>
  );
}
