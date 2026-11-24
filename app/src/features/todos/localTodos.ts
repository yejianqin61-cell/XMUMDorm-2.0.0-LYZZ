/**
 * 游客本地待办（R4-28：待办本地优先，游客也能建，登录后同步）。
 * 存储形状与后端行一致（snake_case），这样 `normalizeTodos` / `normalizeToolsTodayTodos` 不用分叉。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@dorm:guest-todos';

type Row = {
  id: number;
  title: string;
  description: string;
  priority: number;
  due_date: string | null;
  due_time: string | null;
  is_completed: boolean;
  list_type: string;
};
type Store = { nextId: number; rows: Row[] };

async function read(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : null;
    if (parsed && Array.isArray(parsed.rows) && Number.isSafeInteger(parsed.nextId)) return parsed;
  } catch { /* 损坏的缓存当作没有 */ }
  return { nextId: 1, rows: [] };
}
async function write(store: Store): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(now);
}

export async function localGetTodos(): Promise<{ list: Row[]; hasMore: boolean }> {
  const { rows } = await read();
  // 未完成在前，其次按优先级高→低，再按 id 新→旧
  const sorted = [...rows].sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || b.priority - a.priority || b.id - a.id);
  return { list: sorted, hasMore: false };
}

export async function localGetTodayTodos(): Promise<{ total: number; active: number; completed: number; topItems: { id: number; title: string }[] }> {
  const { rows } = await read();
  const today = todayKey();
  const todays = rows.filter((row) => row.due_date === today || row.due_date === null);
  const active = todays.filter((row) => !row.is_completed);
  return {
    total: todays.length,
    active: active.length,
    completed: todays.length - active.length,
    topItems: active.sort((a, b) => b.priority - a.priority).slice(0, 3).map(({ id, title }) => ({ id, title })),
  };
}

export async function localCreateTodo(body: Partial<Row>): Promise<{ id: number }> {
  const store = await read();
  const id = store.nextId;
  store.nextId += 1;
  store.rows.push({
    id,
    title: String(body.title ?? '').trim(),
    description: String(body.description ?? ''),
    priority: Number.isFinite(body.priority) ? Number(body.priority) : 0,
    due_date: body.due_date ?? null,
    due_time: body.due_time ?? null,
    is_completed: false,
    list_type: String(body.list_type ?? 'personal'),
  });
  await write(store);
  return { id };
}

export async function localUpdateTodo(id: number, body: Partial<Row>): Promise<{ id: number }> {
  const store = await read();
  store.rows = store.rows.map((row) => (row.id === id ? { ...row, ...body, id } : row));
  await write(store);
  return { id };
}

export async function localToggleTodo(id: number): Promise<{ id: number }> {
  const store = await read();
  store.rows = store.rows.map((row) => (row.id === id ? { ...row, is_completed: !row.is_completed } : row));
  await write(store);
  return { id };
}

export async function localDeleteTodo(id: number): Promise<{ id: number }> {
  const store = await read();
  store.rows = store.rows.filter((row) => row.id !== id);
  await write(store);
  return { id };
}

/** 登录/注册成功后：把游客期间建的待办逐条补到账号，成功一条清一条，失败的留着下次再试 */
export async function syncLocalTodosToAccount(create: (body: Partial<Row>) => Promise<unknown>): Promise<void> {
  const store = await read();
  const remaining: Row[] = [];
  for (const row of store.rows) {
    try {
      await create({ title: row.title, description: row.description, priority: row.priority, due_date: row.due_date, due_time: row.due_time, list_type: row.list_type });
    } catch {
      remaining.push(row);
    }
  }
  await write({ nextId: store.nextId, rows: remaining });
}
