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
import { useI18n } from '@/i18n';
import { getQueryClient } from '@/shared/queryClient';
import { QK } from '../../../../shared/query/queryKeys';
import { getConfessionWindow } from '../../../../shared/api/confessions';
import { wallTemplateLabel } from './wallTemplates';
import { asWall, errorFor, type Post } from './campusModel';

/** 万能墙一屏一篇的窗口大小（后端 limit 1–10） */
export const WALL_WINDOW_LIMIT = 5;

export type WallFeedSnapshot = {
  rows: readonly Post[];
  cursor: number | null;
  hasMore: boolean;
  scrollOffset?: number;
  /** 服务端已确认删除；与窗口快照同寿命，刷新/分页不得重新引入。 */
  deletedIds?: readonly number[];
  /** 从详情直接删除时可能尚无列表，标记空快照仍需首次加载。 */
  needsRefresh?: boolean;
};

export function WallFeed({ testID = 'wall-feed' }: { testID?: string }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const client = getQueryClient();
  const key = React.useMemo(() => [...QK.confessionWindow('_guest'), 'wallReadSnapshot'], []);
  const initial = React.useRef(client.getQueryData<WallFeedSnapshot>(key));
  const snapshot = React.useRef<WallFeedSnapshot>(
    initial.current ?? { rows: [], cursor: null, hasMore: true, needsRefresh: true }
  );
  const [rows, setRows] = React.useState(snapshot.current.rows);
  const [restoredScrollOffset, setRestoredScrollOffset] = React.useState(snapshot.current.scrollOffset ?? 0);
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
      pending.current = mode;
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        const data = await getConfessionWindow({
          cursor: mode === 'refresh' ? null : snapshot.current.cursor,
          direction: 'older',
          limit: WALL_WINDOW_LIMIT,
        });
        if (request !== generation.current) return;
        if (!Array.isArray(data?.items) || typeof data.has_older !== 'boolean') {
          throw { kind: 'content' };
        }
        const incoming = data.items.map(asWall);
        const hasMore = data.has_older;
        const cursor =
          typeof data.oldest_cursor === 'number' &&
          Number.isSafeInteger(data.oldest_cursor) &&
          data.oldest_cursor > 0
            ? data.oldest_cursor
            : null;
        // 声称还有下一页却没有游标 = 后端契约破坏：显示错误，⛔ 不循环请求
        if (
          hasMore &&
          (!Number.isSafeInteger(cursor) || Number(cursor) <= 0 || (cursor === snapshot.current.cursor && mode === 'append'))
        ) {
          throw { kind: 'content' };
        }
        const unique = new Map<number, Post>();
        // 在响应落地时读取最新删除回执，覆盖请求发出后发生的删除。
        const deletedIds = snapshot.current.deletedIds;
        const deleted = new Set(deletedIds);
        for (const row of mode === 'refresh' ? [] : snapshot.current.rows) {
          if (!deleted.has(row.id)) unique.set(row.id, row);
        }
        for (const row of incoming) {
          if (!deleted.has(row.id)) unique.set(row.id, row);
        }
        const next: WallFeedSnapshot = {
          rows: Array.from(unique.values()),
          cursor,
          hasMore,
          deletedIds,
          scrollOffset: mode === 'refresh' ? 0 : snapshot.current.scrollOffset,
        };
        snapshot.current = next;
        client.setQueryData(key, next);
        setRows(next.rows);
        setCursor(cursor === null ? null : String(cursor));
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
    [client, dispatch, key, persistScrollOffset, setCursor]
  );
  React.useEffect(() => {
    if (!initial.current || initial.current.needsRefresh) void load('refresh');
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
      if (
        publishing || event.type !== 'updated' || event.action.type !== 'success' ||
        JSON.stringify(event.query.queryKey) !== snapshotKey
      ) return;
      const next = client.getQueryData<WallFeedSnapshot>(key);
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
  }, [client, key]);

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
