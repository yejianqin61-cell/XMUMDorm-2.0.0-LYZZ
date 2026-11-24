import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { TodoFormScreen } from '@/features/todos/TodoFormScreen';
import { clearNamespace } from '@/shared/storage';

jest.mock('expo-router', () => ({
  __state: { targets: [] as unknown[] },
  useNavigation: () => ({ dispatch: jest.fn() }),
  useRouter: () => ({
    push: (target: unknown) => jest.requireMock('expo-router').__state.targets.push(target),
    replace: jest.fn(), back: jest.fn(), canGoBack: () => false,
  }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({
  status: 'signedIn', isSignedIn: true, handleAuthFailure: async (error: unknown) => error ?? { kind: 'unknown' },
}) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn(async (week: number) => ({ week, currentWeek: week, totalWeeks: 14, days: {} })) }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn(), createTodo: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));

const api = jest.requireMock('../../../shared/api/todos') as { getTodayTodos: jest.Mock; createTodo: jest.Mock };
beforeEach(async () => {
  await clearNamespace();
  api.getTodayTodos.mockReset().mockResolvedValue({ total: 1, active: 1, completed: 0, topItems: [{ id: 7, title: 'Read paper' }] });
  api.createTodo.mockReset().mockResolvedValue({ id: 8 });
  jest.requireMock('expo-router').__state.targets.length = 0;
});

it('creates from the dashboard through the existing form route', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('Read paper')).toBeTruthy());
  await fireEvent.press(view.getByText('新增待办'));
  expect(jest.requireMock('expo-router').__state.targets).toContain('/tools/todos/new');
  await fireEvent.press(view.getByTestId('tools-todos'));
  expect(jest.requireMock('expo-router').__state.targets).toContain('/tools/todos');
});

it('keeps one count sentence and removes the active and completed stat tiles', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('今日1项，已完成0项')).toBeTruthy());
  expect(view.queryByText('待完成')).toBeNull();
  expect(view.queryByText('已完成')).toBeNull();
});

it('refreshes the dashboard when the actual todo form saves successfully', async () => {
  api.createTodo.mockImplementation(async () => {
    api.getTodayTodos.mockResolvedValue({ total: 2, active: 2, completed: 0, topItems: [{ id: 8, title: 'New task' }, { id: 7, title: 'Read paper' }] });
    return { id: 8 };
  });
  const view = await renderApp(<><ToolsDashboardContent /><TodoFormScreen /></>);
  await waitFor(() => expect(view.getByText('Read paper')).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText(/标题/), 'New task');
  await fireEvent.press(view.getByTestId('todo-form-submit'));
  await waitFor(() => expect(api.createTodo).toHaveBeenCalledWith(expect.objectContaining({ title: 'New task' })));
  await waitFor(() => expect(view.getByText('今日2项，已完成0项')).toBeTruthy());
  expect(view.getByText('New task')).toBeTruthy();
  expect(api.getTodayTodos).toHaveBeenCalledTimes(2);
});

it('keeps the old summary when the actual form fails to save', async () => {
  api.createTodo.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<><ToolsDashboardContent /><TodoFormScreen /></>);
  await waitFor(() => expect(view.getByText('Read paper')).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText(/标题/), 'Not saved');
  await fireEvent.press(view.getByTestId('todo-form-submit'));
  await waitFor(() => expect(api.createTodo).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByText('待办未保存')).toBeTruthy());
  expect(view.getByText('今日1项，已完成0项')).toBeTruthy();
  expect(api.getTodayTodos).toHaveBeenCalledTimes(1);
});
