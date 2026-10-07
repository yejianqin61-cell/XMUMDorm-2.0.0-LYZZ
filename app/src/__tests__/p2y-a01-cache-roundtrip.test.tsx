import { readCachedWeek, writeCachedWeek, normalizeTimetableWeek, timetableCacheKey } from '@/features/tools/timetable';
import { removeItem, setItem } from '@/shared/storage';

const raw = { week: 3, currentWeek: 3, totalWeeks: 20, days: { 1: [{ course_code: 'CS101', course_name: 'Algorithms', credit: 3, lecturer: 'Ada', day_of_week: 1, start_time: '08:00', end_time: '10:00', venue: 'A1' }] } };
const course = { courseCode: 'CS101', courseName: 'Algorithms', credit: 3, lecturer: 'Ada', dayOfWeek: 1, startTime: '08:00', endTime: '10:00', venue: 'A1' };
beforeEach(async () => removeItem(timetableCacheKey(3)));

it('preserves every course field on a disk round trip', async () => {
  await writeCachedWeek(3, normalizeTimetableWeek(raw)!);
  expect((await readCachedWeek(3))?.days[1][0]).toEqual(course);
});
it('reads legacy API-shaped cache', async () => {
  await setItem(timetableCacheKey(3), raw);
  expect((await readCachedWeek(3))?.days[1][0]).toEqual(course);
});
it('reads legacy normalized cache', async () => {
  await setItem(timetableCacheKey(3), { week: 3, days: { 1: [course] }, currentWeek: 3, totalWeeks: 20 });
  expect((await readCachedWeek(3))?.days[1][0]).toEqual(course);
});
it('discards malformed cache', async () => {
  await setItem(timetableCacheKey(3), { nope: true });
  expect(await readCachedWeek(3)).toBeNull();
});
it('restores all seven days of an empty week', async () => {
  await writeCachedWeek(3, normalizeTimetableWeek({ week: 3, days: {} })!);
  expect((await readCachedWeek(3))?.days).toEqual({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] });
});
