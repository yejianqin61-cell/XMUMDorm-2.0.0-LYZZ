import { parseYmd } from '../../../../../shared/config/semesters';
import type { TimetableMeeting, TimetableWeek } from '../timetable';
import type { ClassReminderTarget, ReminderSemester } from './plan';
import { reminderOwnerFromScope } from './scheduler';

export type ResolvedClassReminderTarget = ClassReminderTarget & { week: number; dayOfWeek: number };
export type ClassReminderResolution = { status: 'ignored' | 'unavailable' }
  | { status: 'ready'; target: ResolvedClassReminderTarget };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function clock(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) return null;
  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
}

/** Pure adapter for role A's notification listener. It accepts only this account's class payload. */
export function resolveClassReminderTarget(data: unknown, currentOwner: string | null,
  semester: ReminderSemester | null): ClassReminderResolution {
  const payload = record(data);
  if (payload?.dormReminder !== 'phase3-v1' || payload.domain !== 'class') return { status: 'ignored' };
  const raw = record(payload.target);
  if (!currentOwner || reminderOwnerFromScope(currentOwner) !== currentOwner || payload.owner !== currentOwner
    || !semester || !raw || raw.semesterId !== semester.id || typeof raw.courseCode !== 'string'
    || !raw.courseCode.trim() || typeof raw.date !== 'string') return { status: 'unavailable' };
  const date = parseYmd(raw.date), start = parseYmd(semester.startDate), startTime = clock(raw.startTime);
  if (!date || !start || !startTime || new Date(start.ms).getUTCDay() !== 1
    || !Number.isSafeInteger(semester.weeks) || semester.weeks < 1) return { status: 'unavailable' };
  // Calendar day numbers use UTC midnight solely as date arithmetic, never the device timezone.
  const offset = (date.ms - start.ms) / 86400000;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= semester.weeks * 7) return { status: 'unavailable' };
  return { status: 'ready', target: { semesterId: semester.id, courseCode: raw.courseCode.trim(),
    date: raw.date.trim(), startTime, week: Math.floor(offset / 7) + 1, dayOfWeek: offset % 7 + 1 } };
}

/** Use only after revalidating owner/semester and fetching the current week's authenticated data.
 * A deleted, rescheduled or ambiguous occurrence must not silently open another class.
 */
export function findClassReminderMeeting(week: TimetableWeek, target: ResolvedClassReminderTarget): TimetableMeeting | null {
  if (week.week !== target.week) return null;
  const matches = (week.days[target.dayOfWeek] ?? []).filter((meeting) =>
    meeting.dayOfWeek === target.dayOfWeek && meeting.courseCode.trim() === target.courseCode
    && clock(meeting.startTime) === target.startTime);
  return matches.length === 1 ? { ...matches[0] } : null;
}
