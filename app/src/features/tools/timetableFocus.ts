/**
 * 课表定位（阶段C-03，R-2）：把"通知里那节课"落成课表的**周次 + 星期**。
 *
 * 只做纯计算：给定这一周的数据与课程码，回答"它在这个星期几"。
 * ⛔ 不在这里取数据、不在这里导航、不渲染。
 */

import type { TimetableMeeting, TimetableWeek } from './timetable';

/** 该课程在本周出现的第一个星期几（1–7）；没有就 null。同课跨天时按天序取第一个。 */
export function focusCourseWeekday(
  week: TimetableWeek | null,
  courseCode: string | null | undefined
): number | null {
  if (!week || typeof courseCode !== 'string' || courseCode.trim() === '') return null;
  const code = courseCode.trim();
  for (let day = 1; day <= 7; day += 1) {
    const meetings: readonly TimetableMeeting[] = week.days[day] ?? [];
    if (meetings.some((meeting) => meeting.courseCode.trim() === code)) return day;
  }
  return null;
}

/** 定位参数解析：只接受正整数周次；非法一律 null（回落到当前周）。 */
export function parseFocusWeek(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const week = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isSafeInteger(week) && week > 0 ? week : null;
}

/** 定位参数解析：课程码去空格；空串当作没给。 */
export function parseFocusCourse(value: unknown): string | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string') return null;
  const code = text.trim();
  return code === '' ? null : code;
}
