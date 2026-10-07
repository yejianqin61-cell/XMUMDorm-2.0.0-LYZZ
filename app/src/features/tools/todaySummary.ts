import { KL_TIME_ZONE } from '../../../../shared/config/semesters';
import { ALL_HOLIDAYS } from '../../../../shared/config/holidays';
import type { TimetableMeeting } from './timetable';

function clockMinutes(value: string | null): number | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]); const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}
export function schoolClockMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: KL_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
}
export function selectCoursesNow(courses: readonly TimetableMeeting[], minutes: number) {
  const timed = courses.map((course) => ({ course, start: clockMinutes(course.startTime), end: clockMinutes(course.endTime) }))
    .filter((item): item is { course: TimetableMeeting; start: number; end: number | null } => item.start !== null)
    .sort((a, b) => a.start - b.start);
  return {
    current: timed.find((item) => item.start <= minutes && item.end !== null && minutes < item.end)?.course ?? null,
    next: timed.find((item) => item.start > minutes)?.course ?? null,
  };
}
export function nextHoliday(ymd: string) {
  return ALL_HOLIDAYS.filter((holiday) => holiday.end >= ymd).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
}
