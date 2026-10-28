import { buildClassReminderPlan } from '@/features/tools/reminders/plan';
import type { TimetableMeeting, TimetableWeek } from '@/features/tools/timetable';

const semester = { id: '2026-09', startDate: '2026-09-28', weeks: 14 };
function meeting(overrides: Partial<TimetableMeeting> = {}): TimetableMeeting {
  return { courseCode: 'CS101', courseName: 'Algorithms', credit: 3, lecturer: 'Private name',
    venue: 'Private room', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', ...overrides };
}
function week(meetings: TimetableMeeting[] = [meeting()], weekNumber = 2): TimetableWeek {
  return { week: weekNumber, days: { 1: meetings }, currentWeek: 2, totalWeeks: 14 };
}

it('plans school Monday at 09:00 as UTC 01:00 with a 30-minute lead', () => {
  expect(buildClassReminderPlan({ semester, weeks: [week()], now: new Date('2026-10-04T00:00:00Z') })).toEqual([
    { id: 'class:2026-09:CS101:2026-10-05:09%3A00%3A00', week: 2, dayOfWeek: 1,
      startsAt: '2026-10-05T01:00:00.000Z', fireAt: Date.parse('2026-10-05T00:30:00.000Z'),
      target: { semesterId: '2026-09', courseCode: 'CS101', date: '2026-10-05', startTime: '09:00:00' } },
  ]);
});

it('keeps school dates across midnight and representations of the device instant', () => {
  const tuesday = { ...week(), days: { 2: [meeting({ dayOfWeek: 2, startTime: '00:15' })] } };
  const inputs = ['2026-10-05T15:00:00Z', '2026-10-05T08:00:00-07:00', '2026-10-05T23:00:00+08:00'];
  for (const instant of inputs) {
    expect(buildClassReminderPlan({ semester, weeks: [tuesday], now: new Date(instant) })).toEqual([
      { id: 'class:2026-09:CS101:2026-10-06:00%3A15%3A00', week: 2, dayOfWeek: 2,
        startsAt: '2026-10-05T16:15:00.000Z', fireAt: Date.parse('2026-10-05T15:45:00.000Z'),
        target: { semesterId: '2026-09', courseCode: 'CS101', date: '2026-10-06', startTime: '00:15:00' } },
    ]);
  }
});

it('excludes the exact firing instant and all past reminders', () => {
  for (const instant of ['2026-10-05T00:30:00Z', '2026-10-05T01:10:00Z']) {
    expect(buildClassReminderPlan({ semester, weeks: [week()], now: new Date(instant) })).toEqual([]);
  }
  expect(buildClassReminderPlan({ semester, weeks: [week()], now: new Date('2026-10-05T00:29:59Z') })).toHaveLength(1);
});

it('uses stable business IDs, deduplicates equivalent clock forms and keeps simultaneous different courses', () => {
  const meetings = [meeting(), meeting({ startTime: '09:00:00', courseName: 'changed', lecturer: 'another' }),
    meeting({ courseCode: 'MA101' })];
  const now = new Date('2026-10-04T00:00:00Z');
  const first = buildClassReminderPlan({ semester, weeks: [week(meetings)], now });
  expect(first.map((item) => item.id)).toEqual([
    'class:2026-09:CS101:2026-10-05:09%3A00%3A00', 'class:2026-09:MA101:2026-10-05:09%3A00%3A00',
  ]);
  expect(buildClassReminderPlan({ semester, weeks: [week([...meetings].reverse())], now })).toEqual(first);
  expect(JSON.stringify(first)).not.toMatch(/Private|lecturer|venue|courseName/);
});

it.each(['2026-02-31', '2026-09-29'])('rejects invalid semester start %s', (startDate) => {
  expect(buildClassReminderPlan({ semester: { ...semester, startDate }, weeks: [week()], now: new Date('2026-01-01Z') })).toEqual([]);
});

it.each([0, 15, 1.5])('rejects out-of-semester week %s', (number) => {
  expect(buildClassReminderPlan({ semester, weeks: [week([meeting()], number)], now: new Date('2026-01-01Z') })).toEqual([]);
});

it.each(['24:00', '08:60', '09:00:99', null])('rejects invalid clock %s', (startTime) => {
  expect(buildClassReminderPlan({ semester, weeks: [week([meeting({ startTime })])], now: new Date('2026-01-01Z') })).toEqual([]);
});

it('rejects inconsistent day buckets, empty identities and an invalid current instant', () => {
  const invalid = week([meeting({ dayOfWeek: 2 }), meeting({ courseCode: '' })]);
  invalid.days[8] = [meeting({ dayOfWeek: 8 })];
  expect(buildClassReminderPlan({ semester, weeks: [invalid], now: new Date('2026-01-01Z') })).toEqual([]);
  expect(buildClassReminderPlan({ semester, weeks: [week()], now: new Date('invalid') })).toEqual([]);
});
