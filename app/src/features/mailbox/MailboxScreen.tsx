/**
 * 信箱页（`F-01`）—— 页面级组合（P2B-04）
 *
 * 形态依据：
 *   · **推入式全屏目的地**：⛔ 不是模态、⛔ 不是 Tab、⛔ 不进收纳处（宪法 4.7-1）
 *   · **列表骨架**：`P2` → `K05 ListScreen`（四态与分页状态机只在骨架里）
 *   · **分类切换**：`C14 SegmentedControl` 的 `withCount`（P2B-05 裁决：这是**页内筛选**，不是导航）
 *     → 因此它进 `filterChips`/自己的位置，⛔ **不进 `tabs` 槽位**（4.8.1-R4）
 *   · 顶栏**不显示**信箱动作：我们已经在信箱里（`showMailbox={false}`）
 *
 * ⚠️ 两个如实登记的缺口：
 *   1. `read-batch` 服务端上限 **100** → 前端分批循环（`chunkIds`）；
 *   2. 通知的 `target.path` 是 **Web 路径**（`/post/12`、`/about/campus/3`），
 *      映射到 App 路由要等系统契约 **S03 DeepLinkRouter**（Phase C，见页面清单 §5）。
 *      所以本轮：**点击 = 标已读**（真有用），导航只在映射存在时发生，⛔ 不跳到一个会 404 的路径。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AlertDialog } from '@/components/ui/AlertDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import {
  clearNotificationsByCategory,
  getNotifications,
  markNotificationsReadBatch,
} from '../../../../shared/api/notifications';
import {
  NOTIFICATION_CATEGORIES,
  canOpenNotification,
  chunkIds,
  isClearable,
  normalizeNotificationPage,
  notificationKindKey,
  unreadIds,
  type NotificationCategory,
  type NotificationRow,
} from './notifications';
import { toMailboxError } from './conversations';
import { useUnread } from './useUnread';

/**
 * 通知目标 → App 内路由。
 * ⛔ **本轮故意几乎全空**：`target.path` 是 Web 路径，硬套会跳到不存在的页面。
 * 等 **S03 DeepLinkRouter** 落地后，这里改成用它（页面清单 §5 的深链表）。
 */
export function resolveNotificationRoute(_row: NotificationRow): string | null {
  return null;
}

export function MailboxScreen(): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const { refresh: refreshUnread } = useUnread();

  const [category, setCategory] = React.useState<NotificationCategory>('interaction');
  const [rows, setRows] = React.useState<readonly NotificationRow[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [clearOpen, setClearOpen] = React.useState(false);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } = useListPagination({
    scope: { primaryTab: 'mailbox', secondaryTab: category },
  });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append', which: NotificationCategory) => {
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        const payload = await getNotifications({ page: 1, pageSize: 50, category: which });
        const page = normalizeNotificationPage(payload);
        setRows((previous) => {
          if (mode === 'refresh') return page.list;
          const seen = new Set(previous.map((row) => row.id));
          return [...previous, ...page.list.filter((row) => !seen.has(row.id))];
        });
        setCounts(page.unreadByCategory);
        dispatch({
          type: mode === 'refresh' ? 'refresh:success' : 'append:success',
          // 这条接口是 OFFSET 分页；本轮只取第一页（游标是缺口 G2）
          hasMore: false,
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
    void load('refresh', category);
  }, [load, category]);

  /** 单条已读：乐观更新 + 重新拉汇总（⛔ 不本地递减角标） */
  const markOneRead = React.useCallback(
    async (row: NotificationRow) => {
      if (row.isRead) return;
      setRows((previous) =>
        previous.map((item) => (item.id === row.id ? { ...item, isRead: true } : item))
      );
      try {
        await markNotificationsReadBatch([row.id]);
      } finally {
        refreshUnread();
      }
    },
    [refreshUnread]
  );

  const onPressRow = React.useCallback(
    (row: NotificationRow) => {
      void markOneRead(row);
      const route = resolveNotificationRoute(row);
      if (route) router.push(route);
    },
    [markOneRead, router]
  );

  /** 全部已读：按服务的硬上限 100 分批（⛔ 一批发 500 个会被 400） */
  const markAllRead = React.useCallback(async () => {
    const ids = unreadIds(rows);
    if (ids.length === 0) return;
    setRows((previous) => previous.map((row) => ({ ...row, isRead: true })));
    try {
      for (const batch of chunkIds(ids)) {
        await markNotificationsReadBatch(batch);
      }
    } finally {
      refreshUnread();
    }
  }, [rows, refreshUnread]);

  const clearCurrentCategory = React.useCallback(async () => {
    setClearOpen(false);
    try {
      await clearNotificationsByCategory(category);
    } finally {
      await load('refresh', category);
      refreshUnread();
    }
  }, [category, load, refreshUnread]);

  const categoryOptions = React.useMemo(
    () =>
      NOTIFICATION_CATEGORIES.map((key) => ({
        value: key,
        label: t(`mailbox.category.${key}` as Parameters<typeof t>[0]),
        count: counts[key] ?? 0,
      })),
    [counts, t]
  );

  const canClear = rows.some((row) => isClearable(row.type));

  return (
    <Screen testID="screen-mailbox" titleKey="screen.mailbox" bottomMode="none" showMailbox={false}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: theme.space('space_4'),
            paddingVertical: theme.space('space_2'),
            gap: theme.space('space_2'),
          }}
        >
          {/* 分类 = **页内筛选**（P2B-05 裁决），所以不进 `tabs` 槽位（4.8.1-R4） */}
          <SegmentedControl
            testID="mailbox-categories"
            options={categoryOptions}
            value={category}
            withCount
            onChange={(next) => setCategory(next as NotificationCategory)}
          />
          <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
            <Button
              testID="mailbox-mark-all-read"
              label={t('mailbox.markAllRead')}
              variant="secondary"
              size="small"
              disabled={unreadIds(rows).length === 0}
              onPress={() => void markAllRead()}
            />
            <Button
              testID="mailbox-clear"
              label={t('mailbox.clear.action')}
              variant="ghost"
              size="small"
              disabled={!canClear}
              onPress={() => setClearOpen(true)}
            />
          </View>
        </View>

        <ListScreen
          testID="mailbox-list"
          data={rows}
          keyExtractor={(row) => String(row.id)}
          pagination={pagination}
          onRefresh={() => void load('refresh', category)}
          onEndReached={() => void load('append', category)}
          onRetryRefresh={() => void load('refresh', category)}
          onRetryAppend={() => void load('append', category)}
          restoredScrollOffset={restoredScrollOffset}
          onScrollOffset={persistScrollOffset}
          labels={{
            empty: {
              kind: 'firstRun',
              title: t('mailbox.empty.title'),
              description: t('mailbox.empty.description'),
              actionLabel: t('action.refresh'),
              onAction: () => void load('refresh', category),
            },
            errorActionLabel: t('action.retry'),
            retryLabel: t('action.retry'),
            endLabel: t('mailbox.conversations.end'),
          }}
          renderItem={(row) => {
            const openable = canOpenNotification(row);
            return (
              <ListItem
                testID={`notification-${row.id}`}
                variant={openable ? 'nav' : 'action'}
                title={row.title ?? t(notificationKindKey(row.type))}
                subtitle={row.fromName ?? undefined}
                meta={t(notificationKindKey(row.type))}
                trailing={row.isRead ? undefined : <Badge text={t('mailbox.unread')} />}
                disabled={!openable}
                onPress={openable ? () => onPressRow(row) : undefined}
              />
            );
          }}
        />
      </View>

      <AlertDialog
        testID="mailbox-clear-dialog"
        visible={clearOpen}
        variant="danger"
        title={t('mailbox.clear.title')}
        body={t('mailbox.clear.body')}
        confirmLabel={t('mailbox.clear.confirm')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setClearOpen(false)}
        onConfirm={() => void clearCurrentCategory()}
      />
    </Screen>
  );
}
