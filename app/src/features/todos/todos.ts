import { parseYmd } from '../../../../shared/config/semesters';
import { getTodos } from '../../../../shared/api/todos';
import type { FormValues } from '@/components/ui/FormField';
import type { MessageKey } from '@/i18n/zh';

export type Todo = { id: number; title: string; description: string; priority: number; dueDate: string | null; dueTime: string | null; completed: boolean; listType: string };
export type TodoPage = { list: readonly Todo[]; hasMore: boolean };
export const TODO_PRIORITY_KEYS = ['tools.todos.priority.0', 'tools.todos.priority.1', 'tools.todos.priority.2', 'tools.todos.priority.3'] as const;
export function normalizeTodos(raw: unknown): TodoPage | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { list?: unknown }).list)) return null;
  const page = raw as { list: unknown[]; hasMore?: boolean };
  return { hasMore: page.hasMore === true, list: page.list.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.title !== 'string') return [];
    return [{ id: row.id, title: row.title, description: typeof row.description === 'string' ? row.description : '', priority: typeof row.priority === 'number' ? Math.max(0, Math.min(3, Math.trunc(row.priority))) : 0,
      dueDate: typeof row.due_date === 'string' ? row.due_date : null, dueTime: typeof row.due_time === 'string' ? row.due_time.slice(0, 5) : null,
      completed: row.is_completed === true || row.is_completed === 1, listType: typeof row.list_type === 'string' ? row.list_type : 'personal' }];
  }) };
}
export function validateTodoDate(value: unknown): MessageKey | undefined {
  return value === '' || value == null || (typeof value === 'string' && parseYmd(value)) ? undefined : 'tools.todos.dateInvalid';
}
export function validateTodoTime(value: unknown): MessageKey | undefined {
  return value === '' || value == null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) ? undefined : 'tools.todos.timeInvalid';
}
export function todoPayload(values: FormValues) {
  return { title: String(values.title ?? '').trim(), description: String(values.description ?? '').trim(), priority: Number(values.priority),
    due_date: values.dueDate ? String(values.dueDate).trim() : null, due_time: values.dueTime ? String(values.dueTime).trim() : null, list_type: String(values.listType ?? 'personal') };
}
export function mergeTodos(previous: readonly Todo[], next: readonly Todo[]): readonly Todo[] {
  const byId = new Map(previous.map((row) => [row.id, row]));
  for (const row of next) byId.set(row.id, row);
  return [...byId.values()];
}
export async function findTodo(id: number): Promise<Todo | null> {
  for (let page = 1; ; page += 1) {
    const result = normalizeTodos(await getTodos({ page, pageSize: 50 }));
    if (result === null) throw { kind: 'unknown' };
    const found = result.list.find((row) => row.id === id);
    if (found) return found;
    if (!result.hasMore || result.list.length === 0) return null;
  }
}
const listeners = new Set<() => void>();
export function notifyTodosChanged(): void { for (const listener of listeners) listener(); }
export function subscribeTodos(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
