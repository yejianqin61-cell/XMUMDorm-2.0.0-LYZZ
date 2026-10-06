/**
 * `S-10` 菜品详情 / Dish（父 `S-09`，原型 `P3`）
 *
 * 页面清单给的接口：`/products/:id`、`/products/:id/reviews`（≤50/页）、`/products/:id/favorite`
 *   ⚠️ 第二个实际是 **`/products/:productId/comments`**（README §7-4）——
 *      而且 **`/products/:id` 本身就返回第一页评论**（`routes/canteen.js:1238`）
 *      → 进详情页**只需一次请求**，翻页才打第二个接口。
 *
 * ⚠️ **评分不是星星**（README §7-13）：评论的 `rating` 是**五档中文枚举**
 *    （`RATING_ENUM`，`routes/canteen.js:37`），权重 `10/7/4/1/−1` 由服务端算综合分。
 *    → 页面**画档位标签**（`C12 Chip` + `canteen.rating.*` 词条），⛔ 不用 `StarRating`
 *      （1–5 星在这里没有对应字段，画星星等于**编一个不存在的数据**）。
 *
 * ⚠️ **评论是匿名的**（宪法 4.1.1 匿名投影）：服务端只对**商家回复**回填昵称/头像，
 *    普通评论两者恒为 `null` → 界面显示"匿名"，⛔ 不编昵称、不显示灰头像。
 *
 * ⛔ 本轮不做：发评论（要先选五档之一，而档位选择器是已暂缓的 `O07 PickerSheet`）、
 *    `ActionSheet`（举报/删除等动作）、收藏（写路径；读接口虽公开，但一个"只读不写"的
 *    星标会误导用户 —— 见 P1-17 §6 风险）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MediaGrid } from '@/components/ui/MediaGrid';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { getProduct, getProductCommentsRaw } from '../../../../shared/api/canteen';
import {
  commentPageParams,
  mergeCommentPages,
  normalizeCommentPage,
  normalizeProductDetail,
  ratingTierLabelKey,
  type CanteenComment,
  type CanteenProductDetail,
} from './canteen';
import { useCanteenResource, toResourceError } from './useCanteenResource';
import type { AppError } from '@/i18n/errors';
import { canteenCacheKey } from './canteen';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { canteenRevision } from './canteenCache';

/** 翻页追加的评论（首屏那一页由详情接口给） */
type ExtraComments = {
  list: readonly CanteenComment[];
  /** 已取到第几页（首屏是 `comments.page`） */
  page: number;
  hasMore: boolean;
};

const NO_EXTRA: ExtraComments = { list: [], page: 0, hasMore: false };

export function DishDetail(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useI18n();
  const theme = useTheme();

  const productId = Number(params.id);
  const validId = Number.isInteger(productId) && productId > 0;

  const detail = useCanteenResource<CanteenProductDetail>(
    () => (validId ? getProduct(productId) : Promise.resolve(null)),
    normalizeProductDetail,
    [productId, validId],
    { key: canteenCacheKey('product', productId), ttlMs: 60000 }
  );

  const [extra, setExtra] = React.useState<ExtraComments>(NO_EXTRA);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [moreError, setMoreError] = React.useState<AppError | null>(null);
  const pagingVersion = React.useRef(0);
  const pagingBusy = React.useRef(false);

  // 换菜品要清掉上一道菜的追加页（否则会把两道菜的评论混在一起）
  React.useEffect(() => {
    pagingVersion.current += 1;
    pagingBusy.current = false;
    setLoadingMore(false);
    setMoreError(null);
    setExtra(NO_EXTRA);
    return () => { pagingVersion.current += 1; pagingBusy.current = false; };
  }, [productId, detail.data]);

  const firstPage = detail.data?.comments ?? null;
  const comments = React.useMemo(
    () => mergeCommentPages(firstPage?.list ?? [], extra.list),
    [firstPage, extra.list]
  );

  /** 还能不能翻：首屏说还有、且还没翻过 → 能；翻过之后听最后一页的 */
  const canLoadMore = firstPage !== null && (extra.page === 0 ? firstPage.hasMore : extra.hasMore);

  const loadMore = async (): Promise<void> => {
    if (firstPage === null || pagingBusy.current) return;
    pagingBusy.current = true;
    setLoadingMore(true);
    setMoreError(null);
    const version = canteenRevision();
    const request = pagingVersion.current;
    const active = () => request === pagingVersion.current && version === canteenRevision();
    try {
      const nextPage = (extra.page === 0 ? firstPage.page : extra.page) + 1;
      const { page, pageSize } = commentPageParams(nextPage, firstPage.pageSize || 10);
      const raw = await getProductCommentsRaw(productId, { page, pageSize });
      const parsed = normalizeCommentPage(raw);
      if (parsed === null) throw { kind: 'unknown' };
      if (active()) {
        // ⚠️ 合并时**按 id 去重**：`created_at ASC` 的列表在有新评论时会整体后移
        setExtra({ list: mergeCommentPages(extra.list, parsed.list), page: parsed.page, hasMore: parsed.hasMore });
      }
    } catch (error) {
      if (active()) setMoreError(toResourceError(error));
    } finally {
      if (request === pagingVersion.current) { pagingBusy.current = false; setLoadingMore(false); }
    }
  };

  return (
    <Screen testID="screen-dish" titleKey="canteen.dishTitle" bottomMode="own">
      <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        {detail.stale ? <OfflineBanner testID="dish-stale" variant="stale" message={t('canteen.cache.stale')} actionLabel={t('action.refresh')} onAction={detail.reload} /> : null}
        {detail.loading && detail.data === null ? (
          <LoadingState testID="dish-loading" />
        ) : detail.error !== null && detail.data === null ? (
          <ErrorState testID="dish-error" error={detail.error} onAction={detail.reload} />
        ) : detail.data === null ? (
          <EmptyState
            testID="dish-missing"
            kind="noResult"
            title={t('canteen.dishMissing')}
            actionLabel={t('action.retry')}
            onAction={detail.reload}
          />
        ) : (
          <>
            {/* 图片（0 张时 `MediaGrid` 自己整块不渲染） */}
            <MediaGrid
              testID="dish-images"
              uris={detail.data.product.images}
              alt={detail.data.product.images.map(() => detail.data?.product.name ?? '')}
            />

            <View style={{ gap: theme.space('space_2') }}>
              <Text role="title" emphasis="strong" colorToken="text-primary">
                {detail.data.product.name}
              </Text>
              {detail.data.product.description ? (
                <Text role="body" colorToken="text-secondary">
                  {detail.data.product.description}
                </Text>
              ) : null}
            </View>

            {/* 指标：**每一项都可能没有**（G17）→ 逐项判断，⛔ 不用 0 冒充"没有" */}
            <Surface rounded="radius_medium" bordered="subtle" padding="space_3">
              <View style={{ flexDirection: 'row', gap: theme.space('space_4') }}>
                <View>
                  <Text role="caption" colorToken="text-muted">
                    {t('canteen.price')}
                  </Text>
                  <Text role="label" emphasis="strong" colorToken="text-primary" testID="dish-price">
                    {detail.data.product.price === null
                      ? t('canteen.valueNone')
                      : t('canteen.priceValue', { price: detail.data.product.price })}
                  </Text>
                </View>
                <View>
                  <Text role="caption" colorToken="text-muted">
                    {t('canteen.scoreLabel')}
                  </Text>
                  <Text role="label" emphasis="strong" colorToken="text-primary" testID="dish-score">
                    {detail.data.product.score === null
                      ? t('canteen.scoreNone')
                      : t('canteen.score', { score: detail.data.product.score })}
                  </Text>
                </View>
                <View>
                  <Text role="caption" colorToken="text-muted">
                    {t('canteen.reviews')}
                  </Text>
                  <Text
                    role="label"
                    emphasis="strong"
                    colorToken="text-primary"
                    testID="dish-review-count"
                  >
                    {detail.data.product.reviewCount === null
                      ? t('canteen.valueNone')
                      : t('canteen.reviewCount', { n: detail.data.product.reviewCount })}
                  </Text>
                </View>
              </View>
            </Surface>

            <SectionHeader title={t('canteen.comments')} />
            {comments.length === 0 ? (
              <Text role="caption" colorToken="text-muted" testID="dish-no-comments">
                {t('canteen.noComments')}
              </Text>
            ) : (
              <View style={{ gap: theme.space('space_3') }}>
                {comments.map((comment) => {
                  const tierKey = ratingTierLabelKey(comment.rating);
                  return (
                    <Surface
                      key={comment.id}
                      testID={`dish-comment-${comment.id}`}
                      rounded="radius_medium"
                      bordered="subtle"
                      padding="space_3"
                    >
                      <View style={{ gap: theme.space('space_1') }}>
                        {/* 匿名投影：普通评论没有昵称/头像（宪法 4.1.1） */}
                        <Text role="caption" colorToken="text-muted">
                          {comment.isMerchantReply
                            ? (comment.authorNickname ?? t('canteen.merchant'))
                            : t('canteen.anonymous')}
                        </Text>
                        {/* 档位标签（⛔ 不是星星） */}
                        {tierKey ? (
                          <View style={{ flexDirection: 'row' }}>
                            <Chip
                              testID={`dish-comment-${comment.id}-tier`}
                              label={t(tierKey)}
                              variant="static"
                            />
                          </View>
                        ) : null}
                        {/* 商家回复用**引用块**区分（⛔ 不只靠缩进或颜色） */}
                        {comment.isMerchantReply ? (
                          <Surface rounded="radius_small" bordered="subtle" padding="space_2">
                            <Text role="body" colorToken="text-secondary">
                              {comment.content}
                            </Text>
                          </Surface>
                        ) : (
                          <Text role="body" colorToken="text-secondary">
                            {comment.content}
                          </Text>
                        )}
                      </View>
                    </Surface>
                  );
                })}
              </View>
            )}

            {moreError ? <ErrorState testID="dish-comments-error" error={moreError} onAction={() => void loadMore()} /> : null}
            {canLoadMore ? (
              <Button
                testID="dish-load-more"
                label={t('canteen.loadMore')}
                variant="ghost"
                loading={loadingMore}
                onPress={() => {
                  void loadMore();
                }}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
