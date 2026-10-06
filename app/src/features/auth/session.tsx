/**
 * 会话（P1-13）—— 登录最小链路的状态与副作用
 *
 * ## 状态机（纯函数 `sessionReducer`，可测）
 * ```
 * restoring ── hydrate 有令牌 ──▶ signedIn
 *           └─ hydrate 无令牌 ──▶ signedOut
 * signedOut ── login 成功 ──▶ signedIn
 * signedIn  ── 401/403(令牌) ──▶ expired      ← 令牌已清
 * signedIn  ── logout ────────▶ signedOut
 * expired   ── login 成功 ──▶ signedIn
 * ```
 * ⛔ **被封禁 / 被禁言（403 + `banned`/`muted`）不进 `expired`**：令牌仍然有效，
 *    只是不能发内容；把人登出会把"被处罚"伪装成"登录过期"（见 `authFailure.ts`）。
 *
 * ## 三件必须做对的事
 * 1. **令牌只进 `expo-secure-store`**（宪法 4.1.2-2）——`tokenStore.ts` 负责；
 * 2. **请求层要能同步读到令牌**：`setTokenGetter(readTokenSync)` 在这里注入一次；
 * 3. **登出要清落盘**：`clearNamespace()`（P1-02 的落盘层注释里就写了"登出时调用"），
 *    否则下一个账号会看到上一个账号的草稿与缓存。
 */

import * as React from 'react';

import { clearNamespace } from '@/shared/storage';
import { login as loginApi, register as registerApi } from '../../../../shared/api/auth';
import { setTokenGetter } from '@/shared/api';
import {
  authFailureToAppError,
  classifyAuthFailure,
  isSessionInvalid,
  type AuthFailureKind,
  type AuthPhase,
} from './authFailure';
import { clearToken, hydrateToken, readTokenSync, saveToken } from './tokenStore';
import type { AppError } from '@/i18n/errors';

/* ────────────────────────── 状态机（纯函数） ────────────────────────── */

export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn' | 'expired';

export type SessionState = {
  status: SessionStatus;
  /** 登录接口返回的用户标识（页面自行决定怎么显示） */
  identifier: string | null;
};

export const INITIAL_SESSION_STATE: SessionState = { status: 'restoring', identifier: null };

export type SessionAction =
  | { type: 'hydrate'; hasToken: boolean; identifier?: string | null }
  | { type: 'login:success'; identifier: string }
  | { type: 'session:expired' }
  | { type: 'logout' };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'hydrate':
      // 水合只决定"有没有令牌"，**不校验有效性**（校验要靠第一次请求的 401/403）
      return {
        status: action.hasToken ? 'signedIn' : 'signedOut',
        identifier: action.hasToken ? (action.identifier ?? state.identifier) : null,
      };
    case 'login:success':
      return { status: 'signedIn', identifier: action.identifier };
    case 'session:expired':
      return { status: 'expired', identifier: null };
    case 'logout':
      return { status: 'signedOut', identifier: null };
    default:
      return state;
  }
}

/* ────────────────────────── Context ────────────────────────── */

export type LoginResult =
  | { ok: true }
  | { ok: false; error: AppError; failure: AuthFailureKind };

export type SessionValue = {
  status: SessionStatus;
  identifier: string | null;
  isSignedIn: boolean;
  /** 登录：成功即写令牌 + 进 `signedIn` */
  login: (identifier: string, password: string) => Promise<LoginResult>;
  /**
   * 注册（`A-03`，P2C2-02）：成功后后端**直接返回 token** → 与登录同一条落地路径
   * （写令牌 + 进 `signedIn`）。⛔ 不复用 `login()`：那是另一条端点与另一套错误口径。
   */
  register: (body: {
    role: string;
    email: string;
    username: string;
    password: string;
    verification_code: string;
  }) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** 任何请求捕获到会话失效时调用（401 / 403 令牌类） */
  markExpired: () => Promise<void>;
  /**
   * 把任意错误过一遍鉴权口径：会话失效就**顺手**清令牌并置 `expired`。
   * 返回可直接喂给 `T02` / `K04` 的 `AppError`。
   */
  handleAuthFailure: (error: unknown, phase?: AuthPhase) => Promise<AppError>;
};

const SessionContext = React.createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = React.useReducer(sessionReducer, INITIAL_SESSION_STATE);

  // 请求层注入**同步**读取器（只做一次）
  React.useEffect(() => {
    setTokenGetter(readTokenSync);
    return () => setTokenGetter(null);
  }, []);

  // 冷启动水合
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await hydrateToken();
      if (!cancelled) dispatch({ type: 'hydrate', hasToken: token !== null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markExpired = React.useCallback(async () => {
    await clearToken();
    dispatch({ type: 'session:expired' });
  }, []);

  const logout = React.useCallback(async () => {
    await clearToken();
    // ⛔ 不清落盘的话，下一个账号会看到上一个账号的草稿与缓存
    await clearNamespace();
    dispatch({ type: 'logout' });
  }, []);

  const login = React.useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      try {
        const result = await loginApi(identifier, password);
        if (!result.success || !result.token) {
          // 后端把"凭据不对"放在 200 + message 里（`requestRaw` 不抛）→ 按凭据错误处理
          return {
            ok: false,
            failure: 'badCredentials',
            error: authFailureToAppError('badCredentials'),
          };
        }
        await saveToken(result.token);
        dispatch({ type: 'login:success', identifier });
        return { ok: true };
      } catch (error) {
        const failure = classifyAuthFailure(error, 'login');
        return { ok: false, failure, error: authFailureToAppError(failure) };
      }
    },
    []
  );

  const register = React.useCallback(
    async (body: {
      role: string;
      email: string;
      username: string;
      password: string;
      verification_code: string;
    }): Promise<LoginResult> => {
      try {
        const result = await registerApi(body);
        if (!result.success || !result.token) {
          // 后端把业务失败放在 200 + message 里（`requestRaw` 不抛）→ 按校验失败处理
          return {
            ok: false,
            failure: 'badCredentials',
            error: authFailureToAppError('badCredentials'),
          };
        }
        await saveToken(result.token);
        dispatch({ type: 'login:success', identifier: body.username });
        return { ok: true };
      } catch (error) {
        const failure = classifyAuthFailure(error, 'login');
        return { ok: false, failure, error: authFailureToAppError(failure) };
      }
    },
    []
  );

  const handleAuthFailure = React.useCallback(
    async (error: unknown, phase: AuthPhase = 'request'): Promise<AppError> => {
      const failure = classifyAuthFailure(error, phase);
      if (isSessionInvalid(failure)) await markExpired();
      return authFailureToAppError(failure);
    },
    [markExpired]
  );

  const value = React.useMemo<SessionValue>(
    () => ({
      status: state.status,
      identifier: state.identifier,
      isSignedIn: state.status === 'signedIn',
      login,
      register,
      logout,
      markExpired,
      handleAuthFailure,
    }),
    [state.status, state.identifier, login, register, logout, markExpired, handleAuthFailure]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** ⛔ 没有 Provider 就抛（早失败优于"静默当成已登录/未登录"） */
export function useSession(): SessionValue {
  const value = React.useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession 必须在 SessionProvider 内使用');
  }
  return value;
}
