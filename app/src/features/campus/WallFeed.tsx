/**
 * WallFeed —— 万能墙模块（广场首页第 2 页）
 *
 * 与树洞的边界（宪法 4.1.1）：**只允许在导航层合并**，数据层/信息流层不得混排。
 * 因此这里完全不使用树洞的实名帖子组件：匿名投影 + 六种版式标题，都走 `WallTemplate*`。
 *
 * 分页是**服务端窗口游标**（`cursor`/`older`），不是页码 —— 与树洞的 `page` 分页分开维护。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { InlineNotice } from '@/components/ui/InlineNotice';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { useTheme } from '@/design-system/theme';
import { useSession } from '@/features/auth/session';
import { useI18n } from '@/i18n';
import { getQueryClient } from '@/shared/queryClient';
import { QK } from '../../../../shared/query/queryKeys';
import { getConfessionWindow } from '../../../../shared/api/confessions';
import { wallTemplateLabel } from './wallTemplates';
import { asWall, errorFor, type Post } from './campusModel';

/** 万能墙一屏一篇的窗口大小（后端 limit 1–10） */
export const WALL_WINDOW_LIMIT = 5;
// 与详情删除回执保持同一入口；模块常量避免把不可变key交给组件内手工memo。
const WALL_SNAPSHOT_KEY = [...QK.confessionWindow('_guest'), 'wallReadSnapshot'];

export type WallFeedSnapshot = {
  /** 固定删除回执入口不变；只有当前身份可以恢复带互动/本人标记的行。 */
  viewerIdentity?: string;
  rows: readonly Post[];
  cursor: number | null;
  hasMore: boolean;
  /** 已加载窗口数，仅用于自动失效时重读相同范围。 */
  windows?: number;
  scrollOffset?: number;
  /** 服务端已确认删除；与窗口快照同寿命，刷新/分页不得重新引入。 */
  deletedIds?: readonly number[];
  /** 从详情直接删除时可能尚无列表，标记空快照仍需首次加载。 */
  needsRefresh?: boolean;
};

export function WallFeed({ testID = 'wall-feed' }: { testID?: string }): React.ReactElement {
  const session = useSession();
  const identity = JSON.stringify([session.status, session.identifier, session.isSignedIn]);
  return <WallFeedSession key={identity} testID={testID} identity={identity} />;
}

function WallFeedSession({ testID, identity }: { testID: string; identity: string }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const client = getQueryClient();
  const key = WALL_SNAPSHOT_KEY;
  const cached = client.getQueryData<WallFeedSnapshot>(key);
  const initial = React.useRef(cached?.viewerIdentity === identity ? cached : undefined);
  const snapshot = React.useRef<WallFeedSnapshot>(
    initial.current ?? {
      viewerIdentity: identity, rows: [], cursor: null, hasMore: true, needsRefresh: true,
      // 删除是公开内容的服务端成功事实，不因换号重新引入；旧身份的行与互动状态不复用。
      deletedIds: cached?.deletedIds,
    }
  );
  const [rows, setRows] = React.useState(snapshot.current.rows);
  const [restoredScrollOffset, setRestoredScrollOffset] = React.useState(
    () => cached?.viewerIdentity === identity ? cached.scrollOffset ?? 0 : 0
  );
  const [scrollToTopSignal, setScrollToTopSignal] = React.useState(0);
  const { pagination, dispatch, persistScrollOffset: persistTabScrollOffset, setCursor } =
    useListPagination({
      scope: { primaryTab: 'square', secondaryTab: 'wall' },
      initial: { hasMore: snapshot.current.hasMore },
    });
  const persistScrollOffset = React.useCallback(
    (offset: number) => {
      snapshot.current = { ...snapshot.current, scrollOffset: offset };
      client.setQueryData(key, snapshot.current);
      persistTabScrollOffset(offset);
    },
    [client, key, persistTabScrollOffset]
  );
  const generation = React.useRef(0),
    pending = React.useRef<'refresh' | 'append' | 'reload' | null>(null);
  const load = React.useCallback(
    async (mode: 'refresh' | 'append' | 'reload') => {
      if (
        pending.current === 'refresh' ||
        (pending.current === 'reload' && (mode !== 'refresh' || snapshot.current.rows.length === 0)) ||
        (mode === 'append' && (pending.current || !snapshot.current.hasMore))
      ) {
        return;
      }
      const request = ++generation.current;
      pending.current = mode;
      dispatch({ type: mode === 'append' ? 'append:start' : 'refresh:start' });
      try {
        let cursor = mode === 'append' ? snapshot.current.cursor : null;
        const previousWindows = snapshot.current.windows ?? Math.max(1, Math.ceil(snapshot.current.rows.length / WALL_WINDOW_LIMIT));
        const targetWindows = mode === 'reload' ? previousWindows : 1;
        let windows = 0;
        let hasMore = true;
        const incoming: Post[] = [];
        for (; windows < targetWindows;) {
          const data = await getConfessionWindow({ cursor, direction: 'older', limit: WALL_WINDOW_LIMIT });
          if (request !== generation.current) return;
          if (!Array.isArray(data?.items) || typeof data.has_older !== 'boolean') throw { kind: 'content' };
          hasMore = data.has_older;
          const nextCursor = typeof data.oldest_cursor === 'number' && Number.isSafeInteger(data.oldest_cursor) && data.oldest_cursor > 0
            ? data.oldest_cursor : null;
          // 每个窗口都校验游标进展，自动重读同样不能循环请求。
          if (hasMore && (nextCursor === null || nextCursor === cursor)) throw { kind: 'content' };
          incoming.push(...data.items.map(asWall));
          cursor = nextCursor;
          windows++;
          if (!hasMore) break;
        }
        const unique = new Map<number, Post>();
        // 在响应落地时读取最新删除回执，覆盖请求发出后发生的删除。
        const deletedIds = snapshot.current.deletedIds;
        const deleted = new Set(deletedIds);
        for (const row of mode === 'append' ? snapshot.current.rows : []) {
          if (!deleted.has(row.id)) unique.set(row.id, row);
        }
        for (const row of incoming) {
          if (!deleted.has(row.id)) unique.set(row.id, row);
        }
        const next: WallFeedSnapshot = {
          viewerIdentity: identity,
          rows: Array.from(unique.values()),
          cursor,
          hasMore,
          windows: mode === 'append' ? previousWindows + windows : windows,
          deletedIds,
          scrollOffset: mode === 'refresh' ? 0 : snapshot.current.scrollOffset,
        };
        snapshot.current = next;
        client.setQueryData(key, next);
        setRows(next.rows);
        setCursor(cursor === null ? null : String(cursor));
        if (mode === 'refresh') {
          setRestoredScrollOffset(0);
          setScrollToTopSignal((signal) => signal + 1);
        }
        if (mode !== 'append') persistScrollOffset(next.scrollOffset ?? 0);
        dispatch({ type: mode === 'append' ? 'append:success' : 'refresh:success', hasMore });
      } catch (error) {
        if (request === generation.current) {
          if (mode === 'reload') client.setQueryData(key, snapshot.current);
          dispatch({
            type: mode === 'append' ? 'append:failure' : 'refresh:failure',
            error: errorFor(error),
          });
        }
      } finally {
        if (request === generation.current) pending.current = null;
      }
    },
    [client, dispatch, key, persistScrollOffset, setCursor, identity]
  );
  React.useEffect(() => {
    if (!initial.current || initial.current.needsRefresh) void load('reload');
    return () => {
      generation.current++;
      pending.current = null;
    };
  }, [load]);

  // 详情删除会更新快照；仍挂载在返回栈中的列表也要同步，不能只在重挂时读一次。
  React.useEffect(() => {
    const snapshotKey = JSON.stringify(key);
    let publishing = false;
    return client.getQueryCache().subscribe((event) => {
      if (event.type === 'removed' && JSON.stringify(event.query.queryKey) === snapshotKey) {
        const mode = pending.current === 'refresh' ? 'refresh' : 'reload';
        generation.current++;
        pending.current = null;
        void load(mode);
        return;
      }
      if (
        publishing || event.type !== 'updated' || event.action.type !== 'success' ||
        JSON.stringify(event.query.queryKey) !== snapshotKey
      ) return;
      const next = client.getQueryData<WallFeedSnapshot>(key);
      if (next?.viewerIdentity !== undefined && next.viewerIdentity !== identity) return;
      if (next && next !== snapshot.current) {
        // 缓存可能已 GC，但列表仍挂载。仅含删除回执的空快照不能清空现有其他行。
        const deletedIds = [...new Set([...(snapshot.current.deletedIds ?? []), ...(next.deletedIds ?? [])])];
        const merged = next.needsRefresh ? {
          ...snapshot.current,
          deletedIds,
          rows: snapshot.current.rows.filter((row) => !deletedIds.includes(row.id)),
        } : next;
        snapshot.current = merged;
        setRows(merged.rows);
        if (merged !== next) {
          // setQueryData 也会同步通知此订阅；结构共享可能返回旧对象，不能用引用变化防重入。
          publishing = true;
          try {
            snapshot.current = client.setQueryData<WallFeedSnapshot>(key, merged) ?? merged;
          } finally {
            publishing = false;
          }
        }
      }
    });
  }, [client, key, load, identity]);

  const refresh = () => void load('refresh');
  const append = () => void load('append');

  return (
    <ListScreen
      testID={testID}
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
      listHeader={pagination.errorScope === 'refresh' && rows.length > 0 ? (
        <View style={{ paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_2') }}>
          <InlineNotice
            tone="warning"
            message={t('screen.campus.read.refreshFailed')}
            actionLabel={t('action.retry')}
            onAction={refresh}
          />
        </View>
      ) : undefined}
      labels={{
        retryLabel: t('action.retry'),
        endLabel: t('screen.campus.read.listEnd'),
        empty: {
          kind: 'firstRun',
          title: t('screen.campus.read.empty'),
          actionLabel: t('action.refresh'),
          onAction: refresh,
        },
      }}
      renderItem={(row) => (
        <ListItem
          testID={`campus-row-${row.id}`}
          title={wallTemplateLabel(t, row.template_key)}
          subtitle={row.content}
          meta={t('screen.campus.read.anonymous')}
          onPress={() => router.push(`/campus/wall/${row.id}` as never)}
        />
      )}
    />
  );
}
