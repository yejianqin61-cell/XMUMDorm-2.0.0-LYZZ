import { selectCoursesNow, nextHoliday, schoolClockMinutes } from '@/features/tools/todaySummary';
import type { TimetableMeeting } from '@/features/tools/timetable';

const meeting = (code: string, startTime: string, endTime: string): TimetableMeeting => ({ courseCode: code, courseName: code, startTime, endTime, credit: null, lecturer: null, venue: null, dayOfWeek: 1 });
const courses = [meeting('A', '08:00:00', '10:00:00'), meeting('B', '10:30', '12:00')];
it('includes the start and excludes the end of a current class', () => {
  expect(selectCoursesNow(courses, 480).current?.courseCode).toBe('A');
  expect(selectCoursesNow(courses, 599).current?.courseCode).toBe('A');
  expect(selectCoursesNow(courses, 600)).toMatchObject({ current: null, next: { courseCode: 'B' } });
  expect(selectCoursesNow(courses, 720)).toEqual({ current: null, next: null });
});
it('uses the school timezone regardless of the device timezone', () => {
  expect(schoolClockMinutes(new Date('2026-10-07T00:30:00Z'))).toBe(510);
});
it('retains a holiday through its last school-calendar day', () => {
  expect(nextHoliday('2026-11-09')?.id).toBe('deepavali-2026');
  expect(nextHoliday('2026-11-10')?.id).toBe('selangor-sultan-2026');
  expect(nextHoliday('2030-01-01')).toBeNull();
});
