import * as React from 'react';
import { getTodayTodos } from '../../../../shared/api/todos';
import { normalizeTodayTodos, type TodayTodos } from '@/features/me/dashboard';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import type { AppError } from '@/i18n/errors';
import { subscribeTodos } from './todos';

export function useTodayTodos(onError?: (error: unknown) => Promise<AppError>, dayKey?: string) {
  const [state, setState] = React.useState<{ data: TodayTodos | null; loading: boolean; error: AppError | null }>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = React.useState(0);
  const errorRef = React.useRef(onError); errorRef.current = onError;
  const epoch = timetableIdentity().epoch;
  const [stateEpoch, setStateEpoch] = React.useState(epoch);
  React.useEffect(() => subscribeTodos(() => setNonce((n) => n + 1)), []);
  React.useEffect(() => {
    let cancelled = false;
    setStateEpoch(epoch); setState({ data: null, loading: true, error: null });
    void (async () => {
      try {
        const raw = await getTodayTodos();
        if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { topItems?: unknown }).topItems)) throw { kind: 'unknown' };
        if (!cancelled && epoch === timetableIdentity().epoch) setState({ data: normalizeTodayTodos(raw), loading: false, error: null });
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
