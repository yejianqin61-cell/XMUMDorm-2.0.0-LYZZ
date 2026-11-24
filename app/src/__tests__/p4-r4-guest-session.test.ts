/**
 * 第四轮 R4-01 / R4-02：游客不是「会话过期」，也不是「没权限」。
 */
import { sessionReducer, INITIAL_SESSION_STATE } from '@/features/auth/session';
import { authFailureToAppError, classifyAuthFailure } from '@/features/auth/authFailure';
import { errorFor } from '@/features/campus/campusModel';
import { toErrorCopy } from '@/i18n/errors';
import { zh } from '@/i18n/zh';

describe('R4-01 · 游客收到 401 不进 expired', () => {
  it('signedOut 收到 session:expired 保持 signedOut', () => {
    const out = sessionReducer({ status: 'signedOut', identifier: null }, { type: 'session:expired' });
    expect(out.status).toBe('signedOut');
  });
  it('restoring 收到 session:expired 保持 restoring', () => {
    expect(sessionReducer(INITIAL_SESSION_STATE, { type: 'session:expired' }).status).toBe('restoring');
  });
  it('signedIn 收到 session:expired 才进 expired', () => {
    const out = sessionReducer({ status: 'signedIn', identifier: 'a' }, { type: 'session:expired' });
    expect(out.status).toBe('expired');
  });
});

describe('R4-02 · 401 与 403 分开', () => {
  it('401 → signin，403 → permission', () => {
    expect(errorFor({ status: 401 }).kind).toBe('signin');
    expect(errorFor({ status: 403 }).kind).toBe('permission');
    expect(authFailureToAppError(classifyAuthFailure({ status: 401 })).kind).toBe('signin');
  });
  it('signin / permission 文案都没有空插值', () => {
    const t = (key: keyof typeof zh, params?: Record<string, string | number>) =>
      String(zh[key]).replace(/\{(\w+)\}/g, (_m, k) => String(params?.[k] ?? ''));
    for (const kind of ['signin', 'permission'] as const) {
      const copy = toErrorCopy({ kind }, t as never);
      for (const text of [copy.perceive, copy.understand, copy.fix]) {
        expect(text).not.toMatch(/\{|\}|\s{2,}/);
        expect(text.length).toBeGreaterThan(0);
      }
    }
    expect(toErrorCopy({ kind: 'signin' }, t as never).actionKind).toBe('login');
  });
});
