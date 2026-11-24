import * as React from 'react';
import { getTodayTodos } from './todoApi';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import type { AppError } from '@/i18n/errors';
import { subscribeTodos } from './todos';

export type ToolsTodayTodos = {
  total: number;
  active: number;
  completed: number;
  top: readonly { id: number; title: string }[];
};

/** The endpoint omits completion flags; explicit completed flags never enter the preview. */
export function normalizeToolsTodayTodos(payload: unknown): ToolsTodayTodos {
  const raw = payload !== null && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const top: { id: number; title: string }[] = [];
  const seen = new Set<number>();
  for (const entry of Array.isArray(raw.topItems) ? raw.topItems : []) {
    if (entry === null || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    if (item.is_completed === true || item.is_completed === 1 || item.completed === true || item.completed === 1) continue;
    if (typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id <= 0 || seen.has(item.id)) continue;
    if (typeof item.title !== 'string' || !item.title.trim()) continue;
    seen.add(item.id);
    top.push({ id: item.id, title: item.title });
    if (top.length === 3) break;
  }
  const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return { total: count(raw.total), active: count(raw.active), completed: count(raw.completed), top };
}

export function useTodayTodos(onError?: (error: unknown) => Promise<AppError>, dayKey?: string) {
  const [state, setState] = React.useState<{ data: ToolsTodayTodos | null; loading: boolean; error: AppError | null }>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = React.useState(0);
  const errorRef = React.useRef(onError);
  React.useEffect(() => { errorRef.current = onError; }, [onError]);
  const epoch = timetableIdentity().epoch;
  const [stateEpoch, setStateEpoch] = React.useState(epoch);
  React.useEffect(() => subscribeTodos(() => setNonce((n) => n + 1)), []);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStateEpoch(epoch); setState({ data: null, loading: true, error: null });
      try {
        const raw = await getTodayTodos();
        if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { topItems?: unknown }).topItems)) throw { kind: 'unknown' };
        if (!cancelled && epoch === timetableIdentity().epoch) setState({ data: normalizeToolsTodayTodos(raw), loading: false, error: null });
      } catch (error) {
        if (cancelled || epoch !== timetableIdentity().epoch) return;
        const auth = await errorRef.current?.(error);
        if (!cancelled && epoch === timetableIdentity().epoch) setState({ data: null, loading: false, error: toToolsError(error, auth) });
      }
    })();
    return () => { cancelled = true; };
  }, [nonce, epoch, dayKey]);
  return { ...(stateEpoch === epoch ? state : { data: null, loading: true, error: null }), reload: () => setNonce((n) => n + 1) };
}
