import * as React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { clearNamespace } from '@/shared/storage';
jest.mock('expo-router', () => ({ __state: { targets: [] as unknown[] }, useRouter: () => ({ push: (target: unknown) => jest.requireMock('expo-router').__state.targets.push(target) }) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn() }));
const api = jest.requireMock('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
const todos = jest.requireMock('../../../shared/api/todos') as { getTodayTodos: jest.Mock };
beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: [
    'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
    'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  ] });
  jest.setSystemTime(new Date('2026-10-05T01:00:00Z'));
  await clearNamespace();
  api.getScheduleWeek.mockReset().mockImplementation(async (week: number) => ({ week, currentWeek: week, totalWeeks: 14, days: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((day) => [day, [{ course_code: 'CS101', course_name: 'Algorithms', start_time: '08:00', end_time: '10:00', venue: 'A1', day_of_week: day }]])) }));
  todos.getTodayTodos.mockReset().mockResolvedValue({ total: 4, completed: 2, active: 2, topItems: [{ id: 7, title: 'Read paper' }] });
  jest.requireMock('expo-router').__state.targets.length = 0;
});
afterEach(() => jest.useRealTimers());
it('renders all three real-data blocks and preserves tool entry points', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('Algorithms')).toBeTruthy());
  await waitFor(() => expect(view.getByText('Read paper')).toBeTruthy());
  expect(view.getByText('今日4项，已完成2项')).toBeTruthy();
  expect(view.getByTestId('tools-school-actions')).toBeTruthy();
  expect(view.getByTestId('tools-holidays')).toBeTruthy();
  expect(view.getByTestId('tools-timetable')).toBeTruthy();
  expect(view.getByTestId('tools-schedule-import')).toBeTruthy();
  await fireEvent.press(view.getByTestId('tools-todos'));
  expect(jest.requireMock('expo-router').__state.targets).toContain('/tools/todos');
});
it('keeps the course and school blocks when todos fail', async () => {
  todos.getTodayTodos.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByTestId('tools-todos-error')).toBeTruthy());
  expect(view.getByText('Algorithms')).toBeTruthy();
  expect(view.getByTestId('tools-school-actions')).toBeTruthy();
});
it('renders useful empty sections with routes to import and add todos', async () => {
  api.getScheduleWeek.mockImplementation(async (week: number) => ({ week, currentWeek: week, days: {} }));
  todos.getTodayTodos.mockResolvedValue({ total: 0, completed: 0, active: 0, topItems: [] });
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('今天没有课程')).toBeTruthy());
  await waitFor(() => expect(view.getByText('今天没有未完成的待办')).toBeTruthy());
  expect(view.getByTestId('tools-schedule-import')).toBeTruthy();
});
it('renders the same dashboard in English', async () => {
  const view = await renderApp(<ToolsDashboardContent />, { locale: 'en' });
  await waitFor(() => expect(view.getByText('Today’s schedule')).toBeTruthy());
  expect(view.getAllByText('School systems')).toHaveLength(2);
});
it('shows the previous Sunday overnight course after midnight on Monday', async () => {
  jest.setSystemTime(new Date('2026-10-04T16:15:00Z'));
  api.getScheduleWeek.mockImplementation(async (week: number) => ({ week, currentWeek: 2, totalWeeks: 14,
    days: week === 1 ? { 7: [{ course_code: 'NIGHT', course_name: 'Night course',
      day_of_week: 7, start_time: '23:30', end_time: '00:30' }] }
      : { 1: [{ course_code: 'DAY', course_name: 'Day course', day_of_week: 1,
        start_time: '08:00', end_time: '10:00' }] } }));
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByTestId('tools-current-course').props.children).toContain('Night course'));
  expect(view.getByTestId('tools-next-course').props.children).toContain('Day course');
  expect(api.getScheduleWeek).toHaveBeenCalledWith(1);
  expect(api.getScheduleWeek).toHaveBeenCalledWith(2);
});

it('finds the next course in the following week when the rest of this week is empty', async () => {
  jest.setSystemTime(new Date('2026-10-11T13:00:00Z')); // Sunday 21:00 in Kuala Lumpur, teaching week 2.
  api.getScheduleWeek.mockImplementation(async (week: number) => ({ week, currentWeek: 2, totalWeeks: 14,
    days: week === 3 ? { 1: [{ course_code: 'NEXT', course_name: 'Next week course',
      day_of_week: 1, start_time: '08:00', end_time: '10:00' }] } : {} }));
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByTestId('tools-next-course').props.children).toContain('Next week course'));
  expect(api.getScheduleWeek).toHaveBeenCalledWith(3);
});

it('offers a retry when a future week cannot be loaded', async () => {
  jest.setSystemTime(new Date('2026-10-11T13:00:00Z'));
  api.getScheduleWeek.mockImplementation(async (week: number) => {
    if (week === 3) throw { kind: 'offline' };
    return { week, currentWeek: 2, totalWeeks: 14, days: {} };
  });
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByTestId('tools-next-error')).toBeTruthy());
  api.getScheduleWeek.mockImplementation(async (week: number) => ({ week, currentWeek: 2, totalWeeks: 14,
    days: week === 3 ? { 1: [{ course_code: 'NEXT', course_name: 'Recovered course',
      day_of_week: 1, start_time: '08:00', end_time: '10:00' }] } : {} }));
  await fireEvent.press(within(view.getByTestId('tools-next-error')).getByRole('button'));
  await waitFor(() => expect(view.getByTestId('tools-next-course').props.children).toContain('Recovered course'));
});
