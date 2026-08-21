const CACHE_PREFIX = 'dorm_todos_cache_v1';

function keyForUser(userId) {
  return `${CACHE_PREFIX}_u${Number(userId) || 0}`;
}

export function readPersistedTodos(userId) {
  if (typeof window === 'undefined' || !userId) return undefined;
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writePersistedTodos(userId, todos) {
  if (typeof window === 'undefined' || !userId || !Array.isArray(todos)) return;
  try {
    localStorage.setItem(keyForUser(userId), JSON.stringify(todos));
  } catch {
    // ponytail: localStorage is a best-effort first-paint cache; the API remains authoritative.
  }
}
