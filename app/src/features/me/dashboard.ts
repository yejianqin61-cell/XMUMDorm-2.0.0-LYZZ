/**
 * 「我的」仪表盘的**纯规则**（P2C-03）
 *
 * 三块内容的取数都**复用既有的那一份**，⛔ 不新建第二套：
 *   · 今日课程 → `features/tools/timetable.ts` 的 `useTimetableWeek`（**乙的课表缓存**，同一份）
 *   · 周次     → `shared/config/semesters.js` 的 `currentTeachingWeek`（⛔ 不自己算日期/时区）
 *   · 今日待办 → `GET /api/todos/today`（`routes/todos.js:98-134`）
 *
 * ⛔ 本文件不 import 任何 UI 组件、⛔ 不 import 乙的 module（只吃它喂进来的数据）。
 */

import { todayWeekday, type TimetableMeeting, type TimetableWeek } from '@/features/tools/timetable';

export type TodayCourses = {
  /** 今天有没有课 */
  hasAny: boolean;
  count: number;
  /** 第一节（按开始时间） */
  first: TimetableMeeting | null;
  /** 除第一节外还剩几节 */
  restCount: number;
};

/** 某一周的某一天有哪些课（纯函数；`weekday` 为 `null` = 今天不在教学周内） */
export function meetingsOf(week: TimetableWeek | null, weekday: number | null): TimetableMeeting[] {
  if (week === null || weekday === null) return [];
  const list = week.days[weekday] ?? [];
  return [...list].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

/** 今日课程摘要（纯函数）：给"第一节 + 还有几节"，而不是把整周倒到首屏 */
export function summarizeTodayCourses(meetings: readonly TimetableMeeting[]): TodayCourses {
  const sorted = [...meetings].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  return {
    hasAny: sorted.length > 0,
    count: sorted.length,
    first: sorted[0] ?? null,
    restCount: Math.max(0, sorted.length - 1),
  };
}

/** 课程一行文案的插值参数（⛔ 组件/页面不自己拼字符串，词条负责格式） */
export function courseLineParams(meeting: TimetableMeeting): {
  time: string;
  name: string;
} {
  const time = meeting.startTime ?? '';
  const name = meeting.courseName ?? meeting.courseCode ?? '';
  return { time, name };
}

export type TodayTodos = {
  total: number;
  active: number;
  completed: number;
  /** 最多 3 条未完成（后端已经切好） */
  top: readonly { id: number; title: string }[];
};

/** `/api/todos/today` 载荷 → 摘要（缺字段给 0；⛔ 不抛、⛔ 不出现 NaN） */
export function normalizeTodayTodos(payload: unknown): TodayTodos {
  const raw =
    payload !== null && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  const topRaw = Array.isArray(raw.topItems) ? raw.topItems : [];
  const top: { id: number; title: string }[] = [];
  for (const entry of topRaw) {
    if (entry === null || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const id = Number(item.id);
    const title = typeof item.title === 'string' ? item.title : '';
    if (!Number.isInteger(id) || id <= 0 || title === '') continue;
    top.push({ id, title });
  }
  const asCount = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return {
    total: asCount(raw.total),
    active: asCount(raw.active),
    completed: asCount(raw.completed),
    top,
  };
}

/** 今天星期几（1..7）—— 直接转发 `timetable.ts` 的那一个（⛔ 不另写一套时区逻辑） */
export function todayDayOfWeek(now: Date = new Date()): number | null {
  return todayWeekday(now);
}
