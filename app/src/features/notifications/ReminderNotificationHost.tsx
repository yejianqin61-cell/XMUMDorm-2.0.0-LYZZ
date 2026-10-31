/**
 * 提醒通知的公共导航宿主（阶段C-02，R-2）
 *
 * 全 App **只在根布局挂一次**：前台收到通知点击、或冷启动取到上次点击，
 * 都交给 `resolveReminderRoute`（C-04 的唯一映射）决定要不要跳、跳到哪。
 * ⛔ 不在页面里各挂一份监听；⛔ 不在这里解析载荷结构。
 */

import * as React from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useSession } from '@/features/auth/session';
import { resolveReminderRoute } from './reminderRoute';

/** 从通知响应里取出的业务载荷（结构判断交给映射函数，⛔ 这里不猜字段） */
export function payloadOf(response: unknown): unknown {
  const data = (response as { notification?: { request?: { content?: { data?: unknown } } } } | null)
    ?.notification?.request?.content?.data;
  return data ?? null;
}

export function ReminderNotificationHost(): null {
  const router = useRouter();
  const { identifier } = useSession();
  const owner = identifier ?? null;

  React.useEffect(() => {
    let active = true;
    const navigate = (response: unknown): void => {
      if (!active) return;
      const route = resolveReminderRoute(payloadOf(response), owner);
      if (route.kind === 'route') router.push(route.href as never);
    };

    // 冷启动：App 未运行时用户点了通知，响应只在"最后一条"里
    void Notifications.getLastNotificationResponseAsync?.()
      .then((response) => {
        if (response) navigate(response);
      })
      .catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(navigate);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [owner, router]);

  return null;
}
