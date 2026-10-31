/**
 * 信箱页（`F-01`）—— 页面级组合（P2B-04）
 *
 * 形态依据：
 *   · **消息一级目的地**：原生 Tab 内容区，复用唯一底栏净空。
 *   · **列表骨架**：`P2` → `K05 ListScreen`（四态与分页状态机只在骨架里）
 *   · **分类切换**：`C14 SegmentedControl` 的 `withCount`（P2B-05 裁决：这是**页内筛选**，不是导航）
 *     → 因此它进 `filterChips`/自己的位置，⛔ **不进 `tabs` 槽位**（4.8.1-R4）
 *   · 顶栏**不显示**信箱动作：我们已经在信箱里（`showMailbox={false}`）
 *
 * ⚠️ 两个如实登记的缺口：
 *   1. `read-batch` 服务端上限 **100** → 前端分批循环（`chunkIds`）；
 *   2. 通知的 `target.path` 是 **Web 路径**（`/post/12`、`/about/campus/3`）——
 *      阶段3-03 起由 `./targets` 的唯一映射换成 App 路由，⛔ 不直接拿 Web 路径跳。
 *      （旧注释写的「要等 S03 DeepLinkRouter」已过期：映射早已落地。）
 *
 * 阶段D-01：「交易」分类改为**会话列表**（契约：交易 Tab 仅列二手私聊会话），
 *   通知只留在「互动 / 系统」两个分类。因此交易分类
 *   ⛔ 不提供「全部已读 / 清空」（那两个动作不能代替读会话，契约 L80），
 *   它的分类角标改读 `unread-summary`（契约 L83-85）；列表本体在 `./ConversationList`
 *   —— 与 `/me/chat` 共用同一实现，⛔ 不复制第二份取数。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AlertDialog } from '@/components/ui/AlertDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { TAB_BAR_HEIGHT } from '@/features/navigation/tabConfig';
import {
  clearNotificationsByCategory,
  getNotifications,
  getUnreadSummary,
  markNotificationsReadBatch,
} from '../../../../shared/api/notifications';
import {
  NOTIFICATION_CATEGORIES,
  chunkIds,
  isClearable,
  normalizeNotificationPage,
  notificationKindKey,
  unreadCountsByCategory,
  unreadIds,
  type NotificationCategory,
  type NotificationRow,
} from './notifications';
import { ConversationList } from './ConversationList';
import { toMailboxError } from './conversations';
import { resolveTarget } from './targets';
import { useUnread } from './useUnread';

/**
 * 通知目标 → App 内路由（阶段3-03 起**唯一实现在 `./targets`**）。
 * 这里保留同名导出，供既有调用方/用例使用。
 */
export { resolveNotificationRoute } from './targets';

/** 「交易」分类的会话列表状态归属（R2：滚动位置/游标按 `(一级格, 二级格)` 各存一份） */
const TRADE_SCOPE = { primaryTab: 'mailbox', secondaryTab: 'conversations' } as const;

export function MailboxScreen(): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const { refresh: refreshUnread } = useUnread();

  const [category, setCategory] = React.useState<NotificationCategory>('interaction');
  const [rows, setRows] = React.useState<readonly NotificationRow[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [clearOpen, setClearOpen] = React.useState(false);
  /** 交易分类列的是会话，不是通知（阶段D-01 / R-16） */
  const isTrade = category === 'transaction';
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

  /**
   * 交易分类不加载通知页 —— 它的分类角标改读服务端未读汇总（契约 L83-85）。
   * ⛔ 拿不到就不主张：保留上一次已知值，不伪造一个 0。
   */
  const loadCounts = React.useCallback(async () => {
    try {
      setCounts(unreadCountsByCategory(await getUnreadSummary()));
    } catch {
      // 静默：角标来自服务端，取不到时页面显示上一次的值而不是猜一个数字
    }
  }, []);

  /**
   * 阶段3-04：**聚焦时重取第一页**（避免展示旧摘要/旧未读）。
   * 首次进入由同一个 focus 生效；⛔ 不做本地扣减，也不伪造成功。
   * 阶段D-01：交易分类在这里只重取角标，列表由 `ConversationList` 自己的聚焦刷新负责。
   */
  useFocusEffect(
    React.useCallback(() => {
      if (isTrade) {
        void loadCounts();
        return;
      }
      void load('refresh', category);
    }, [load, loadCounts, category, isTrade])
  );

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
      const resolution = resolveTarget(row.target);
      if (resolution.kind === 'route') router.push(resolution.href);
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
    <Screen
      testID="screen-mailbox"
      titleKey="screen.mailbox"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_HEIGHT}
    >
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
          {/* 阶段D-01：交易分类只列会话 —— ⛔ 不给通知的批量动作（它们不能代替读会话） */}
          {isTrade ? null : (
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
          )}
        </View>

        {isTrade ? (
          <ConversationList scope={TRADE_SCOPE} />
        ) : (
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
              // 阶段3-03/04：可点性、落点与说明都来自唯一映射函数
              const resolution = resolveTarget(row.target);
              const openable = resolution.kind === 'route';
              // 摘要优先（被回复 > 来源），没有再退回作者名；⛔ 不留空白行
              const subtitle = row.replyExcerpt ?? row.sourceExcerpt ?? row.fromName ?? undefined;
              return (
                <ListItem
                  testID={`notification-${row.id}`}
                  variant={openable ? 'nav' : 'action'}
                  title={row.title ?? t(notificationKindKey(row.type))}
                  subtitle={subtitle}
                  meta={openable ? t(notificationKindKey(row.type)) : t('mailbox.targetUnavailable')}
                  trailing={row.isRead ? undefined : <Badge text={t('mailbox.unread')} />}
                  // 失效/待补目标：仍可标已读，但⛔ 不跳转（行内已给"内容不可查看"）
                  onPress={openable ? () => onPressRow(row) : () => void markOneRead(row)}
                />
              );
            }}
          />
        )}
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
