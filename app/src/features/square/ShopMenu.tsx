/**
 * `S-09` 店铺菜品 / Shop Menu（父 `S-08`、`S-14`，原型 `P2`）
 *
 * 页面清单给的接口：`/shops/:id`、`/categories`、`/products`、`/shops/:id/hot`
 *   ⚠️ 最后一个实际是 **`/shops/:shopId/hot-products`**（README §7-3）。
 * 组件：`CategorySidebar` `EntityCard(food)` `ListItem`
 *   ⚠️ **`CategorySidebar` 不是组件**：组件定义 §3.0 判它是**页面级布局**
 *      （README §7-8 已登记）→ 这里就地实现为**一行横向滚动的 `C12 Chip`**。
 *
 * ⚠️ **分类是"筛选"而不是"导航"**（§4.8 六条硬规则之"导航 Tab ≠ 筛选 Chips"）：
 *   切分类**不改路由**，只把 `category_id` 传给同一个 `/products` 接口
 *    （服务端支持 `?category_id=`，见 `routes/canteen.js:988`）→ 所以用 Chip，
 *    ⛔ 不用 `K22 SegmentedTabs`。
 */

import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Chip } from '@/components/ui/Chip';
import { EntityCard } from '@/components/ui/EntityCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ListScreen } from '@/components/ui/ListScreen';
import { RankingRow } from '@/components/ui/RankingRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { getProducts, getShop, getShopHotProducts } from '../../../../shared/api/canteen';
import {
  normalizeProducts,
  normalizeShopDetail,
  type CanteenProduct,
} from './canteen';
import { useCanteenResource } from './useCanteenResource';
import { normalizeRanked, type RankedProduct } from './RegionShops';

export function ShopMenu(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const shopId = Number(params.id);
  const validId = Number.isInteger(shopId) && shopId > 0;

  /** `null` = 全部（不传 `category_id`，服务端返回全部分类） */
  const [categoryId, setCategoryId] = React.useState<number | null>(null);

  const shop = useCanteenResource(
    () => (validId ? getShop(shopId) : Promise.resolve(null)),
    normalizeShopDetail,
    [shopId, validId]
  );
  const products = useCanteenResource(
    () =>
      validId
        ? getProducts(shopId, categoryId === null ? {} : { category_id: categoryId })
        : Promise.resolve([]),
    normalizeProducts,
    [shopId, validId, categoryId]
  );
  const hot = useCanteenResource<readonly RankedProduct[]>(
    () => (validId ? getShopHotProducts(shopId) : Promise.resolve([])),
    normalizeRanked,
    [shopId, validId]
  );

  const categories = shop.data?.categories ?? [];

  return (
    <Screen testID="screen-shop-menu" titleKey="canteen.menuTitle" bottomMode="own">
      <View style={{ flex: 1 }}>
        {shop.loading ? (
          <LoadingState testID="shop-loading" />
        ) : shop.error !== null ? (
          <ErrorState testID="shop-error" error={shop.error} onAction={shop.reload} />
        ) : (
          <ListScreen<CanteenProduct>
            testID="shop-products"
            data={products.data ?? []}
            keyExtractor={(product) => String(product.id)}
            renderItem={(product) => (
              <EntityCard
                testID={`shop-product-${product.id}`}
                domain="food"
                title={product.name}
                subtitle={product.categoryName ?? undefined}
                mediaUri={product.images[0] ?? null}
                // ⚠️ 三者都可能是 `null`（G17）→ 由 `EntityCard` 决定怎么显示"没有"
                price={product.price}
                score={product.score}
                reviewCount={product.reviewCount}
                onPress={() =>
                  router.push({ pathname: '/canteen/product/[id]', params: { id: String(product.id) } })
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
            onRefresh={products.reload}
            onEndReached={() => undefined}
            labels={{
              empty: {
                kind: 'noResult',
                title: t('canteen.noDishes'),
                actionLabel: t('action.refresh'),
                onAction: products.reload,
              },
              endLabel: undefined,
            }}
            numColumns={1}
            // 分类是**筛选**（§4.8：导航 Tab ≠ 筛选 Chips）→ 用 `filterChips` 槽位
            filterChips={
              categories.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: theme.space('space_2') }}
                  testID="shop-categories"
                >
                  <Chip
                    testID="shop-category-all"
                    label={t('canteen.allCategories')}
                    variant="selectable"
                    selected={categoryId === null}
                    onPress={() => setCategoryId(null)}
                  />
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      testID={`shop-category-${category.id}`}
                      label={category.name}
                      variant="selectable"
                      selected={categoryId === category.id}
                      onPress={() => setCategoryId(category.id)}
                    />
                  ))}
                </ScrollView>
              ) : null
            }
            listHeader={
              <View style={{ gap: theme.space('space_3') }}>
                <View style={{ gap: theme.space('space_1') }}>
                  <Text role="title" emphasis="strong" colorToken="text-primary">
                    {shop.data?.name ?? ''}
                  </Text>
                  {/* 营业时间可能整个没有（服务端会回落到不含它的查询）→ 有才显示 */}
                  {shop.data?.openingHours ? (
                    <Text role="caption" colorToken="text-muted">
                      {shop.data.openingHours}
                    </Text>
                  ) : null}
                </View>

                {/* 本店热门（`/hot-products`） */}
                {hot.data !== null && hot.data.length > 0 ? (
                  <View style={{ gap: theme.space('space_2') }}>
                    <SectionHeader title={t('canteen.shopHot')} />
                    {hot.data.map((product) => (
                      <RankingRow
                        key={product.id}
                        testID={`shop-hot-${product.id}`}
                        rank={product.rank}
                        title={product.name}
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
                ) : null}

                {products.data !== null && products.data.length > 0 ? (
                  <SectionHeader title={t('canteen.dishes')} />
                ) : null}
              </View>
            }
          />
        )}
      </View>
    </Screen>
  );
}
