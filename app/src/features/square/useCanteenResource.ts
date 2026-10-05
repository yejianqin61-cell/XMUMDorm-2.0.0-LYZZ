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

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: AppError | null;
};

/** 把捕获到的东西归到 `AppError`（兼容"已经是 AppError"与"抛出的原始错误"） */
export function toResourceError(error: unknown): AppError {
  if (error !== null && typeof error === 'object' && 'kind' in error) {
    return error as AppError;
  }
  return { kind: 'unknown' };
}

export function useCanteenResource<T>(
  load: () => Promise<unknown>,
  normalize: (raw: unknown) => T | null,
  deps: readonly unknown[]
): ResourceState<T> & { reload: () => void } {
  const [state, setState] = React.useState<ResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = React.useState(0);

  // ⛔ 用 ref 存函数/规范化器：否则调用方每次渲染传新引用就会无限重取
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const normalizeRef = React.useRef(normalize);
  normalizeRef.current = normalize;

  React.useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    void (async () => {
      try {
        const raw = await loadRef.current();
        if (cancelled) return;
        const data = normalizeRef.current(raw);
        if (data === null) {
          // 规范化失败 = 响应不是我们认识的形状（⛔ 不画半截页面）
          setState({ data: null, loading: false, error: { kind: 'unknown' } });
          return;
        }
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({ data: null, loading: false, error: toResourceError(error) });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
