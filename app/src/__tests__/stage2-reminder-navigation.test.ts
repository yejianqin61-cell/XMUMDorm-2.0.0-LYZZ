import { resolveClassReminderTarget, findClassReminderMeeting } from '@/features/tools/reminders/navigation';
import type { TimetableMeeting, TimetableWeek } from '@/features/tools/timetable';

const semester = { id: '2026-09', startDate: '2026-09-28', weeks: 14 };
const data = { dormReminder: 'phase3-v1', domain: 'class', owner: 'user:7', target: {
  semesterId: '2026-09', courseCode: 'CS101', date: '2026-10-05', startTime: '09:00:00',
} };
const meeting: TimetableMeeting = { courseCode: 'CS101', courseName: 'Algorithms', credit: 3,
  lecturer: null, venue: null, dayOfWeek: 1, startTime: '09:00', endTime: '10:00' };
const week: TimetableWeek = { week: 2, currentWeek: 2, totalWeeks: 14, days: { 1: [meeting] } };
function target() {
  const result = resolveClassReminderTarget(data, 'user:7', semester);
  if (result.status !== 'ready') throw new Error('expected ready target');
  return result.target;
}

it('projects an existing course notification into the exact teaching week and weekday', () => {
  expect(resolveClassReminderTarget(data, 'user:7', semester)).toEqual({ status: 'ready', target: {
    ...data.target, week: 2, dayOfWeek: 1,
  } });
  expect(findClassReminderMeeting(week, target())).toEqual(meeting);
});

it.each([null, 'user:8', 'guest', 'user:unresolved'])('refuses a target for current owner %s', (owner) => {
  expect(resolveClassReminderTarget(data, owner, semester).status).toBe('unavailable');
});

it.each([
  { date: '2026-02-30' }, { date: '2026-09-27' }, { date: '2027-01-04' },
  { startTime: '24:00' }, { startTime: '09:60' }, { startTime: '09:00:60' },
  { semesterId: '2027-02' }, { courseCode: '' }, { date: null }, { startTime: [] },
])('rejects malformed or out-of-semester target %j', (invalid) => {
  expect(resolveClassReminderTarget({ ...data, target: { ...data.target, ...invalid } }, 'user:7', semester)
    .status).toBe('unavailable');
});

it('ignores unrelated notifications and refuses missing semester context', () => {
  expect(resolveClassReminderTarget(null, 'user:7', semester).status).toBe('ignored');
  expect(resolveClassReminderTarget({ ...data, domain: 'moodle' }, 'user:7', semester).status).toBe('ignored');
  expect(resolveClassReminderTarget({ ...data, dormReminder: 'other' }, 'user:7', semester).status).toBe('ignored');
  expect(resolveClassReminderTarget(data, 'user:7', null).status).toBe('unavailable');
});

it('uses the school calendar across the first Sunday and the following Monday', () => {
  expect(resolveClassReminderTarget({ ...data, target: { ...data.target, date: '2026-10-04' } }, 'user:7', semester))
    .toMatchObject({ target: { week: 1, dayOfWeek: 7 } });
  expect(target()).toMatchObject({ week: 2, dayOfWeek: 1 });
});

it('does not substitute a changed, deleted, ambiguous or wrong-week course', () => {
  expect(findClassReminderMeeting({ ...week, week: 3 }, target())).toBeNull();
  expect(findClassReminderMeeting({ ...week, days: {} }, target())).toBeNull();
  expect(findClassReminderMeeting({ ...week, days: { 1: [{ ...meeting, startTime: '11:00' }] } }, target())).toBeNull();
  expect(findClassReminderMeeting({ ...week, days: { 1: [{ ...meeting, courseCode: 'MA101' }] } }, target())).toBeNull();
  expect(findClassReminderMeeting({ ...week, days: { 1: [meeting, { ...meeting, venue: 'Another room' }] } }, target()))
    .toBeNull();
});
