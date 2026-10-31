/**
 * 本地课程提醒 → App 路由（阶段C-04，D-3：进唯一映射）
 *
 * 乙交的 `resolveClassReminderTarget` 只回答"这条载荷是否属于本账号、能解析出哪节课"；
 * 本文件是它**唯一**的出口：把结果翻成 App 路由或三态之一，页面/宿主不再自己拼路由。
 * ⛔ 服务端通知的 target 映射仍在 `features/mailbox/targets.ts`，两套输入不互相搬语义。
 */

import { resolveSemesterContext } from '../../../../shared/config/semesters';
import { resolveClassReminderTarget } from '@/features/tools/reminders/navigation';
import type { ReminderSemester } from '@/features/tools/reminders/plan';

export type ReminderRouteResult =
  | { kind: 'route'; href: string }
  | { kind: 'ignore' }
  | { kind: 'unavailable' };

export function resolveReminderRoute(data: unknown, currentOwner: string | null): ReminderRouteResult {
  const context = resolveSemesterContext();
  const semester = (context.semester ?? null) as ReminderSemester | null;
  const resolution = resolveClassReminderTarget(data, currentOwner, semester);
  if (resolution.status === 'ignored') return { kind: 'ignore' };
  if (resolution.status === 'unavailable') return { kind: 'unavailable' };
  const { week, courseCode } = (resolution as { status: 'ready'; target: { week: number; courseCode: string } }).target;
  return {
    kind: 'route',
    href: `/tools/timetable?week=${week}&course=${encodeURIComponent(courseCode)}`,
  };
}
