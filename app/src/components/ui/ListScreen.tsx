/**
 * ListScreen（K05）—— **参数化列表骨架**（组件定义 §2.3 / §2.4；原型 `P2`）
 *
 * 它是"**把写页面变成拼骨架**"的核心：26 个页面用它，所以四条契约必须在这里定死：
 *
 * 1. **分页状态机只有两处实现**（§2.4）：`K05` 与 `T05 ListFooter`。
 *    页面**不得自己写分页状态**（任务包纪律 4）—— 所以这里有 `paginationReducer`
 *    （纯函数，可测）+ `listFooterState`（纯函数，直接喂给 `T05`）。
 * 2. **四态齐全**（出口门 E2）：首屏加载 → `T03`、空 → `T01`、错 → `T02`、有数据 → 列表。
 *    判据是纯函数 `resolveListState`，⛔ 不靠"页面记得自己判"。
 * 3. **筛选持久化 + 滚动位置恢复**（`P2` 的交互契约）**复用 `SecondaryTabStore`**，
 *    ⛔ 不新建第二套仓库；`useListPagination` 负责把它接起来。
 * 4. **下拉刷新与追加都交原生/既有件**：`T06 PullToRefresh` + `T05 ListFooter`。
 *
 * ⛔ 组件内不写任何文案：四态与页脚的文案全部由页面传词条。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { useTheme } from '@/design-system/theme';
import type { AppError } from '@/i18n/errors';
import {
  SecondaryTabStore,
  secondaryTabStore,
  type SecondaryTabKey,
  type SecondaryTabState,
} from '@/features/navigation/secondaryTabs';
import { EmptyState, type EmptyKind } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ListFooter } from './ListFooter';
import { LoadingState } from './LoadingState';
import { PullToRefresh } from './PullToRefresh';

/* ────────────────────────── 分页状态机（唯一实现处之一） ────────────────────────── */

export type PagePhase = 'idle' | 'loading' | 'error';

/** 页脚要显示什么（`null` = 什么都不显示） */
export type ListFooterPhase = 'idle' | 'loading' | 'end' | 'retry';

export type PaginationState = {
  /** 下拉刷新（第一页） */
  refresh: PagePhase;
  /** 追加下一页 */
  append: PagePhase;
  /** 最近一次错误 */
  error: AppError | null;
  /** 错误该显示在哪：第一页整屏（`refresh`）还是页脚（`append`） */
  errorScope: 'refresh' | 'append' | null;
  hasMore: boolean;
};

export const INITIAL_PAGINATION: PaginationState = {
  refresh: 'idle',
  append: 'idle',
  error: null,
  errorScope: null,
  hasMore: true,
};

export type PaginationAction =
  | { type: 'refresh:start' }
  | { type: 'refresh:success'; hasMore: boolean }
  | { type: 'refresh:failure'; error: AppError }
  | { type: 'append:start' }
  | { type: 'append:success'; hasMore: boolean }
  | { type: 'append:failure'; error: AppError }
  | { type: 'reset' };

/**
 * 分页 reducer（纯函数）。
 * 三条不变量：
 * - **同一方向不重复进入 loading**（防重复请求，是 `canAppend` 之外的第二道保险）；
 * - **`hasMore === false` 时不再 append**（到底了就别再问）；
 * - 新请求开始即**清掉上一次错误**（否则错误的 retry 会与"正在重试"同时出现）。
 */
export function paginationReducer(
  state: PaginationState,
  action: PaginationAction
): PaginationState {
  switch (action.type) {
    case 'refresh:start':
      return { ...state, refresh: 'loading', error: null, errorScope: null };
    case 'refresh:success':
      // 刷新成功 = 第一页换了内容 → 追加态与错误一起归零
      return {
        refresh: 'idle',
        append: 'idle',
        error: null,
        errorScope: null,
        hasMore: action.hasMore,
      };
    case 'refresh:failure':
      return { ...state, refresh: 'error', error: action.error, errorScope: 'refresh' };
    case 'append:start':
      if (state.append === 'loading') return state;
      if (!state.hasMore) return state;
      return { ...state, append: 'loading', error: null, errorScope: null };
    case 'append:success':
      return { ...state, append: 'idle', hasMore: action.hasMore, error: null, errorScope: null };
    case 'append:failure':
      return { ...state, append: 'error', error: action.error, errorScope: 'append' };
    case 'reset':
      return INITIAL_PAGINATION;
    default:
      return state;
  }
}

/**
 * 能不能**由滚动自动**取下一页（纯函数）：到底了 / 正在取 / 正在刷新 / **上次追加失败** → 都不能。
 *
 * ⚠️ 名字里刻意带 `Auto`：`append: 'error'` 时**不能**自动再试（滚动会反复打一个正在失败的接口），
 * 但**用户手动重试是允许的** —— reducer 的 `append:start` 从 `'error'` 是合法的。
 * 这两件事必须分开表达，否则要么刷屏、要么用户永远重试不了。
 */
export function canAutoAppend(state: PaginationState): boolean {
  return state.hasMore && state.append === 'idle' && state.refresh !== 'loading';
}

/** 页脚该显示什么（纯函数，直接喂 `T05 ListFooter`） */
export function listFooterState(state: PaginationState): ListFooterPhase {
  if (state.append === 'loading') return 'loading';
  if (state.append === 'error') return 'retry';
  if (!state.hasMore) return 'end';
  return 'idle';
}

/* ────────────────────────── 四态判定（出口门 E2） ────────────────────────── */

export type ListScreenState = 'loading' | 'empty' | 'error' | 'data';

/**
 * 四态判定（纯函数）。
 * ⚠️ 关键是**有数据时不要让首屏错误接管整屏**：已经有内容可看的时候，
 *    刷新失败应表现为"页脚/顶部提示"，而不是把用户正在看的内容换成错误页。
 */
export function resolveListState(input: {
  pagination: PaginationState;
  itemCount: number;
}): ListScreenState {
  const { pagination, itemCount } = input;
  if (itemCount > 0) return 'data';
  if (pagination.refresh === 'loading') return 'loading';
  if (pagination.refresh === 'error') return 'error';
  return 'empty';
}

/* ────────────────────────── 与状态仓库接线 ────────────────────────── */

export type ListScope = { primaryTab: string; secondaryTab: SecondaryTabKey };

export type UseListPaginationOptions = {
  /** ⛔ 默认用应用级单例；只有在测试里才需要传自己的实例 */
  store?: SecondaryTabStore;
  /** 给了就启用**筛选持久化 + 滚动位置恢复**（R2/R4） */
  scope?: ListScope;
  initial?: Partial<PaginationState>;
};

export type ListPagination = {
  pagination: PaginationState;
  dispatch: React.Dispatch<PaginationAction>;
  /** 从仓库恢复的滚动位置（首次渲染用） */
  restoredScrollOffset: number;
  /** 滚动时写回仓库（节流交给调用方/FlashList 的 `scrollEventThrottle`） */
  persistScrollOffset: (offset: number) => void;
  /** 当前筛选（从仓库读；⛔ 与"选中哪个 Tab"是两条不同维度，R4） */
  filters: SecondaryTabState['filters'];
  /** 改动筛选：写回仓库并**重置分页**（筛选变了，旧的分页游标无意义） */
  setFilters: (next: SecondaryTabState['filters']) => void;
  /** 持久化的分页游标（`cursor` 模式的页面用它续取） */
  cursor: string | null;
  setCursor: (next: string | null) => void;
};

export function useListPagination(options: UseListPaginationOptions = {}): ListPagination {
  const store = options.store ?? secondaryTabStore;
  const scope = options.scope;

  const [pagination, dispatch] = React.useReducer(paginationReducer, {
    ...INITIAL_PAGINATION,
    ...(options.initial ?? {}),
  });

  const restored = React.useMemo(
    () => (scope ? store.get(scope.primaryTab, scope.secondaryTab) : null),
    [store, scope?.primaryTab, scope?.secondaryTab]
  );

  /**
   * ⚠️ 筛选与游标**必须有本地态**：`store` 是普通对象，改它不会触发重渲染。
   *    只"读一次"的实现会让本会话内的筛选改动对页面不可见（切 Tab 回来才生效）——
   *    那是"持久化"只做了一半。
   */
  const [filters, setFiltersState] = React.useState<SecondaryTabState['filters']>(
    () => restored?.filters ?? {}
  );
  const [cursor, setCursorState] = React.useState<string | null>(() => restored?.cursor ?? null);

  const persistScrollOffset = React.useCallback(
    (offset: number) => {
      if (!scope) return;
      store.update(scope.primaryTab, scope.secondaryTab, { scrollOffset: offset });
    },
    [store, scope?.primaryTab, scope?.secondaryTab]
  );

  const setFilters = React.useCallback(
    (next: SecondaryTabState['filters']) => {
      setFiltersState(next);
      if (scope) store.update(scope.primaryTab, scope.secondaryTab, { filters: next });
      // 筛选变了 → 分页归零（旧游标指向旧的筛选结果，继续追加会串数据）
      dispatch({ type: 'reset' });
    },
    [store, scope?.primaryTab, scope?.secondaryTab]
  );

  const setCursor = React.useCallback(
    (next: string | null) => {
      setCursorState(next);
      if (scope) store.update(scope.primaryTab, scope.secondaryTab, { cursor: next });
    },
    [store, scope?.primaryTab, scope?.secondaryTab]
  );

  return {
    pagination,
    dispatch,
    restoredScrollOffset: restored?.scrollOffset ?? 0,
    persistScrollOffset,
    filters,
    setFilters,
    cursor,
    setCursor,
  };
}

/* ────────────────────────── 组件 ────────────────────────── */

export type ListScreenLabels = {
  empty: {
    kind: EmptyKind;
    title: string;
    description?: string;
    actionLabel: string;
    onAction: () => void;
  };
  /** 出错时的主行动文案（`T02` 的三段文案来自 `i18n/errors.ts`，这里只给动作） */
  errorActionLabel?: string;
  /** 追加失败的重试按钮文案 */
  retryLabel?: string;
  /** 到底了的文案 */
  endLabel?: string;
};

export type ListScreenProps<T> = {
  data: readonly T[];
  renderItem: (item: T, index: number) => React.ReactElement | null;
  keyExtractor: (item: T) => string;
  pagination: PaginationState;
  onRefresh: () => void;
  /** 触底：只有 `canAppend` 为真时才会被调用（组件内已经挡了一层） */
  onEndReached: () => void;
  /** 追加失败后的重试 */
  onRetryAppend?: () => void;
  labels: ListScreenLabels;
  /** 首屏错误的处理（刷新/重试第一页） */
  onRetryRefresh?: () => void;
  /**
   * 二级 Tab 条（`K22 SegmentedTabs` / `TopTabStrip`）。
   * ⚠️ **与 `filterChips` 是两个独立的 props**（宪法 4.8.1-R4：导航 Tab ≠ 筛选 Chips）。
   * 合成一个 `header` 只有省一次传参的好处，代价是"把筛选当成导航"这类错误无法被发现。
   */
  tabs?: React.ReactNode;
  /** 筛选 chips（`K20 FilterChips`）—— ⛔ 不得与 `tabs` 合并 */
  filterChips?: React.ReactNode;
  /** 网格列数（`P2` 默认单列等宽行） */
  numColumns?: number;
  /** 从仓库恢复的滚动位置（`useListPagination().restoredScrollOffset`） */
  restoredScrollOffset?: number;
  /** 滚动回写（`useListPagination().persistScrollOffset`） */
  onScrollOffset?: (offset: number) => void;
  /** 首屏骨架行数 */
  skeletonRows?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ListScreen<T>({
  data,
  renderItem,
  keyExtractor,
  pagination,
  onRefresh,
  onEndReached,
  onRetryAppend,
  labels,
  onRetryRefresh,
  tabs,
  filterChips,
  numColumns = 1,
  restoredScrollOffset = 0,
  onScrollOffset,
  skeletonRows,
  style,
  testID,
}: ListScreenProps<T>): React.ReactElement {
  const theme = useTheme();
  const screenState = resolveListState({ pagination, itemCount: data.length });
  const footer = listFooterState(pagination);

  /**
   * 滚动位置恢复：只在**第一次拿到数据后**做一次。
   * ⚠️ 为什么不用 `initialScrollIndex`：那只在列表**首次挂载**时生效，
   *    而列表要等第一页数据回来才挂载 —— 时机对不上就会静默失效。
   */
  const listRef = React.useRef<{ scrollToOffset?: (p: { offset: number; animated?: boolean }) => void } | null>(null);
  const restoredRef = React.useRef(false);
  React.useEffect(() => {
    if (restoredRef.current) return;
    if (screenState !== 'data') return;
    if (restoredScrollOffset <= 0) {
      restoredRef.current = true;
      return;
    }
    restoredRef.current = true;
    listRef.current?.scrollToOffset?.({ offset: restoredScrollOffset, animated: false });
  }, [screenState, restoredScrollOffset]);

  if (screenState === 'loading') {
    return (
      <View testID={testID} style={[{ flex: 1 }, style]}>
        {tabs}
        {filterChips}
        <LoadingState variant="skeleton" rows={skeletonRows} testID={testID ? `${testID}-loading` : undefined} />
      </View>
    );
  }

  if (screenState === 'error') {
    return (
      <View testID={testID} style={[{ flex: 1 }, style]}>
        {tabs}
        {filterChips}
        <ErrorState
          error={pagination.error ?? { kind: 'unknown' }}
          onAction={onRetryRefresh ?? onRefresh}
          testID={testID ? `${testID}-error` : undefined}
        />
      </View>
    );
  }

  if (screenState === 'empty') {
    return (
      <View testID={testID} style={[{ flex: 1 }, style]}>
        {tabs}
        {filterChips}
        <EmptyState
          kind={labels.empty.kind}
          title={labels.empty.title}
          description={labels.empty.description}
          actionLabel={labels.empty.actionLabel}
          onAction={labels.empty.onAction}
          testID={testID ? `${testID}-empty` : undefined}
        />
      </View>
    );
  }

  return (
    <View testID={testID} style={[{ flex: 1 }, style]}>
      {tabs}
        {filterChips}
      <FlashList
        ref={listRef as never}
        data={data as T[]}
        renderItem={({ item, index }) => renderItem(item, index)}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        refreshControl={
          <PullToRefresh refreshing={pagination.refresh === 'loading'} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          // 双保险：reducer 也会挡，但这里挡掉就不必白跑一次滚动分支
          if (canAutoAppend(pagination)) onEndReached();
        }}
        onEndReachedThreshold={0.5}
        onScroll={(event) => onScrollOffset?.(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        ListFooterComponent={
          footer === 'idle' ? null : (
            <ListFooter
              {...(footer === 'retry'
                ? {
                    state: 'retry' as const,
                    onRetry: onRetryAppend ?? onRefresh,
                    retryLabel: labels.retryLabel ?? '',
                  }
                : footer === 'end'
                  ? { state: 'end' as const, endLabel: labels.endLabel }
                  : { state: 'loading' as const })}
              testID={testID ? `${testID}-footer` : undefined}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: theme.space('space_4') }}
      />
    </View>
  );
}
