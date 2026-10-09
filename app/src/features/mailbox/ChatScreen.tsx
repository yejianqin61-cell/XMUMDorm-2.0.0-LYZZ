/**
 * 私信会话页（`M-12`）—— 页面级组合（P2B-06）
 *
 * 形态依据：
 *   · **原型 `P5`**（宪法 9.3：二手私信必须**独立存在**，⛔ 不许塞进通用件降级实现）
 *   · **气泡**用 `D05 ChatBubble`；**输入条**用 `O08 InputSheet`
 *     —— P2B-06 的裁决：`D06 ChatComposer` 与 `O08` 的能力集**完全重合**
 *     （`value/onChangeText/sendLabel/onSend/maxLength/counter/disabled/sending` + 键盘与 inset 合并），
 *     再建一个就是 **9.14-① 同语义多层**；⛔ 本轮不建 `D06`，改在组件定义里登记（同 `K22`/`C14` 的处理）。
 *   · **轮询**：4s，进入开始、**离开即停**、后台停（`shouldPoll` 是纯函数，可断言）
 *   · **上限 1200 由客户端拦**（服务端是**静默截断**，用户看不见）
 *
 * ⚠️ 两个如实登记的缺口：
 *   1. 消息接口现在提供历史游标；本页仍先使用当前页的 `id > lastSeen` 过滤轮询增量，
 *      历史页合并留给 Phase 2 后续任务；
 *   2. 读会话时把 `marketplace_chat` 通知一并标已读，否则**读完了角标还在**。
 */

import * as React from 'react';
import { AppState, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';

import { ChatBubble } from '@/components/ui/ChatBubble';
import { InputSheet } from '@/components/ui/InputSheet';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import {
  getMarketplaceThreadMessages,
  listMyChatThreads,
  markMarketplaceThreadRead,
  sendMarketplaceThreadMessage,
} from '../../../../shared/api/marketplace';
import { getMe } from '../../../../shared/api/users';
import {
  CHAT_MAX_MESSAGE_LEN,
  CHAT_POLL_INTERVAL_MS,
  canSend,
  lastSeenId,
  mergeMessages,
  messagesAfter,
  normalizeChat,
  shouldPoll,
  type ChatMessage,
  type ChatThread,
} from './chat';
import { normalizeThreadRows, toMailboxError } from './conversations';
import { useUnread } from './useUnread';

export function ChatScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const params = useLocalSearchParams<{ threadId?: string }>();
  const threadId = Number(params.threadId);
  const { refresh: refreshUnread } = useUnread();

  const [thread, setThread] = React.useState<ChatThread | null>(null);
  const [messages, setMessages] = React.useState<readonly ChatMessage[]>([]);
  const [viewerId, setViewerId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [focusReady, setFocusReady] = React.useState(false);
  const [threadAccessGranted, setThreadAccessGranted] = React.useState(false);
  const [historyCursor, setHistoryCursor] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [appActive, setAppActive] = React.useState(AppState.currentState === 'active');
  const lastSeenRef = React.useRef(0);
  const { pagination, dispatch } = useListPagination({
    scope: { primaryTab: 'me', secondaryTab: `chat-${threadId}` },
  });

  /* 屏幕聚焦态（离开即停的前提） */
  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  /* 后台停：AppState */
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  /** 拉一次消息（首次 = 全量；之后 = 只取增量，避免整页覆盖导致闪烁） */
  const pull = React.useCallback(
    async (mode: 'initial' | 'poll' | 'history') => {
      if (mode === 'initial') dispatch({ type: 'refresh:start' });
      if (mode === 'history') dispatch({ type: 'append:start' });
      try {
        if (mode === 'initial') {
          setThreadAccessGranted(false);
          // 客户端只做深链预检；后端消息接口仍是最终授权边界。
          const threads = normalizeThreadRows(await listMyChatThreads());
          if (!threads.some((row) => row.thread_id === threadId)) {
            dispatch({ type: 'refresh:failure', error: { kind: 'unknown' } });
            return;
          }
          setThreadAccessGranted(true);
        } else if (!threadAccessGranted || (mode === 'history' && !historyCursor)) {
          if (mode === 'history') dispatch({ type: 'append:success', hasMore: false });
          return;
        }
        const payload = await getMarketplaceThreadMessages(
          threadId,
          mode === 'history' ? { cursor: historyCursor } : undefined
        );
        // 自己的 id 只在第一次拉；之后从 state 里读（⛔ 不在每次轮询里重复请求）
        let me = viewerId;
        if (me === null) {
          const profile = await getMe();
          me = Number((profile as { id?: number } | null)?.id) || 0;
          if (me > 0) setViewerId(me);
        }
        const normalized = normalizeChat(payload, me);
        if (!normalized) {
          if (mode === 'initial') dispatch({ type: 'refresh:failure', error: { kind: 'unknown' } });
          return;
        }
        setThread(normalized.thread);
        const fresh = mode === 'initial'
          ? normalized.messages
          : messagesAfter(normalized.messages, lastSeenRef.current);
        if (mode === 'initial') {
          setMessages(normalized.messages);
          lastSeenRef.current = lastSeenId(normalized.messages);
          setHistoryCursor(normalized.nextCursor);
          dispatch({ type: 'refresh:success', hasMore: normalized.hasMore });
        } else if (mode === 'history') {
          setMessages((previous) => mergeMessages(previous, normalized.messages));
          setHistoryCursor(normalized.nextCursor);
          dispatch({ type: 'append:success', hasMore: normalized.hasMore });
        } else if (fresh.length > 0) {
          setMessages((previous) => mergeMessages(previous, fresh));
          lastSeenRef.current = lastSeenId([...messages, ...fresh]);
        }
        // 有新消息 → 标已读 + 重新拉未读汇总（⛔ 不本地递减角标）
        if (fresh.some((message) => !message.mine)) {
          await markMarketplaceThreadRead(threadId);
          refreshUnread();
        }
      } catch (error) {
        setThreadAccessGranted(false);
        if (mode === 'initial') dispatch({ type: 'refresh:failure', error: toMailboxError(error) });
        if (mode === 'history') dispatch({ type: 'append:failure', error: toMailboxError(error) });
      } finally {
        if (mode === 'initial') setFocusReady(true);
      }
    },
    [dispatch, historyCursor, messages, refreshUnread, threadAccessGranted, threadId, viewerId]
  );

  React.useEffect(() => {
    if (!Number.isInteger(threadId) || threadId <= 0) {
      setThreadAccessGranted(false);
      dispatch({ type: 'refresh:failure', error: { kind: 'unknown' } });
      setFocusReady(true);
      return;
    }
    void pull('initial');
    // 只跑一次（首次装载）；轮询在下面那条 effect 里
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  /* 4s 轮询：只有"页面可见 + App 在前台"才建立定时器 —— 离开即停 */
  React.useEffect(() => {
    if (!focusReady) return;
    if (!threadAccessGranted) return;
    if (!shouldPoll({ focused, appActive })) return;
    const timer = setInterval(() => {
      void pull('poll');
    }, CHAT_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusReady, focused, appActive, threadAccessGranted, threadId]);

  const send = React.useCallback(async () => {
    if (!threadAccessGranted || !canSend(draft)) return;
    const text = draft.trim();
    setSending(true);
    try {
      const result = await sendMarketplaceThreadMessage(threadId, text);
      const id = Number((result as { id?: number } | null)?.id) || Date.now();
      // 乐观显示自己那条（⛔ 不等下一次轮询）；下一轮轮询按 id 去重
      setMessages((previous) =>
        mergeMessages(previous, [
          { id, mine: true, content: text, createdAt: null, senderName: null },
        ])
      );
      lastSeenRef.current = Math.max(lastSeenRef.current, id);
      setDraft('');
    } catch (error) {
      dispatch({ type: 'append:failure', error: toMailboxError(error) });
    } finally {
      setSending(false);
    }
  }, [dispatch, draft, threadAccessGranted, threadId]);

  const canSubmit = canSend(draft);

  return (
    <Screen testID="screen-chat" titleKey="mailbox.conversations.title" bottomMode="own">
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: theme.space('space_4'), paddingBottom: theme.space('space_2') }}>
          <Text role="label" colorToken="text-secondary" numberOfLines={1}>
            {thread?.itemTitle ?? t('mailbox.conversations.untitled')}
          </Text>
        </View>

        <ListScreen
          testID="chat-messages"
          data={messages}
          keyExtractor={(message) => String(message.id)}
          pagination={pagination}
          onRefresh={() => void pull('initial')}
          onEndReached={() => void pull('history')}
          onRetryRefresh={() => void pull('initial')}
          labels={{
            empty: {
              kind: 'firstRun',
              title: t('mailbox.conversations.noMessage'),
              description: t('mailbox.chat.empty.description'),
              actionLabel: t('action.refresh'),
              onAction: () => void pull('initial'),
            },
            errorActionLabel: t('action.retry'),
            retryLabel: t('action.retry'),
            endLabel: t('mailbox.conversations.end'),
          }}
          renderItem={(message) => (
            <ChatBubble
              testID={`chat-message-${message.id}`}
              mine={message.mine}
              content={message.content}
              senderLabel={message.mine ? undefined : message.senderName ?? undefined}
              timeLabel={message.createdAt ?? undefined}
              read={message.mine && message.id <= lastSeenRef.current}
              readLabel={t('mailbox.chat.read')}
            />
          )}
        />
      </View>

      {/* 输入条：`O08 InputSheet`（⛔ 不为聊天再建一个 D06；见文件头裁决）
          · 上限由 `maxLength` + `counter` 承担（RN 的 TextInput 直接拦住输入，⛔ 不静默截断）
          · ⚠️ 用 `sendDisabled`（P2B-06 为此给 O08 补的 prop）而不是 `disabled`：
            `disabled` 会把**输入框也变成不可编辑**，用户连字都打不进去 */}
      <InputSheet
        testID="chat-composer"
        value={draft}
        onChangeText={setDraft}
        placeholder={t('mailbox.chat.placeholder')}
        sendLabel={t('mailbox.chat.send')}
        onSend={() => void send()}
        maxLength={CHAT_MAX_MESSAGE_LEN}
        counter
        disabled={!threadAccessGranted || !Number.isInteger(threadId) || threadId <= 0}
        sendDisabled={!canSubmit}
        sending={sending}
      />
    </Screen>
  );
}
