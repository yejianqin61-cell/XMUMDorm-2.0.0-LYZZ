/**
 * `S-08` 区域店铺 / Shops in Area（父 `S-07`，原型 `P2`）
 *
 * 页面清单给的接口：`GET /canteen/regions/:id/shops`、`/regions/:id/ranking`
 *   ⚠️ 后者实际是 **`/regions/:regionId/top-products?limit=`**（README §7-2）。
 * 组件：`ListItem` `Card` `RankingRow`。
 *
 * 两个请求**并行**取：店铺列表 + 本区热销榜（`K05` 的列表只承载店铺列表，
 * 榜单是它上面的一节；⛔ 不把两个数据源塞进同一个 list data）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen } from '@/components/ui/ListScreen';
import { LoadingState } from '@/components/ui/LoadingState';
import { RankingRow } from '@/components/ui/RankingRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getRegionTopProducts, getShopsByRegion } from '../../../../shared/api/canteen';
import { normalizeProducts, normalizeShops, type CanteenProduct, type CanteenShop } from './canteen';
import { useCanteenResource } from './useCanteenResource';

/** 榜单接口返回的项带 `rank`（1 起）与 `shop_name`（见 `shared/api/canteen.js:19`） */
type RankedProduct = CanteenProduct & { rank: number; shopName: string | null };

function normalizeRanked(data: unknown): readonly RankedProduct[] {
  return normalizeProducts(data)
    .map((product, index) => {
      const raw = (Array.isArray(data) ? data[index] : null) as Record<string, unknown> | null;
      return {
        ...product,
        rank: typeof raw?.rank === 'number' ? raw.rank : index + 1,
        shopName: typeof raw?.shop_name === 'string' ? raw.shop_name : null,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export function RegionShops(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const regionId = Number(params.id);
  const validId = Number.isInteger(regionId) && regionId > 0;

  // ⛔ 不因为在渲染期就调用：非法 id 直接给空态（`load` 里守卫）
  const shops = useCanteenResource(
    () => (validId ? getShopsByRegion(regionId) : Promise.resolve([])),
    normalizeShops,
    [regionId, validId]
  );
  const ranking = useCanteenResource(
    () => (validId ? getRegionTopProducts(regionId, { limit: 10 }) : Promise.resolve([])),
    normalizeRanked,
    [regionId, validId]
  );

  return (
    <Screen
      testID="screen-region-shops"
      titleKey="canteen.shopsTitle"
      bottomMode="own"
    >
      <View style={{ flex: 1 }}>
        {shops.loading ? (
          <LoadingState testID="region-shops-loading" />
        ) : shops.error !== null ? (
          <ErrorState testID="region-shops-error" error={shops.error} onAction={shops.reload} />
        ) : (
          <ListScreen<CanteenShop>
            testID="region-shops-list"
            data={shops.data ?? []}
            keyExtractor={(shop) => String(shop.id)}
            renderItem={(shop) => (
              <ListItem
                testID={`region-shop-${shop.id}`}
                title={shop.name}
                // ⚠️ `opening_hours` 可能整个没有（服务端会回落到不含它的查询）→ 有才显示
                subtitle={shop.openingHours ?? shop.regionName ?? undefined}
                variant="nav"
                onPress={() =>
                  router.push({ pathname: '/canteen/shop/[id]', params: { id: String(shop.id) } })
                }
              />
            )}
            pagination={{
              refresh: 'idle',
              append: 'idle',
              error: null,
              errorScope: null,
              hasMore: false,
            }}
            onRefresh={shops.reload}
            onEndReached={() => undefined}
            labels={{
              empty: {
                kind: 'noResult',
                title: t('canteen.noShops'),
                actionLabel: t('action.refresh'),
                onAction: shops.reload,
              },
              endLabel: undefined,
            }}
            numColumns={1}
            listHeader={
              ranking.data !== null && ranking.data.length > 0 ? (
                <View style={{ gap: theme.space('space_2'), paddingBottom: theme.space('space_3') }}>
                  <SectionHeader title={t('canteen.regionTop')} />
                  {ranking.data.map((product) => (
                    <RankingRow
                      key={product.id}
                      testID={`region-top-${product.id}`}
                      rank={product.rank}
                      title={product.name}
                      subtitle={product.shopName ?? undefined}
                      // ⚠️ 分数可能为 `null`（G17）→ 用占位而不是 0
                      metric={
                        product.score === null
                          ? t('canteen.scoreNone')
                          : t('canteen.score', { score: product.score })
                      }
                      onPress={() =>
                        router.push({
                          pathname: '/canteen/product/[id]',
                          params: { id: String(product.id) },
                        })
                      }
                    />
                  ))}
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Screen>
  );
}

export { normalizeRanked };
export type { RankedProduct };
