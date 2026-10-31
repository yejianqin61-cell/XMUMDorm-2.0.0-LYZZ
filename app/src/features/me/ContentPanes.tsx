/**
 * 「我的」四个内容分页（`M-04` 迁来）—— 主页 pager 的四个页面（R-M3）
 *
 * ## 为什么从 `PostsScreen` 搬出来
 * C-05 拍板后这四个模块是**一级主页的同页模块**，不再是子页面里的局部切换。
 * 页面没了，逻辑留在这里，由主页的 pager 挂载。
 *
 * ## `active` 门（pager 四页常驻带来的新约束）
 * pager 会把四个页面**同时挂载**（不是条件渲染）。若不设门，一进主页就并发四个请求。
 * 这里的口径是：**首次激活才取数**，切走再切回不重复请求（滚动位置与游标都在
 * `secondaryTabStore` 里，由 `ListScreen` 恢复，不需要靠重新取数来"刷新观感"）。
 *
 * ## 两处如实登记（从 `PostsScreen` 原样带来）
 *   1. 行**不可点**：帖子详情（`C-02`）是丙的页面，App 里还没有这个路由 —— ⛔ 不跳到 404；
 *   2. 删帖成功后**本地先移除**：服务端 profile 有 10s 缓存，等它过期会让用户以为没删掉。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Trash from 'lucide-react-native/icons/trash';

import { AlertDialog } from '@/components/ui/AlertDialog';
import { EntityCard } from '@/components/ui/EntityCard';
import { IconButton } from '@/components/ui/IconButton';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getMe, getProfile } from '../../../../shared/api/users';
import { deletePost } from '../../../../shared/api/posts';
import { getMyProductReviews } from '../../../../shared/api/canteen';
import { listMarketplaceMyItems, listMarketplaceMyWants } from '../../../../shared/api/marketplace';
import { listMyErrands } from '../../../../shared/api/errands';
import { toMailboxError } from '@/features/mailbox/conversations';
import { readMarketPage, type MarketItem } from '@/features/marketplace/model';
import { readErrandPage, type ErrandItem } from '@/features/errand/model';
import { readMyReviewPage, type MyReviewRow } from './content';
import {
  mergePostRows,
  normalizeProfilePosts,
  postExcerpt,
  removePostRow,
  type MyPostRow,
} from './posts';

const PAGE_SIZE = 20;

export type MeContentKey = 'posts' | 'marketplace' | 'errands' | 'reviews';
type ContentRow = MarketItem | ErrandItem | MyReviewRow;

/** 主页四个分页的唯一入口：`kind` 决定取哪份数据，`active` 决定什么时候取。 */
export function MeContentPane({
  kind,
  active,
}: {
  kind: MeContentKey;
  active: boolean;
}): React.ReactElement {
  return kind === 'posts' ? <MePostsPane active={active} /> : <MeOwnedPane kind={kind} active={active} />;
}

function MePostsPane({ active }: { active: boolean }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  const [rows, setRows] = React.useState<readonly MyPostRow[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<MyPostRow | null>(null);
  const myIdRef = React.useRef<number | null>(null);
  const pageRef = React.useRef(1);
  const loadedRef = React.useRef(false);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } = useListPagination({
    scope: { primaryTab: 'me', secondaryTab: 'posts' },
  });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        if (myIdRef.current === null) {
          const me = await getMe();
          const id = Number((me as { id?: number } | null)?.id);
          if (!Number.isInteger(id) || id <= 0) throw { kind: 'unknown' };
          myIdRef.current = id;
        }
        const page = mode === 'refresh' ? 1 : pageRef.current + 1;
        const payload = await getProfile(myIdRef.current, { page, pageSize: PAGE_SIZE });
        const normalized = normalizeProfilePosts(payload);
        pageRef.current = page;
        setRows((previous) =>
          mode === 'refresh' ? normalized.rows : mergePostRows(previous, normalized.rows)
        );
        dispatch({
          type: mode === 'refresh' ? 'refresh:success' : 'append:success',
          // ⚠️ 用服务端给的 `hasMore`，⛔ 不用"条数 < pageSize"自己推
          hasMore: normalized.hasMore,
        });
      } catch (error) {
        dispatch({
          type: mode === 'refresh' ? 'refresh:failure' : 'append:failure',
          error: toMailboxError(error),
        });
      }
    },
    [dispatch]
  );

  React.useEffect(() => {
    if (!active || loadedRef.current) return;
    loadedRef.current = true;
    void load('refresh');
  }, [active, load]);

  const confirmDelete = React.useCallback(async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target === null) return;
    // 本地先移除：服务端 profile 有 10s 缓存，等它过期会让用户以为"没删掉"
    setRows((previous) => removePostRow(previous, target.id));
    try {
      await deletePost(target.id);
    } catch {
      // 删失败就把列表拉回来（⛔ 不静默吞掉）
      await load('refresh');
    }
  }, [load, pendingDelete]);

  return (
    <View style={{ flex: 1 }} testID="me-content-pane-posts">
      <ListScreen
        testID="me-posts-list"
        data={rows}
        keyExtractor={(item) => String(item.id)}
        pagination={pagination}
        onRefresh={() => void load('refresh')}
        onEndReached={() => void load('append')}
        onRetryRefresh={() => void load('refresh')}
        onRetryAppend={() => void load('append')}
        restoredScrollOffset={restoredScrollOffset}
        onScrollOffset={persistScrollOffset}
        labels={{
          empty: {
            kind: 'firstRun',
            title: t('me.posts.empty.title'),
            description: t('me.posts.empty.description'),
            actionLabel: t('me.posts.empty.action'),
            onAction: () => router.push('/publish-center'),
          },
          errorActionLabel: t('action.retry'),
          retryLabel: t('action.retry'),
          endLabel: t('mailbox.conversations.end'),
        }}
        renderItem={(item) => (
          <View
            testID={`me-post-${item.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
          >
            <View style={{ flex: 1 }}>
              {/* ⛔ 行不可点：帖子详情（C-02）是丙的页面，App 里还没有这个路由 */}
              <EntityCard
                domain="post"
                title={postExcerpt(item.excerpt, t('me.posts.noText'))}
                subtitle={t('me.posts.meta', { likes: item.likeCount, comments: item.commentCount })}
                mediaUri={item.imageUri ?? undefined}
              />
            </View>
            <IconButton
              testID={`me-post-delete-${item.id}`}
              Icon={Trash}
              accessibilityLabel={t('me.posts.delete')}
              onPress={() => setPendingDelete(item)}
            />
          </View>
        )}
      />
      <AlertDialog
        testID="me-posts-delete-dialog"
        visible={pendingDelete !== null}
        variant="danger"
        title={t('me.posts.delete.title')}
        body={t('me.posts.delete.body')}
        confirmLabel={t('me.posts.delete.confirm')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
}

function MeOwnedPane({
  kind,
  active,
}: {
  kind: Exclude<MeContentKey, 'posts'>;
  active: boolean;
}): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = React.useState<readonly ContentRow[]>([]);
  /** 阶段B-05：二手面板内的两段（我的商品 / 我的想要），⛔ 不新增内容 Tab */
  const [marketMode, setMarketMode] = React.useState<'items' | 'wants'>('items');
  const marketModeRef = React.useRef<'items' | 'wants'>('items');
  const pageRef = React.useRef(0);
  const loadedRef = React.useRef(false);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } = useListPagination({
    scope: { primaryTab: 'me', secondaryTab: kind },
  });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        const page = mode === 'refresh' ? 1 : pageRef.current + 1;
        let nextRows: readonly ContentRow[];
        let hasMore: boolean;
        if (kind === 'marketplace') {
          const result = readMarketPage(
            marketModeRef.current === 'wants'
              ? await listMarketplaceMyWants({ page, pageSize: PAGE_SIZE })
              : await listMarketplaceMyItems({ page, pageSize: PAGE_SIZE })
          );
          nextRows = result.rows;
          hasMore = result.hasMore;
        } else if (kind === 'errands') {
          const result = readErrandPage(await listMyErrands({ page, pageSize: PAGE_SIZE }));
          nextRows = result.rows;
          hasMore = result.hasMore;
        } else {
          const result = readMyReviewPage(await getMyProductReviews({ page, pageSize: PAGE_SIZE }));
          nextRows = result.rows;
          hasMore = result.hasMore;
        }
        pageRef.current = page;
        setRows((previous) => (mode === 'refresh' ? nextRows : mergeContentRows(previous, nextRows)));
        dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore });
      } catch (error) {
        dispatch({
          type: mode === 'refresh' ? 'refresh:failure' : 'append:failure',
          error: toMailboxError(error),
        });
      }
    },
    [dispatch, kind, marketModeRef]
  );

  React.useEffect(() => {
    if (!active || loadedRef.current) return;
    loadedRef.current = true;
    void load('refresh');
  }, [active, load]);

  /** 切换"我的商品 / 我的想要"：重置分页与行，再按新数据源重取 */
  const switchMarketMode = (next: string): void => {
    const mode = next === 'wants' ? 'wants' : 'items';
    if (mode === marketModeRef.current) return;
    marketModeRef.current = mode;
    setMarketMode(mode);
    pageRef.current = 0;
    setRows([]);
    dispatch({ type: 'reset' });
    void load('refresh');
  };

  const emptyCopy = {
    marketplace: ['me.content.marketplace.empty.title', 'me.content.marketplace.empty.description'],
    errands: ['me.content.errands.empty.title', 'me.content.errands.empty.description'],
    reviews: ['me.content.reviews.empty.title', 'me.content.reviews.empty.description'],
  } as const;
  const [titleKey, descriptionKey] = emptyCopy[kind];

  return (
    <View style={{ flex: 1 }} testID={`me-content-pane-${kind}`}>
      {kind === 'marketplace' ? (
        <SegmentedControl
          testID="me-market-mode"
          value={marketMode}
          onChange={switchMarketMode}
          options={[
            { value: 'items', label: t('me.content.marketplace.tabItems') },
            { value: 'wants', label: t('me.content.marketplace.tabWants') },
          ]}
        />
      ) : null}
      <ListScreen
        testID={`me-content-${kind}`}
        data={rows}
        keyExtractor={(row) => String(row.id)}
        pagination={pagination}
        onRefresh={() => void load('refresh')}
        onEndReached={() => void load('append')}
        onRetryRefresh={() => void load('refresh')}
        onRetryAppend={() => void load('append')}
        restoredScrollOffset={restoredScrollOffset}
        onScrollOffset={persistScrollOffset}
        labels={{
          empty: {
            kind: 'noResult',
            title: t(titleKey),
            description: t(descriptionKey),
            actionLabel: t('action.retry'),
            onAction: () => void load('refresh'),
          },
          errorActionLabel: t('action.retry'),
          retryLabel: t('action.retry'),
          endLabel: t('mailbox.conversations.end'),
        }}
        renderItem={(row) => renderOwnedContentCard(row, kind, t, router)}
      />
    </View>
  );
}

function mergeContentRows(
  previous: readonly ContentRow[],
  incoming: readonly ContentRow[]
): ContentRow[] {
  const seen = new Set(previous.map((row) => row.id));
  const merged = [...previous];
  for (const row of incoming) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}

function renderOwnedContentCard(
  row: ContentRow,
  kind: Exclude<MeContentKey, 'posts'>,
  t: ReturnType<typeof useI18n>['t'],
  router: ReturnType<typeof useRouter>
): React.ReactElement {
  if (kind === 'marketplace') {
    const item = row as MarketItem;
    return (
      <EntityCard
        testID={`me-marketplace-${item.id}`}
        domain="listing"
        title={item.title}
        subtitle={item.description}
        mediaUri={item.cover}
        price={item.price}
        status={item.status}
        onPress={() => router.push(`/market/${item.id}` as never)}
      />
    );
  }
  if (kind === 'errands') {
    const item = row as ErrandItem;
    return (
      <EntityCard
        testID={`me-errand-${item.id}`}
        domain="errand"
        title={item.title}
        subtitle={item.location}
        reward={item.reward}
        status={item.status}
        onPress={() => router.push(`/errand/${item.id}` as never)}
      />
    );
  }
  const review = row as MyReviewRow;
  return (
    <EntityCard
      testID={`me-review-${review.id}`}
      domain="review"
      title={review.productName}
      subtitle={[review.shopName, review.rating, review.content].filter(Boolean).join(' · ')}
      mediaUri={review.imageUri}
      onPress={() => router.push(`/canteen/product/${review.productId}` as never)}
    />
  );
}
