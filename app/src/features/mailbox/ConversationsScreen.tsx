/**
 * 私信会话列表页（`M-11`）—— 页面级组合（P2B-03）
 *
 * 形态依据：
 *   · **骨架**：`P2` 列表 → `K05 ListScreen`（四态与分页状态机只在骨架里实现，⛔ 页面不许自写）
 *   · **归属**：私信在「我的」下面，⛔ 不占 Tab（宪法 4.9.4 + 骨架规范 §2.5 / TO-CONFIRM C-07）
 *   · **取数**：本仓没有 `useQuery`（`p1-17-canteen.test.tsx:565` 断言源码里不出现它），
 *     所以走既有"手工取数外壳"的路子：`listMyChatThreads()` + 分页 reducer
 *
 * ⚠️ 后端这条接口本轮**一次给到上限 100 条、不做分页**（`LIMIT` 夹紧在 1..100），
 *    所以页脚一上来就是"到底了"。真正的翻页要等后端加游标（缺口 G2），登记在案。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n';
import { listMyChatThreads } from '../../../../shared/api/marketplace';
import {
  conversationPeerName,
  conversationSubtitle,
  conversationTitle,
  hasUnread,
  mergeThreadRows,
  normalizeThreadRows,
  toMailboxError,
  type ChatThreadRow,
} from './conversations';

const SCOPE = { primaryTab: 'me', secondaryTab: 'conversations' } as const;

export function ConversationsScreen(): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = React.useState<readonly ChatThreadRow[]>([]);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } =
    useListPagination({ scope: SCOPE });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        const payload = await listMyChatThreads({ limit: 100 });
        const incoming = normalizeThreadRows(payload);
        setRows((previous) =>
          mode === 'refresh' ? incoming : mergeThreadRows(previous, incoming)
        );
        // 后端这条接口本轮不分页 → 一次到底
        dispatch({
          type: mode === 'refresh' ? 'refresh:success' : 'append:success',
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
    void load('refresh');
  }, [load]);

  return (
    <Screen testID="screen-conversations" titleKey="mailbox.conversations.title" bottomMode="none">
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
              onAction: () => router.push('/canteen'),
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
    </Screen>
  );
}
