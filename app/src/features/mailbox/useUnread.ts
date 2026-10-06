/**
 * `useUnread` / `useMailboxBadge`（P2B-01）
 *
 * 顶栏角标与信箱页读的是**同一个**数字（宪法 4.7-4：单一未读真源）。
 * 因为四个一级 Tab 页在没有 Provider 的渲染里也要能跑，这里**不依赖任何 Context**，
 * 而是订阅 `tokenStore`（冷启动水合完成后会自动补拉一次）+ 未读商店。
 */

import * as React from 'react';
import { useRouter } from 'expo-router';

import { getUnreadSummary } from '../../../../shared/api/notifications';
import { MAILBOX_ROUTE } from '@/features/navigation/tabConfig';
import { readTokenSync, subscribeToken } from '@/features/auth/tokenStore';
import { unreadStore, type UnreadState } from './unread';

export type UseUnread = UnreadState & {
  /** 已读之后必须调它（⛔ 不本地递减） */
  refresh: () => void;
};

export function useUnread(): UseUnread {
  const [token, setToken] = React.useState<string | null>(() => readTokenSync());
  const [state, setState] = React.useState<UnreadState>(() => unreadStore.get());

  // 令牌变化（冷启动水合 / 登录 / 登出）→ 跟着变
  React.useEffect(() => subscribeToken(setToken), []);

  // 未读商店变化 → 重渲染（四个 Tab 共享同一份，所以数字必然一致）
  React.useEffect(() => unreadStore.subscribe(() => setState(unreadStore.get())), []);

  React.useEffect(() => {
    if (token === null) {
      unreadStore.reset();
      return;
    }
    void unreadStore.load(token, getUnreadSummary);
  }, [token]);

  const refresh = React.useCallback(() => {
    const current = readTokenSync();
    if (current === null) {
      unreadStore.reset();
      return;
    }
    void unreadStore.load(current, getUnreadSummary, true);
  }, []);

  return { ...state, refresh };
}

export type MailboxBadge = {
  unreadCount: number;
  onMailboxPress: () => void;
};

/**
 * 顶栏角标的接线（直接展开进 `Screen`）：
 * ```tsx
 * const badge = useMailboxBadge();
 * <Screen titleKey="screen.tools" {...badge} />
 * ```
 * 四个一级 Tab 必须**都**用它 —— 这就是"四屏一致、角标常驻"的实现方式。
 * `total === null`（拿不到）时给 `0`：`TopBar` 的 `unreadCount > 0` 才显示角标，
 * 所以"拿不到"表现为**不显示**，⛔ 不是显示一个 0。
 */
export function useMailboxBadge(): MailboxBadge {
  const router = useRouter();
  const { total } = useUnread();
  const onMailboxPress = React.useCallback(() => {
    router.push(MAILBOX_ROUTE);
  }, [router]);
  return { unreadCount: total ?? 0, onMailboxPress };
}
