/**
 * 第四轮 R4-28：待办本地优先——游客也能建，登录后同步。
 */
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore[key] = value; }),
  },
}));
jest.mock('../../../shared/api/todos', () => ({
  getTodos: jest.fn(), getTodayTodos: jest.fn(), createTodo: jest.fn(), updateTodo: jest.fn(), toggleTodo: jest.fn(), deleteTodo: jest.fn(),
}));

import * as remote from '../../../shared/api/todos';
import { setGuestMode } from '@/features/todos/guestMode';
import * as api from '@/features/todos/todoApi';
import { normalizeTodos } from '@/features/todos/todos';
import { normalizeToolsTodayTodos } from '@/features/todos/useTodayTodos';
import { syncLocalTodosToAccount } from '@/features/todos/localTodos';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  jest.clearAllMocks();
});

describe('R4-28 · 游客本地待办', () => {
  it('游客：建、改、勾选、删都不碰账号接口，且形状能被 normalizeTodos 读懂', async () => {
    setGuestMode(true);
    const { id } = (await api.createTodo({ title: '取快递', priority: 3, due_date: null, due_time: null })) as { id: number };
    await api.createTodo({ title: '还书', priority: 1 });
    await api.updateTodo(id, { title: '取快递（LY3）' });
    await api.toggleTodo(id);
    const page = normalizeTodos(await api.getTodos({ page: 1 }));
    expect(page?.list.map((r) => [r.title, r.completed])).toEqual([['还书', false], ['取快递（LY3）', true]]);
    const today = normalizeToolsTodayTodos(await api.getTodayTodos());
    expect(today).toMatchObject({ total: 2, active: 1, completed: 1 });
    await api.deleteTodo(id);
    expect(normalizeTodos(await api.getTodos())?.list).toHaveLength(1);
    expect(remote.createTodo).not.toHaveBeenCalled();
    expect(remote.getTodos).not.toHaveBeenCalled();
  });

  it('已登录：全部走账号接口', async () => {
    setGuestMode(false);
    (remote.getTodos as jest.Mock).mockResolvedValue({ list: [], hasMore: false });
    await api.getTodos({ page: 1 });
    await api.createTodo({ title: 'x' });
    expect(remote.getTodos).toHaveBeenCalledTimes(1);
    expect(remote.createTodo).toHaveBeenCalledTimes(1);
  });

  it('登录后同步：成功的清掉，失败的留在本地', async () => {
    setGuestMode(true);
    await api.createTodo({ title: 'A' });
    await api.createTodo({ title: 'B' });
    const create = jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    await syncLocalTodosToAccount(create);
    expect(create).toHaveBeenCalledTimes(2);
    const left = normalizeTodos(await api.getTodos())?.list.map((r) => r.title);
    expect(left).toEqual(['B']);
  });
});
