/**
 * 待办接口门面：游客走本地存储，已登录走账号接口（`shared/api/todos`）。
 * 页面只从这里取函数，⛔ 不直接 import shared/api/todos —— 否则游客又会撞 401。
 */
import * as remote from '../../../../shared/api/todos';
import { isGuestMode } from './guestMode';
import {
  localCreateTodo,
  localDeleteTodo,
  localGetTodayTodos,
  localGetTodos,
  localToggleTodo,
  localUpdateTodo,
} from './localTodos';

type Loose = Record<string, unknown>;

export function getTodos(options: Loose = {}): Promise<unknown> {
  return isGuestMode() ? localGetTodos() : remote.getTodos(options);
}
export function getTodayTodos(): Promise<unknown> {
  return isGuestMode() ? localGetTodayTodos() : remote.getTodayTodos();
}
export function createTodo(body: Loose): Promise<unknown> {
  return isGuestMode() ? localCreateTodo(body as never) : remote.createTodo(body);
}
export function updateTodo(id: number, body: Loose): Promise<unknown> {
  return isGuestMode() ? localUpdateTodo(id, body as never) : remote.updateTodo(id, body);
}
export function toggleTodo(id: number): Promise<unknown> {
  return isGuestMode() ? localToggleTodo(id) : remote.toggleTodo(id);
}
export function deleteTodo(id: number): Promise<unknown> {
  return isGuestMode() ? localDeleteTodo(id) : remote.deleteTodo(id);
}
export const createRemoteTodo = (body: Loose): Promise<unknown> => remote.createTodo(body);
