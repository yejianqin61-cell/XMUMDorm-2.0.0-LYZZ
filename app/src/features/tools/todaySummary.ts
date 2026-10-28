import { KL_TIME_ZONE } from '../../../../shared/config/semesters';
import { ALL_HOLIDAYS } from '../../../../shared/config/holidays';
import type { TimetableMeeting } from './timetable';

function clockMinutes(value: string | null): number | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]); const minute = Number(match[2]); const second = Number(match[3] ?? 0);
  return hour < 24 && minute < 60 && second < 60 ? hour * 60 + minute + second / 60 : null;
}
export function schoolClockMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: KL_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value)
    + Number(parts.find((part) => part.type === 'second')?.value) / 60;
}
export function remainingTodayCourses(courses: readonly TimetableMeeting[], minutes: number): readonly TimetableMeeting[] {
  return courses.filter((course) => {
    const end = clockMinutes(course.endTime);
    const start = clockMinutes(course.startTime);
    return end === null || (start !== null && end < start) || end > minutes;
  });
}
export function selectCoursesNow(courses: readonly TimetableMeeting[], minutes: number,
  previousCourses: readonly TimetableMeeting[] = []) {
  const timed = courses.map((course) => ({ course, start: clockMinutes(course.startTime), end: clockMinutes(course.endTime) }))
    .filter((item): item is { course: TimetableMeeting; start: number; end: number | null } => item.start !== null)
    .sort((a, b) => a.start - b.start);
  const overnight = previousCourses.find((course) => {
    const start = clockMinutes(course.startTime), end = clockMinutes(course.endTime);
    return start !== null && end !== null && end < start && minutes < end;
  });
  return {
    current: overnight ?? timed.find((item) => item.start <= minutes && item.end !== null
      && (item.end < item.start || minutes < item.end))?.course ?? null,
    next: timed.find((item) => item.start > minutes)?.course ?? null,
  };
}
export function nextHoliday(ymd: string) {
  return ALL_HOLIDAYS.filter((holiday) => holiday.end >= ymd).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
}
