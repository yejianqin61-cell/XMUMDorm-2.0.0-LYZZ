/**
 * 通知目标 → App 落点（阶段3-03，J2-5）
 *
 * ## 为什么只能有一处
 * 通知的 `target` 由服务端给出 `{type,id,title,path,available,comment_id}`，其中 `path`
 * 多数是 **Web 路径**（`/post/12`、`/about/campus/3`）—— ⛔ 不能直接喂给 Expo Router。
 * 以前 `MailboxScreen` 内联了一个 3 分支的 switch，其余目标一律 null；
 * 现在收成本文件：页面只问"能不能跳、跳到哪、不能跳为什么"。
 *
 * ## 三档结果（页面据此决定可点性与说明文案）
 * - `route`：App 路由已存在，直接 push；
 * - `unavailable`：目标失效（删除/隐藏/无权限）或 id 非法 —— **不跳**，行内给"内容不可查看"；
 * - `pending`：类型已知但**落点还没定/页面还没建**（`campus_post` 待丙核对；课评页未建；
 *   App 没有热门/公告页）—— **不猜 Web 路径**，只显示说明。
 *
 * ⛔ 本文件不 import 任何 UI 组件；纯函数，可表驱动测。
 */

import type { Href } from 'expo-router';

import type { NotificationRow, NotificationTarget } from './notifications';

type StringHref = Extract<Href, string>;

export type TargetResolution =
  | { kind: 'route'; href: StringHref }
  /** `gone` = 服务端判定不可用；`invalid` = id 不合法 */
  | { kind: 'unavailable'; reason: 'gone' | 'invalid' }
  /** `needs-owner` = 落点待负责人确认；`missing-route` = 类型已知但 App 没有这个页面 */
  | { kind: 'pending'; reason: 'needs-owner' | 'missing-route' };

/** 已有稳定 App 路由的目标类型（与服务端 `target.type` 对齐） */
const ROUTES: Record<string, (id: number) => StringHref> = {
  post: (id) => `/campus/${id}` as StringHref,
  club: (id) => `/clubs/${id}` as StringHref,
  club_activity: (id) => `/clubs/activity/${id}` as StringHref,
  club_post: (id) => `/clubs/post/${id}` as StringHref,
  marketplace_item: (id) => `/market/${id}` as StringHref,
  marketplace_thread: (id) => `/me/chat/${id}` as StringHref,
  handbook_article: (id) => `/guides/${id}` as StringHref,
};

/** 类型已知、但 App 侧还没有落点的目标 */
const PENDING: Record<string, TargetResolution> = {
  // 契约：`campus_post` 与匿名万能墙是不同实体，丙先核对服务端数据与 App 页面
  campus_post: { kind: 'pending', reason: 'needs-owner' },
  // 课程测评页（`/course-reviews/**`）等戊交付屏幕后由甲注册
  course_review: { kind: 'pending', reason: 'missing-route' },
  trending_post: { kind: 'pending', reason: 'missing-route' },
  announcement: { kind: 'pending', reason: 'missing-route' },
};

/** 解析一个目标（纯函数，表驱动可测） */
export function resolveTarget(target: NotificationTarget): TargetResolution {
  const id = Number(target?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return { kind: 'unavailable', reason: 'invalid' };
  if (target?.available === false) return { kind: 'unavailable', reason: 'gone' };

  const build = ROUTES[target?.type ?? ''];
  if (typeof build !== 'function') {
    return PENDING[target?.type ?? ''] ?? { kind: 'pending', reason: 'missing-route' };
  }

  const href = build(id);
  const commentId = Number(target?.comment_id);
  // 评论定位：只带参数，不在这里做滚动（内容页负责）
  if (target?.comment_id != null && Number.isSafeInteger(commentId) && commentId > 0) {
    return { kind: 'route', href: `${href}?comment=${commentId}` as StringHref };
  }
  return { kind: 'route', href };
}

/** 兼容旧调用：只关心"有没有路由"时用这个（既有用例与页面在阶段3-04 前还在用） */
export function resolveNotificationRoute(row: NotificationRow): StringHref | null {
  const resolution = resolveTarget(row.target);
  return resolution.kind === 'route' ? resolution.href : null;
}

/** 目标是否还能打开（可点性） */
export function isTargetOpenable(target: NotificationTarget): boolean {
  return resolveTarget(target).kind === 'route';
}
