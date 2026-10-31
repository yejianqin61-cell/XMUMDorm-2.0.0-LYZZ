/**
 * 会话列表（`M-11` 的数据区）—— `/me/chat` 与信箱「交易」分类**共用一份**
 *
 * 为什么抽出来（阶段D-01 / R-16）：
 *   · 契约规定「交易 Tab 仅列二手私聊会话」，于是信箱的交易分类和「我的 · 私信」是**同一种列表**；
 *   · 复制一份就意味着两处各自维护游标、四态与行渲染，⛔ 那正是 9.14 要防的重复套壳；
 *   · 因此页面级 `Screen` 留在各自宿主，本文件只管**取数 + 四态 + 行**。
 *
 * 取数：`listMyChatThreads({ limit, cursor })` → `readThreadPage` 归一化，
 *      ⛔ 游标只从服务端拿，没有 `nextCursor` 就停止追加（阶段 B-03）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen, useListPagination, type ListScope } from '@/components/ui/ListScreen';
import { useI18n } from '@/i18n';
import { listMyChatThreads } from '../../../../shared/api/marketplace';
import {
  conversationPeerName,
  conversationSubtitle,
  conversationTitle,
  hasUnread,
  mergeThreadRows,
  readThreadPage,
  toMailboxError,
  type ChatThreadRow,
} from './conversations';

export type ConversationListProps = {
  /**
   * 列表状态的归属：`(一级格, 二级格)`。不给就不做滚动位置/游标持久化。
   * ⛔ 不要在两个宿主体内 `new` 第二套状态仓库（R2 的落点是应用级单例）。
   */
  scope?: ListScope;
};

export function ConversationList({ scope }: ConversationListProps): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = React.useState<readonly ChatThreadRow[]>([]);
  /** 服务端游标：第一页刷新时清空，追加时带上（阶段 B-03） */
  const cursorRef = React.useRef<string | null>(null);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } =
    useListPagination({ scope });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      if (mode === 'append' && cursorRef.current === null) {
        dispatch({ type: 'append:success', hasMore: false });
        return;
      }
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        const payload = await listMyChatThreads({
          limit: 30,
          ...(mode === 'append' && cursorRef.current ? { cursor: cursorRef.current } : {}),
        });
        const page = readThreadPage(payload);
        cursorRef.current = page.nextCursor;
        setRows((previous) =>
          mode === 'refresh' ? page.rows : mergeThreadRows(previous, page.rows)
        );
        dispatch({
          type: mode === 'refresh' ? 'refresh:success' : 'append:success',
          hasMore: page.hasMore,
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
   * **聚焦时重取第一页**（阶段D-01）：从会话页返回后，会话行的未读数必须跟着变；
   * 否则用户读完消息回到列表，行上还挂着旧角标 —— 那是"未读与会话行不一致"。
   * ⛔ 不本地扣减：数字仍由服务端 `unread_count` 决定。
   */
  useFocusEffect(
    React.useCallback(() => {
      void load('refresh');
    }, [load])
  );

  return (
    <View style={{ flex: 1 }}>
      <ListScreen
        testID="conversations-list"
        data={rows}
        keyExtractor={(row) => String(row.thread_id)}
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
            title: t('mailbox.conversations.empty.title'),
            description: t('mailbox.conversations.empty.description'),
            actionLabel: t('mailbox.conversations.empty.action'),
            // 文案是「去看二手」→ 落点必须是二手列表（原实现指向 `/canteen`）
            onAction: () => router.push('/market'),
          },
          errorActionLabel: t('action.retry'),
          retryLabel: t('action.retry'),
          endLabel: t('mailbox.conversations.end'),
        }}
        renderItem={(row) => {
          const peerName = conversationPeerName(row, t('mailbox.conversations.peerFallback'));
          return (
            <ListItem
              testID={`conversation-${row.thread_id}`}
              variant="nav"
              title={conversationTitle(row, t('mailbox.conversations.untitled'))}
              subtitle={conversationSubtitle(row, t('mailbox.conversations.noMessage'))}
              meta={
                row.role === 'seller'
                  ? t('mailbox.conversations.roleSeller')
                  : t('mailbox.conversations.roleBuyer')
              }
              leading={<Avatar size="space_8" fallbackText={peerName.slice(0, 1)} />}
              trailing={hasUnread(row) ? <Badge count={row.unread_count} /> : undefined}
              onPress={() =>
                router.push({
                  pathname: '/me/chat/[threadId]',
                  params: { threadId: String(row.thread_id) },
                })
              }
            />
          );
        }}
      />
    </View>
  );
}
