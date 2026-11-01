import * as React from 'react';
import { View } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { TimetableScreen, type TimetableRenderProps } from '@/features/tools/TimetableScreen';
import { courseAccentMap, weekdayTimetableWeek } from '@/features/tools/timetableView';
import { normalizeTimetableWeek, safeTimetableWeekCount, timetableCacheKey } from '@/features/tools/timetable';
import { clearNamespace, setItem } from '@/shared/storage';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async (error: unknown) => error }) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
const api = jest.requireMock('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
const payload = (week: number) => ({ week, currentWeek: week, totalWeeks: 14, days: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((day) => [day, [
  { course_code: 'CS101', course_name: 'Algorithms', day_of_week: day, start_time: '09:00', end_time: '10:00' },
]])) });
let gridProps: TimetableRenderProps | undefined;
function grid(props: TimetableRenderProps) { gridProps = props; return <View testID="grid-probe" />; }
beforeEach(async () => { await clearNamespace(); gridProps = undefined; api.getScheduleWeek.mockReset().mockImplementation(async (week: number) => payload(week)); });

it('assigns every course in the week a stable course accent (2026-10-18 redesign)', () => {
  const week = normalizeTimetableWeek(payload(1))!;
  const map = courseAccentMap(week);
  expect(map.get('CS101')).toBeDefined();
  expect(courseAccentMap(week).get('CS101')).toEqual(map.get('CS101'));
  expect(map.size).toBe(1);
});

it('retains weekday and weekend courses in grid input without mutating the cache', () => {
  const original = normalizeTimetableWeek(payload(1))!;
  const shown = weekdayTimetableWeek(original);
  expect(Object.keys(shown.days)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  expect(shown.days[5][0].courseCode).toBe('CS101');
  expect(original.days[6]).toHaveLength(1);
});

it('selects a numeric week from the horizontal filter and passes the existing renderer its new inputs', async () => {
  const view = await renderApp(<TimetableScreen renderGrid={grid} />);
  await waitFor(() => expect(view.getByTestId('grid-probe')).toBeTruthy());
  await fireEvent.press(view.getByTestId('week-number-14'));
  await waitFor(() => expect(api.getScheduleWeek).toHaveBeenCalledWith(14));
  await waitFor(() => expect(gridProps?.week.week).toBe(14));
  expect(gridProps?.visibleWeekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(view.getByTestId('week-number-14').props.accessibilityLabel).toBe('第 14 周');
  expect(view.queryByTestId('timetable-prev')).toBeNull();
  expect(view.queryByTestId('timetable-next')).toBeNull();
});

it('preserves a cached week when the network fails', async () => {
  const now = new Date();
  const semester = jest.requireActual('../../../shared/config/semesters') as { currentTeachingWeek: (now: Date) => number | null };
  const week = semester.currentTeachingWeek(now) ?? 1;
  await setItem(timetableCacheKey(week), payload(week));
  api.getScheduleWeek.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<TimetableScreen renderGrid={grid} />);
  await waitFor(() => expect(view.getByTestId('timetable-stale')).toBeTruthy());
  expect(view.getByTestId('grid-probe')).toBeTruthy();
});

it('keeps the full 08:00–21:00 axis for a week with no weekday meetings', async () => {
  api.getScheduleWeek.mockImplementation(async (week: number) => ({ week, currentWeek: week, days: {} }));
  const view = await renderApp(<TimetableScreen renderGrid={grid} />);
  await waitFor(() => expect(view.getByTestId('grid-probe')).toBeTruthy());
  expect(view.queryByTestId('timetable-empty')).toBeNull();
  expect(view.getByTestId('timetable-import')).toBeTruthy();
});

it.each([1e308, 1000000, NaN, Infinity, -1, 0, 1.5])('falls back to the configured twenty-week count for unsafe response %s', (count) => {
  expect(safeTimetableWeekCount(count)).toBe(20);
  expect(normalizeTimetableWeek({ week: 1, days: {}, totalWeeks: count })?.totalWeeks).toBe(20);
});

it('keeps every valid configured teaching week and recovers the filter after an extreme response', async () => {
  expect(safeTimetableWeekCount(14)).toBe(14);
  expect(safeTimetableWeekCount(20)).toBe(20);
  api.getScheduleWeek.mockImplementation(async (week: number) => ({ ...payload(week), totalWeeks: 1e308 }));
  const view = await renderApp(<TimetableScreen renderGrid={grid} />);
  await waitFor(() => expect(view.getByTestId('grid-probe')).toBeTruthy());
  expect(view.getByTestId('week-number-20')).toBeTruthy();
  expect(view.queryByTestId('week-number-21')).toBeNull();
  await fireEvent.press(view.getByTestId('week-number-20'));
  await waitFor(() => expect(gridProps?.week.week).toBe(20));
});
