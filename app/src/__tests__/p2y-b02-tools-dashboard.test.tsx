import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { clearNamespace } from '@/shared/storage';
jest.mock('expo-router', () => ({ __state: { targets: [] as unknown[] }, useRouter: () => ({ push: (target: unknown) => require('expo-router').__state.targets.push(target) }) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn() }));
const api = require('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
const todos = require('../../../shared/api/todos') as { getTodayTodos: jest.Mock };
beforeEach(async () => {
  await clearNamespace();
  api.getScheduleWeek.mockReset().mockImplementation(async (week: number) => ({ week, currentWeek: week, totalWeeks: 14, days: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((day) => [day, [{ course_code: 'CS101', course_name: 'Algorithms', start_time: '08:00', end_time: '10:00', venue: 'A1', day_of_week: day }]])) }));
  todos.getTodayTodos.mockReset().mockResolvedValue({ total: 4, completed: 2, active: 2, topItems: [{ id: 7, title: 'Read paper' }] });
  require('expo-router').__state.targets.length = 0;
});
it('renders all three real-data blocks and preserves tool entry points', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('Algorithms')).toBeTruthy());
  await waitFor(() => expect(view.getByText('Read paper')).toBeTruthy());
  expect(view.getByText('今日4项，已完成2项')).toBeTruthy();
  expect(view.getByTestId('tools-school-actions')).toBeTruthy();
  expect(view.getByTestId('tools-timetable')).toBeTruthy();
  expect(view.getByTestId('tools-schedule-import')).toBeTruthy();
  await fireEvent.press(view.getByTestId('tools-todos'));
  expect(require('expo-router').__state.targets).toContain('/tools/todos');
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
  expect(view.getByText('School systems')).toBeTruthy();
});
