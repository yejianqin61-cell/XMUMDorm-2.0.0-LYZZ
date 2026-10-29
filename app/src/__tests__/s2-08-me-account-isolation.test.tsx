/**
 * S2-08 · 账号隔离与登出清理（阶段2-04）—— 自动化用例
 *
 * 测什么（`login`/`register`/`logout`/`markExpired` 入口）：
 *   会话一变就把 query 缓存清空 —— 换账号后不会先看到上一账号的资料。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段2-04-账号隔离与登出清理.md`。
 */
import * as React from 'react';
import { act, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { Text } from '@/components/ui/Text';
import { useSession, SessionProvider, type SessionValue } from '@/features/auth/session';
import { getQueryClient } from '@/shared/queryClient';
import { login as loginApi, register as registerApi } from '../../../shared/api/auth';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('../../../shared/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  sendVerificationCode: jest.fn(),
  sendResetCode: jest.fn(),
  resetPassword: jest.fn(),
}));

const loginMock = loginApi as jest.Mock;
const registerMock = registerApi as jest.Mock;

let sessionRef: SessionValue | null = null;
function Probe(): React.ReactElement {
  const session = useSession();
  sessionRef = session;
  return <Text testID="session-status">{session.status}</Text>;
}

const PROFILE_KEY = ['me', 'profile'] as const;
const seedCache = (): void => {
  getQueryClient().setQueryData(PROFILE_KEY, { id: 9, nickname: 'PreviousAccount' });
};

beforeEach(() => {
  sessionRef = null;
  loginMock.mockReset().mockResolvedValue({ success: true, token: 'token-a', data: { id: 1 } });
  registerMock.mockReset().mockResolvedValue({ success: true, token: 'token-b' });
  getQueryClient().clear();
});

describe('S2-08 账号隔离与登出清理', () => {
  it('登录成功：缓存里的上一账号资料被清空', async () => {
    seedCache();
    await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await act(async () => {
      await sessionRef?.login('alice', 'password');
    });
    await waitFor(() => expect(sessionRef?.status).toBe('signedIn'));
    expect(getQueryClient().getQueryData(PROFILE_KEY)).toBeUndefined();
  });

  it('注册成功：与登录同口径清缓存', async () => {
    seedCache();
    await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await act(async () => {
      await sessionRef?.register({
        role: 'student',
        email: 'a@xmu.edu.my',
        username: 'alice',
        password: '123456',
        verification_code: '123456',
      });
    });
    await waitFor(() => expect(sessionRef?.status).toBe('signedIn'));
    expect(getQueryClient().getQueryData(PROFILE_KEY)).toBeUndefined();
  });

  it('登出：缓存清空', async () => {
    seedCache();
    await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await act(async () => {
      await sessionRef?.logout();
    });
    await waitFor(() => expect(sessionRef?.status).toBe('signedOut'));
    expect(getQueryClient().getQueryData(PROFILE_KEY)).toBeUndefined();
  });

  it('会话过期：缓存清空', async () => {
    seedCache();
    await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await act(async () => {
      await sessionRef?.markExpired();
    });
    await waitFor(() => expect(sessionRef?.status).toBe('expired'));
    expect(getQueryClient().getQueryData(PROFILE_KEY)).toBeUndefined();
  });
});
