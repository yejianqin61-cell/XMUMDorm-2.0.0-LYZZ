import { get, post, patch, del } from '../utils/http';

export function getTodos(options = {}) {
  const params = new URLSearchParams();
  if (options.date) params.set('date', options.date);
  if (options.status) params.set('status', options.status);
  if (options.list_type) params.set('list_type', options.list_type);
  if (options.page) params.set('page', options.page);
  if (options.pageSize) params.set('pageSize', options.pageSize);
  const qs = params.toString();
  return get(`/api/todos${qs ? `?${qs}` : ''}`);
}

export function getTodayTodos() {
  return get('/api/todos/today');
}

export function createTodo(body) {
  return post('/api/todos', body);
}

export function updateTodo(id, body) {
  return patch(`/api/todos/${id}`, body);
}

export function toggleTodo(id) {
  return patch(`/api/todos/${id}/toggle`, {});
}

export function deleteTodo(id) {
  return del(`/api/todos/${id}`);
}
