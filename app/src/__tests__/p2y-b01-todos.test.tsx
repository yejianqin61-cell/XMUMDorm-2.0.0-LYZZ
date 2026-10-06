import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { clearNamespace } from '@/shared/storage';
import { TodoListScreen } from '@/features/todos/TodoListScreen';
import { TodoFormScreen } from '@/features/todos/TodoFormScreen';
import { validateTodoDate, validateTodoTime, todoPayload } from '@/features/todos/todos';

jest.mock('expo-router', () => ({
  __state: { targets: [] as unknown[] },
  useRouter: () => ({ push: (target: unknown) => require('expo-router').__state.targets.push(target), replace: (target: unknown) => require('expo-router').__state.targets.push(target), back: jest.fn(), canGoBack: () => false }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async (error: unknown) => error ?? { kind: 'unknown' }, status: 'signedIn' }) }));
jest.mock('../../../shared/api/todos', () => ({ getTodos: jest.fn(), createTodo: jest.fn(), updateTodo: jest.fn(), toggleTodo: jest.fn(), deleteTodo: jest.fn() }));
const api = require('../../../shared/api/todos') as Record<string, jest.Mock>;
const row = { id: 7, title: 'Read paper', description: '', priority: 3, due_date: '2026-10-06', due_time: '08:00', is_completed: false, list_type: 'personal' };
beforeEach(async () => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.getTodos.mockResolvedValue({ list: [row], hasMore: false });
  api.createTodo.mockResolvedValue({ id: 8 }); api.updateTodo.mockResolvedValue({}); api.toggleTodo.mockResolvedValue({}); api.deleteTodo.mockResolvedValue({});
  await clearNamespace();
});
it('uses the canonical calendar to reject nonexistent dates', () => {
  expect(validateTodoDate('2028-02-29')).toBeUndefined();
  expect(validateTodoDate('2027-02-29')).toBe('todos.dateInvalid');
  expect(validateTodoDate('')).toBeUndefined();
});
it('bounds a time and permits clearing it', () => {
  expect(validateTodoTime('23:59')).toBeUndefined(); expect(validateTodoTime('24:00')).toBe('todos.timeInvalid'); expect(validateTodoTime('')).toBeUndefined();
});
it('creates the exact backend payload with null optional dates', () => {
  expect(todoPayload({ title: '  Task ', description: 'Hi', priority: '3', dueDate: '', dueTime: '', listType: 'course' })).toEqual({ title: 'Task', description: 'Hi', priority: 3, due_date: null, due_time: null, list_type: 'course' });
});
it('toggles a row and rereads the list', async () => {
  const view = await renderApp(<TodoListScreen />);
  await waitFor(() => expect(view.getByTestId('todo-toggle-7')).toBeTruthy());
  api.getTodos.mockResolvedValue({ list: [{ ...row, is_completed: true }], hasMore: false });
  await fireEvent.press(view.getByTestId('todo-toggle-7'));
  await waitFor(() => expect(api.toggleTodo).toHaveBeenCalledWith(7));
  await waitFor(() => expect(view.getByTestId('todo-toggle-7').props.accessibilityState.checked).toBe(true));
});
it('requires confirmation before deleting', async () => {
  const view = await renderApp(<TodoListScreen />);
  await waitFor(() => expect(view.getByTestId('todo-delete-7')).toBeTruthy());
  await fireEvent.press(view.getByTestId('todo-delete-7'));
  expect(api.deleteTodo).not.toHaveBeenCalled();
  api.getTodos.mockResolvedValue({ list: [], hasMore: false });
  await fireEvent.press(view.getByText('确认删除'));
  await waitFor(() => expect(api.deleteTodo).toHaveBeenCalledWith(7));
  await waitFor(() => expect(view.getByTestId('todos-list-empty')).toBeTruthy());
});
it('shows write failure without removing the row', async () => {
  api.toggleTodo.mockRejectedValue({ kind: 'offline' });
  const view = await renderApp(<TodoListScreen />);
  await waitFor(() => expect(view.getByTestId('todo-toggle-7')).toBeTruthy());
  await fireEvent.press(view.getByTestId('todo-toggle-7'));
  await waitFor(() => expect(view.getByTestId('todos-write-error')).toBeTruthy());
  expect(view.getByText('Read paper')).toBeTruthy();
});
it('creates through K01 with the selected priority', async () => {
  const view = await renderApp(<TodoFormScreen />);
  await fireEvent.changeText(view.getByLabelText(/标题/), 'New task');
  await fireEvent.press(view.getByTestId('todo-priority-3'));
  await fireEvent.press(view.getByTestId('todo-form-submit'));
  await waitFor(() => expect(api.createTodo).toHaveBeenCalledWith(expect.objectContaining({ title: 'New task', priority: 3, due_date: null, due_time: null })));
});
it('loads and updates an existing todo', async () => {
  const view = await renderApp(<TodoFormScreen id={7} />);
  await waitFor(() => expect(view.getByDisplayValue('Read paper')).toBeTruthy());
  await fireEvent.changeText(view.getByDisplayValue('Read paper'), 'Updated');
  await fireEvent.press(view.getByTestId('todo-form-submit'));
  await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith(7, expect.objectContaining({ title: 'Updated', priority: 3 })));
});
it('does not write an invalid date', async () => {
  const view = await renderApp(<TodoFormScreen />);
  await fireEvent.changeText(view.getByLabelText(/标题/), 'Task');
  await fireEvent.changeText(view.getByLabelText(/日期/), '2027-02-29');
  await fireEvent.press(view.getByTestId('todo-form-submit'));
  expect(api.createTodo).not.toHaveBeenCalled();
  expect(view.getAllByText('请输入有效日期，例如2026-10-06').length).toBeGreaterThan(0);
});
