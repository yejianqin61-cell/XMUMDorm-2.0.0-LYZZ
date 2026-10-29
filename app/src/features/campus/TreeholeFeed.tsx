/**
 * TreeholeFeed —— 树洞模块（广场首页第 1 页）的**唯一列表壳**
 *
 * 负责人 2026-10-18 裁决的落点：
 * - **搜索就地展开**：顶部一个搜索框外观，点开在本页展开输入（⛔ 不再跳独立搜索页）；
 * - **壳收敛为一份**：`/campus` 独立页已改为重定向，树洞只有这里一个壳；
 * - 标签筛选进**列表头部**（随内容滚走），不再是常驻占 40dp 的独立条；
 * - 帖子之间只留细分隔线（`Divider`），不套卡片。
 *
 * 数据与状态：分页状态机仍用 `K05 useListPagination`（⛔ 页面不自写分页状态）；
 * 滚动位置/筛选仍写 `SecondaryTabStore`（切模块回来位置还在）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Divider } from '@/components/ui/Divider';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { useSession } from '@/features/auth/session';
import { getQueryClient } from '@/shared/queryClient';
import { QK } from '../../../../shared/query/queryKeys';
import { getPostList, getPostTagsList } from '../../../../shared/api/posts';
import { formatPostTime } from '../../../../shared/utils/formatTime';
import { useCampusLike } from './useCampusActions';
import { TreeholePostRow } from './TreeholePostRow';
import { TreeholeSearchBar } from './TreeholeSearchBar';
import { TreeholeTagFilter } from './TreeholeTagFilter';
import { toTreeholePostViewModel } from './treeholePostViewModel';
import {
  asPost,
  errorFor,
  SEARCH_MAX_LENGTH,
  TREEHOLE_PAGE_SIZE,
  type Post,
} from './campusModel';

type PostTag = { id: number; name_zh?: string; name_en?: string };

function asPostTag(value: unknown): PostTag | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const tag = value as PostTag;
  if (!Number.isSafeInteger(tag.id) || tag.id <= 0) return null;
  if (typeof tag.name_zh !== 'string' && typeof tag.name_en !== 'string') return null;
  return tag;
}

function tagLabel(tag: PostTag, locale: 'zh' | 'en'): string {
  return (locale === 'en' ? tag.name_en || tag.name_zh : tag.name_zh || tag.name_en)?.trim() || '';
}

function selectedTagId(filters: Readonly<Record<string, string | readonly string[]>>): number | null {
  const value = filters.tag;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/** 标签目录（失败时静默隐藏筛选条，⛔ 不阻断阅读） */
function useTreeholeTags(enabled: boolean): readonly PostTag[] {
  const [tags, setTags] = React.useState<readonly PostTag[]>([]);
  React.useEffect(() => {
    if (!enabled) {
      setTags([]);
      return;
    }
    let active = true;
    void getPostTagsList({ limit: 20 })
      .then((value) => {
        if (!active || !Array.isArray(value)) return;
        const unique = new Map<number, PostTag>();
        for (const item of value) {
          const tag = asPostTag(item);
          if (tag && tagLabel(tag, 'zh')) unique.set(tag.id, tag);
        }
        setTags([...unique.values()]);
      })
      .catch(() => {
        if (active) setTags([]);
      });
    return () => {
      active = false;
    };
  }, [enabled]);
  return tags;
}

type Snapshot = {
  rows: readonly Post[];
  page: number;
  hasMore: boolean;
  scrollOffset?: number;
};

export function TreeholeFeed({ testID = 'treehole-feed' }: { testID?: string }): React.ReactElement {
  const session = useSession();
  const identity = JSON.stringify([session.status, session.identifier, session.isSignedIn]);
  return <TreeholeFeedSession key={identity} testID={testID} identity={identity} />;
}

function TreeholeFeedSession({ testID, identity }: { testID: string; identity: string }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const client = getQueryClient();
  const session = useSession();
  const searchKey = React.useMemo(() => [
    ...QK.postsInfinite(session.isSignedIn ? '_user' : '_guest', TREEHOLE_PAGE_SIZE),
    'campusSearchState', identity,
  ], [session.isSignedIn, identity]);
  const initial = React.useRef(client.getQueryData<{
    expanded: boolean; draft: string; query: string; history: readonly string[];
  }>(searchKey));
  const [expanded, setExpanded] = React.useState(initial.current?.expanded ?? false);
  const [draft, setDraft] = React.useState(initial.current?.draft ?? '');
  const [query, setQuery] = React.useState(initial.current?.query ?? '');
  const [history, setHistory] = React.useState<readonly string[]>(initial.current?.history ?? []);
  React.useEffect(() => {
    client.setQueryData(searchKey, { expanded, draft, query, history });
  }, [client, searchKey, expanded, draft, query, history]);

  // 打字期间不发请求：300ms 防抖后才替换结果流
  React.useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setQuery(draft.trim().slice(0, SEARCH_MAX_LENGTH)), 300);
    return () => clearTimeout(timer);
  }, [draft, expanded]);

  const submit = React.useCallback((value: string) => {
    const next = value.trim().slice(0, SEARCH_MAX_LENGTH);
    setQuery(next);
    if (next) setHistory((items) => [next, ...items.filter((item) => item !== next)].slice(0, 5));
  }, []);

  // 标签目录在**模块**层取一次：Body 会按 query 重挂，若放在里面每次搜索/取消都会重请一次
  const tags = useTreeholeTags(true);

  const cancel = React.useCallback(() => {
    setExpanded(false);
    setDraft('');
    setQuery('');
  }, []);

  return (
    <View testID={testID} style={{ flex: 1, minHeight: 0 }}>
      <TreeholeSearchBar
        testID="campus-search"
        value={draft}
        onChangeText={setDraft}
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onCancel={cancel}
        onSubmit={() => submit(draft)}
        placeholder={t('screen.campus.search.placeholder')}
        cancelLabel={t('action.cancel')}
        clearLabel={t('screen.campus.search.clear')}
        historyLabel={t('screen.campus.search.history')}
        clearHistoryLabel={t('screen.campus.search.clearHistory')}
        history={history}
        onPickHistory={(value) => {
          setDraft(value);
          submit(value);
        }}
        onClearHistory={() => setHistory([])}
      />
      {query.length > 0 ? (
        <Text
          role="label"
          colorToken="text-secondary"
          style={{
            paddingHorizontal: theme.space('space_4'),
            paddingVertical: theme.space('space_1'),
          }}
        >
          {t('screen.campus.search.results')}
        </Text>
      ) : null}
      <TreeholeFeedBody key={query} query={query} onClearSearch={cancel} tags={tags} />
    </View>
  );
}

function TreeholeFeedBody({
  query,
  onClearSearch,
  tags,
}: {
  query: string;
  onClearSearch: () => void;
  tags: readonly PostTag[];
}): React.ReactElement {
  const scoped = query.length === 0;
  const filterState = useListPagination({
    scope: scoped ? { primaryTab: 'square', secondaryTab: 'confession' } : undefined,
  });
  const tagId = selectedTagId(filterState.filters);
  const clearTagFilter = React.useCallback(() => filterState.setFilters({}), [filterState]);
  const tagFilter = !scoped ? undefined : (
    <TreeholeTagFilter
      tags={tags}
      selectedTagId={tagId}
      onSelect={(id) => filterState.setFilters(id === null ? {} : { tag: String(id) })}
    />
  );
  return (
    <TreeholeFeedData
      key={`${query}:${tagId ?? 'all'}`}
      query={query}
      tagId={tagId}
      tagFilter={tagFilter}
      onClearSearch={onClearSearch}
      onClearTagFilter={clearTagFilter}
    />
  );
}

function TreeholeFeedData({
  query,
  tagId,
  tagFilter,
  onClearSearch,
  onClearTagFilter,
}: {
  query: string;
  tagId: number | null;
  tagFilter?: React.ReactNode;
  onClearSearch: () => void;
  onClearTagFilter: () => void;
}): React.ReactElement {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const client = getQueryClient();
  const session = useSession();
  const scoped = query.length === 0;
  const key = React.useMemo(
    () => [
      ...QK.postsInfinite(
        session.isSignedIn ? '_user' : '_guest',
        TREEHOLE_PAGE_SIZE,
        scoped ? (tagId === null ? undefined : String(tagId)) : undefined
      ),
      'campusReadSnapshot',
      query,
      session.status,
      session.identifier,
    ],
    [scoped, session.isSignedIn, session.status, session.identifier, tagId, query]
  );
  const initial = React.useRef(client.getQueryData<Snapshot>(key));
  const snapshot = React.useRef<Snapshot>(initial.current ?? { rows: [], page: 0, hasMore: true });
  const [rows, setRows] = React.useState(snapshot.current.rows);
  // 恢复值属于当前关键词/筛选的快照，不能取另一个筛选最近写入的Tab位置。
  const [restoredScrollOffset, setRestoredScrollOffset] = React.useState(snapshot.current.scrollOffset ?? 0);
  const [scrollToTopSignal, setScrollToTopSignal] = React.useState(0);
  const {
    pagination,
    dispatch,
    persistScrollOffset: persistTabScrollOffset,
    setCursor,
  } = useListPagination({
    scope: scoped ? { primaryTab: 'square', secondaryTab: 'confession' } : undefined,
    initial: { hasMore: snapshot.current.hasMore },
  });
  const persistScrollOffset = React.useCallback(
    (offset: number) => {
      snapshot.current = { ...snapshot.current, scrollOffset: offset };
      client.setQueryData(key, snapshot.current);
      if (scoped) persistTabScrollOffset(offset);
    },
    [scoped, client, key, persistTabScrollOffset]
  );
  const generation = React.useRef(0),
    pending = React.useRef<'refresh' | 'append' | null>(null);
  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      if (
        pending.current === 'refresh' ||
        (mode === 'append' && (pending.current || !snapshot.current.hasMore))
      ) {
        return;
      }
      const request = ++generation.current;
      const page = mode === 'refresh' ? 1 : snapshot.current.page + 1;
      pending.current = mode;
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        const data = await getPostList({
          page,
          pageSize: TREEHOLE_PAGE_SIZE,
          ...(query ? { q: query } : {}),
          ...(tagId != null ? { tagId } : {}),
        });
        if (request !== generation.current) return;
        if (!Array.isArray(data?.list) || typeof data.hasMore !== 'boolean') throw { kind: 'content' };
        const incoming = data.list.map(asPost);
        const hasMore = data.hasMore;
        const unique = new Map<number, Post>();
        for (const row of mode === 'refresh' ? [] : snapshot.current.rows) unique.set(row.id, row);
        for (const row of incoming) unique.set(row.id, row);
        const next: Snapshot = {
          rows: Array.from(unique.values()),
          page,
          hasMore,
          scrollOffset: mode === 'refresh' ? 0 : snapshot.current.scrollOffset,
        };
        snapshot.current = next;
        client.setQueryData(key, next);
        setRows(next.rows);
        setCursor(String(page));
        if (mode === 'refresh') {
          persistScrollOffset(0);
          setRestoredScrollOffset(0);
          setScrollToTopSignal((signal) => signal + 1);
        }
        dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore });
      } catch (error) {
        if (request === generation.current) {
          dispatch({
            type: mode === 'refresh' ? 'refresh:failure' : 'append:failure',
            error: errorFor(error),
          });
        }
      } finally {
        if (request === generation.current) pending.current = null;
      }
    },
    [query, tagId, key, client, dispatch, setCursor, persistScrollOffset]
  );
  React.useEffect(() => {
    if (!initial.current) void load('refresh');
    return () => {
      generation.current++;
      pending.current = null;
    };
  }, [load]);
  // 发布/删除会移除缓存：已挂载的列表也必须重读，而不只是下次挂载
  React.useEffect(() => {
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type === 'removed' && JSON.stringify(event.query.queryKey) === JSON.stringify(key)) {
        generation.current++;
        pending.current = null;
        void load('refresh');
      }
    });
    return unsubscribe;
  }, [client, key, load]);

  const refresh = () => void load('refresh');
  const append = () => void load('append');

  const emptyAction =
    query.length > 0
      ? { label: t('action.clear'), onAction: onClearSearch }
      : tagId !== null
        ? { label: t('action.clear'), onAction: onClearTagFilter }
        : { label: t('action.refresh'), onAction: refresh };

  const listHeader = (
    <View>
      {tagFilter}
      {pagination.errorScope === 'refresh' && rows.length > 0 ? (
        <View
          style={{
            paddingHorizontal: theme.space('space_4'),
            paddingVertical: theme.space('space_2'),
          }}
        >
          <InlineNotice
            tone="warning"
            message={t('screen.campus.read.refreshFailed')}
            actionLabel={t('action.retry')}
            onAction={refresh}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <ListScreen
      testID="campus-list"
      data={rows}
      keyExtractor={(row) => String(row.id)}
      pagination={pagination}
      restoredScrollOffset={restoredScrollOffset}
      scrollToTopSignal={scrollToTopSignal}
      onScrollOffset={persistScrollOffset}
      onRefresh={refresh}
      onEndReached={append}
      onRetryRefresh={refresh}
      onRetryAppend={append}
      listHeader={listHeader}
      itemSeparator={Divider}
      labels={{
        retryLabel: t('action.retry'),
        endLabel: t('screen.campus.read.listEnd'),
        empty: {
          kind: query.length > 0 ? 'noResult' : 'firstRun',
          title: t(query ? 'screen.campus.search.empty' : 'screen.campus.read.empty'),
          actionLabel: emptyAction.label,
          onAction: emptyAction.onAction,
        },
      }}
      renderItem={(row) => (
        <TreeholeFeedRow
          row={row}
          query={query || undefined}
          onOpen={() => router.push(`/campus/${row.id}` as never)}
          timeLabel={row.created_at ? formatPostTime(row.created_at, { locale }) : ''}
        />
      )}
    />
  );
}

/** 一行 = 帖子呈现 + 该行的点赞状态（列表行不加载评论） */
function TreeholeFeedRow({
  row,
  query,
  onOpen,
  timeLabel,
}: {
  row: Post;
  query?: string;
  onOpen: () => void;
  timeLabel: string;
}): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const like = useCampusLike(row, 'confession');
  const notice =
    like.notice === null ? null : like.notice === 'login' ? (
      <InlineNotice
        testID={`campus-row-${row.id}-notice`}
        tone="info"
        message={t('screen.campus.write.login')}
        actionLabel={t('action.login')}
        onAction={() => router.push('/login')}
      />
    ) : (
      <InlineNotice
        testID={`campus-row-${row.id}-notice`}
        tone="danger"
        message={t(
          like.notice === 'denied' ? 'screen.campus.write.denied' : 'screen.campus.write.likeFailed'
        )}
      />
    );
  return (
    <TreeholePostRow
      post={toTreeholePostViewModel(row)}
      timeLabel={timeLabel}
      liked={like.liked}
      likeCount={like.likeCount}
      commentCount={like.commentCount}
      onOpen={onOpen}
      onLike={like.onToggleLike}
      likeNotice={notice}
      query={query}
    />
  );
}
