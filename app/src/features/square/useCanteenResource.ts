/**
 * 食堂读接口的取数外壳（P1-17）—— 四态齐全、⛔ 不重复造
 *
 * 为什么单独写一层而不是每页各写一个 `useEffect`：
 * 四个页面（`S-07`…`S-10`）都是"公开读一次 → 四态渲染"，各自抄一遍必然漂移
 * （有的忘 `cancelled`、有的忘清 error）。这里只有**一处**取数逻辑。
 *
 * ⚠️ **不需要鉴权接缝**：`S-07`…`S-10` 用到的读接口在服务端**都没有** `authenticateToken`
 *    （见 `canteen.ts` 顶部说明）→ 不会出现 401/403，所以⛔ 不在这里挂 `handleAuthFailure`
 *    （挂了反而是假的安全感）。写路径（发评论/收藏）本轮不做。
 */

import * as React from 'react';

import type { AppError } from '@/i18n/errors';
import { onlineManager } from '@tanstack/react-query';
import { canteenRevision, subscribeCanteen, readCanteenCache, writeCanteenCache, requestCanteen } from './canteenCache';

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  stale: boolean;
};

/** 把捕获到的东西归到 `AppError`（兼容"已经是 AppError"与"抛出的原始错误"） */
export function toResourceError(error: unknown): AppError {
  if (error !== null && typeof error === 'object' && 'kind' in error) {
    return error as AppError;
  }
  const failure = error as { name?: string; status?: number } | null;
  if (failure?.status === undefined) {
    if (!onlineManager.isOnline()) return { kind: 'offline' };
    if (failure?.name === 'AbortError' || failure?.name === 'TimeoutError') return { kind: 'timeout' };
    if (error instanceof TypeError) return { kind: 'unreachable' };
  }
  return { kind: 'unknown' };
}

export type CanteenCacheOptions = { key: string; ttlMs: number; revalidate?: boolean };

export function useCanteenResource<T>(
  load: () => Promise<unknown>,
  normalize: (raw: unknown) => T | null,
  deps: readonly unknown[],
  cache?: CanteenCacheOptions
): ResourceState<T> & { reload: () => void } {
  const [state, setState] = React.useState<ResourceState<T>>({
    data: null,
    loading: true,
    error: null,
    stale: false,
  });
  const [nonce, setNonce] = React.useState(0);
  const force = React.useRef(false);
  const resourceKey = cache?.key ?? deps.map(String).join(':');
  const [stateKey, setStateKey] = React.useState(resourceKey);

  // ⛔ 用 ref 存函数/规范化器：否则调用方每次渲染传新引用就会无限重取
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const normalizeRef = React.useRef(normalize);
  normalizeRef.current = normalize;

  React.useEffect(() => {
    let cancelled = false;
    const version = canteenRevision();
    const forced = force.current; force.current = false;
    const active = () => !cancelled && version === canteenRevision();
    setStateKey(resourceKey);
    setState((previous) => ({ data: stateKey === resourceKey ? previous.data : null, loading: true, error: null, stale: stateKey === resourceKey && previous.data !== null }));
    const unsubscribe = subscribeCanteen(() => { cancelled = true; force.current = true; setNonce((n) => n + 1); });
    void (async () => {
      try {
        if (cache) {
          const cached = await readCanteenCache(cache.key, cache.ttlMs);
          if (!active()) return;
          const data = cached ? normalizeRef.current(cached.raw) : null;
          if (data !== null && cached) {
            const needsRead = forced || !cached.fresh || cache.revalidate === true;
            setState({ data, loading: needsRead, error: null, stale: needsRead });
            if (!needsRead) return;
          }
        }
        const raw = cache ? await requestCanteen(cache.key, () => loadRef.current()) : await loadRef.current();
        if (!active()) return;
        const data = normalizeRef.current(raw);
        if (data === null) {
          // 规范化失败 = 响应不是我们认识的形状（⛔ 不画半截页面）
          setState((previous) => ({ ...previous, loading: false, error: { kind: 'unknown' }, stale: previous.data !== null }));
          return;
        }
        if (cache) await writeCanteenCache(cache.key, raw, version).catch(() => undefined);
        if (active()) setState({ data, loading: false, error: null, stale: false });
      } catch (error) {
        if (!active()) return;
        setState((previous) => ({ ...previous, loading: false, error: toResourceError(error), stale: previous.data !== null }));
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, resourceKey, cache?.ttlMs, cache?.revalidate, nonce]);

  const reload = React.useCallback(() => { force.current = true; setNonce((n) => n + 1); }, []);
  return { ...(stateKey === resourceKey ? state : { data: null, loading: true, error: null, stale: false }), reload };
}
