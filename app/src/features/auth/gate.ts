/**
 * 会话门（`A-01` 的规则层）—— 纯函数，可测
 *
 * ## 要解决的病根：**闪屏**
 * 冷启动时 `expo-secure-store` 读令牌是**异步**的，所以会话状态先经过 `restoring`。
 * 如果在这一刻就按"未登录"处理，用户会看到**登录页闪一下**再回到内容 —— 这就是本任务要拦的行为。
 * 规则一句话：**`restoring` 期间只许显示启动位，⛔ 不许跳转**。
 *
 * ## 哪些路由要身份
 * 内测期按**最小清单**（⛔ 不是"全都要"）：身份是必需的只有「我的」与发布链路，
 * 广场/工具/校园里可以匿名浏览 —— 这样内测时"没登录也能看看"不会变成一堵墙。
 */

import type { SessionStatus } from './session';

/** 需要身份的路径前缀（⛔ 加路径要同时想一想：匿名用户能不能看） */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  '/me',
  '/mailbox',
  '/publish',
  '/publish-center',
];

/** 这个路径需要身份吗？ */
export function routeRequiresAuth(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export type GateAction =
  /** 还在水合 → 显示启动位，⛔ 不跳转 */
  | 'splash'
  /** 放行 */
  | 'allow'
  /** 送去登录页 */
  | 'toLogin';

/** 门的动作（纯函数）：这是"不闪屏"的唯一判据处 */
export function resolveGateAction(
  status: SessionStatus,
  requiresAuth: boolean
): GateAction {
  if (status === 'restoring') return 'splash'; // ⛔ 无论路径是什么，都不许在水合期跳转
  if (status === 'signedIn') return 'allow';
  // `signedOut` 与 `expired` 都去登录页；两者的区别由登录页自己说明（`expired` 要给原因）
  return requiresAuth ? 'toLogin' : 'allow';
}

/** 登录页要不要解释"为什么被送到这里"（`expired` ≠ 普通未登录） */
export function loginNoticeKeyFor(status: SessionStatus): 'auth.expired' | null {
  return status === 'expired' ? 'auth.expired' : null;
}
