import { addDaysYmd, parseYmd, weekDateRange } from '../../../../../shared/config/semesters';
import type { TimetableWeek } from '../timetable';

export type ClassReminderTarget = { semesterId: string; courseCode: string; date: string; startTime: string };
export type ClassReminder = { id: string; startsAt: string; fireAt: number; week: number; dayOfWeek: number;
  target: ClassReminderTarget };
export type ReminderSemester = { id: string; startDate: string; weeks: number };
const SCHOOL_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Kuala_Lumpur, no daylight-saving transition.
const LEAD_MS = 30 * 60 * 1000;

/** A pure plan; it neither requests permission nor schedules native notifications. */
export function buildClassReminderPlan(input: { semester: ReminderSemester;
  weeks: readonly TimetableWeek[]; now: Date }): readonly ClassReminder[] {
  const { semester, weeks, now } = input;
  const start = parseYmd(semester.startDate);
  if (!start || new Date(start.ms).getUTCDay() !== 1 || !semester.id.trim()
    || !Number.isSafeInteger(semester.weeks) || semester.weeks < 1 || !Number.isFinite(now.getTime())) return [];
  const plan = new Map<string, ClassReminder>();
  for (const week of weeks) {
    if (!Number.isSafeInteger(week.week) || week.week < 1 || week.week > semester.weeks) continue;
    const range = weekDateRange(semester, week.week);
    if (!range) continue;
    for (const [key, meetings] of Object.entries(week.days)) {
      const day = Number(key);
      if (!Number.isSafeInteger(day) || day < 1 || day > 7) continue;
      const date = addDaysYmd(range.start, day - 1);
      const parsedDate = parseYmd(date);
      if (!date || !parsedDate) continue;
      for (const meeting of meetings) {
        const time = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(meeting.startTime ?? '');
        if (meeting.dayOfWeek !== day || !time || !meeting.courseCode.trim()) continue;
        const hour = Number(time[1]), minute = Number(time[2]), second = Number(time[3] ?? 0);
        if (hour > 23 || minute > 59 || second > 59) continue;
        const startsAt = parsedDate.ms + ((hour * 60 + minute) * 60 + second) * 1000 - SCHOOL_OFFSET_MS;
        const fireAt = startsAt - LEAD_MS;
        if (fireAt <= now.getTime()) continue;
        const clock = `${time[1]}:${time[2]}:${time[3] ?? '00'}`;
        const id = ['class', semester.id.trim(), meeting.courseCode.trim(), date, clock].map(encodeURIComponent).join(':');
        plan.set(id, { id, startsAt: new Date(startsAt).toISOString(), fireAt: fireAt,
          week: week.week, dayOfWeek: day,
          target: { semesterId: semester.id.trim(), courseCode: meeting.courseCode.trim(), date, startTime: clock } });
      }
    }
  }
  return [...plan.values()].sort((a, b) => a.fireAt - b.fireAt || a.id.localeCompare(b.id));
}
