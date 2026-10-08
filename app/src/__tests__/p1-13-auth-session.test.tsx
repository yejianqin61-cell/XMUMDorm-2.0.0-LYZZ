/**
 * P1-13 · token 供给与登录最小链路 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：**鉴权失败口径**（401/403 的三种含义）、会话状态机
 *   S-3 落盘：令牌只进 `expo-secure-store`（⛔ 不进 AsyncStorage）、内存镜像同步可见
 *   S-1 集成：冷启动水合、登录、会话失效清理、登出清落盘；登录页
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { getAllNamespacedKeys, setItem } from '@/shared/storage';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { secondaryTabStore } from '@/features/navigation/secondaryTabs';

import {
  authFailureToAppError,
  classifyAuthFailure,
  isSessionInvalid,
} from '@/features/auth/authFailure';
import {
  clearToken,
  hydrateToken,
  readTokenSync,
  resetTokenMirrorForTests,
  saveToken,
  JWT_STORAGE_KEY,
} from '@/features/auth/tokenStore';
import {
  INITIAL_SESSION_STATE,
  SessionProvider,
  sessionReducer,
  useSession,
  type SessionAction,
  type SessionState,
} from '@/features/auth/session';

// 登录接口打桩（session.tsx 从 `shared/api/auth` 取 login）
jest.mock('../../../shared/api/auth', () => ({
  login: jest.fn(),
}));
// 路由打桩（登录页成功后会 back/replace）
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() },
}));

const loginApi = require('../../../shared/api/auth').login as jest.Mock;
const router = require('expo-router').router as {
  canGoBack: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
};
const secureStore = require('expo-secure-store') as { __store: Map<string, string> };

const AUTH_DIR = path.resolve(__dirname, '../features/auth');
const readAuth = (file: string): string => fs.readFileSync(path.join(AUTH_DIR, file), 'utf8');
const APP_DIR = path.resolve(__dirname, '../app');
const readApp = (file: string): string => fs.readFileSync(path.join(APP_DIR, file), 'utf8');

const run = (...actions: SessionAction[]): SessionState =>
  actions.reduce(sessionReducer, INITIAL_SESSION_STATE);

beforeEach(() => {
  secureStore.__store.clear();
  resetTokenMirrorForTests();
  loginApi.mockReset();
  router.canGoBack.mockReturnValue(false);
  secondaryTabStore.clear();
});

describe('TC-P1-13-1A · 令牌只进 SecureStore（宪法 4.1.2-2）', () => {
  it('3 个文件齐备', () => {
    for (const file of ['tokenStore.ts', 'authFailure.ts', 'session.tsx']) {
      expect(fs.existsSync(path.join(AUTH_DIR, file))).toBe(true);
    }
    expect(fs.existsSync(path.join(APP_DIR, 'login.tsx'))).toBe(true);
  });

  it('⛔ `tokenStore` **不** import AsyncStorage 落盘层（凭据不进明文）', () => {
    // ⚠️ 先剥注释：源码注释里正是在**解释为什么不 import 它**
    const code = stripComments(readAuth('tokenStore.ts'));
    expect(code).toContain('expo-secure-store');
    expect(code).not.toContain('shared/storage');
    expect(code).not.toContain('AsyncStorage');
  });

  it('SecureStore 的 key 只用合法字符（`[A-Za-z0-9._-]`）', () => {
    expect(JWT_STORAGE_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});

describe('TC-P1-13-2A · 令牌读写与内存镜像', () => {
  it('save → 镜像立刻可同步读；再 hydrate 也读得到（真落盘）', async () => {
    expect(readTokenSync()).toBeNull();
    await saveToken('jwt-abc');
    // 请求层读的是**同步镜像**：保存后必须立刻可读（否则登录后的第一个请求不带令牌）
    expect(readTokenSync()).toBe('jwt-abc');

    resetTokenMirrorForTests();
    expect(readTokenSync()).toBeNull();
    await expect(hydrateToken()).resolves.toBe('jwt-abc');
    expect(readTokenSync()).toBe('jwt-abc');
  });

  it('clear 同时清镜像与落盘（⛔ 不给"清了一半"的中间态）', async () => {
    await saveToken('jwt-abc');
    await clearToken();
    expect(readTokenSync()).toBeNull();
    await expect(hydrateToken()).resolves.toBeNull();
  });

  it('SecureStore 抛错时降级为"无令牌"，⛔ 不抛（否则根布局启动即白屏）', async () => {
    const store = require('expo-secure-store');
    const original = store.getItemAsync;
    store.getItemAsync = jest.fn(async () => {
      throw new Error('native unavailable');
    });
    await expect(hydrateToken()).resolves.toBeNull();
    expect(readTokenSync()).toBeNull();
    store.getItemAsync = original;
  });
});

describe('TC-P1-13-3A · ⚠️ 鉴权失败口径：**后端用了两个状态码**', () => {
  it('401：普通请求 = 没带令牌；**登录** = 凭据不对', () => {
    expect(classifyAuthFailure({ status: 401 }, 'request')).toBe('noToken');
    expect(classifyAuthFailure({ status: 401 }, 'login')).toBe('badCredentials');
  });

  it('403 **无处罚标记** = 令牌无效/过期（后端 `middleware/auth.js` 就是这么发的）', () => {
    expect(classifyAuthFailure({ status: 403, body: { message: '令牌无效或已过期' } })).toBe(
      'expiredToken'
    );
  });

  it('403 **带 `banned`/`muted`** = 被处罚（`checkSanction`），⛔ 与"过期"分开', () => {
    expect(classifyAuthFailure({ status: 403, body: { banned: true } })).toBe('sanctioned');
    expect(classifyAuthFailure({ status: 403, body: { muted: true } })).toBe('sanctioned');
  });

  it('与鉴权无关的失败归 other（含非对象 / 无 status）', () => {
    expect(classifyAuthFailure({ status: 500 })).toBe('other');
    expect(classifyAuthFailure(new Error('boom'))).toBe('other');
    expect(classifyAuthFailure(null)).toBe('other');
  });
});

describe('TC-P1-13-4A · 哪些失败算"会话不能用了"', () => {
  it('没令牌 / 令牌过期 → 要重新登录', () => {
    expect(isSessionInvalid('noToken')).toBe(true);
    expect(isSessionInvalid('expiredToken')).toBe(true);
  });

  it('⛔ **被处罚不算会话失效**：令牌仍然有效，登出会把"封禁"伪装成"登录过期"', () => {
    expect(isSessionInvalid('sanctioned')).toBe(false);
    expect(isSessionInvalid('badCredentials')).toBe(false);
    expect(isSessionInvalid('other')).toBe(false);
  });

  it('映射到统一错误模型：会话类走 `permission`，凭据错走 `validation`', () => {
    expect(authFailureToAppError('noToken').kind).toBe('permission');
    expect(authFailureToAppError('expiredToken').kind).toBe('permission');
    expect(authFailureToAppError('sanctioned').kind).toBe('permission');
    // 凭据错是"这一项填错了"，不是权限问题（否则文案会变成"切换账号"）
    expect(authFailureToAppError('badCredentials').kind).toBe('validation');
    expect(authFailureToAppError('other').kind).toBe('unknown');
  });
});

describe('TC-P1-13-5A · 会话状态机（纯函数）', () => {
  it('水合：有令牌 → signedIn；无令牌 → signedOut', () => {
    expect(run({ type: 'hydrate', hasToken: true }).status).toBe('signedIn');
    expect(run({ type: 'hydrate', hasToken: false }).status).toBe('signedOut');
  });

  it('登录成功 → signedIn 且记住标识', () => {
    const s = run({ type: 'hydrate', hasToken: false }, { type: 'login:success', identifier: 'a@b.c' });
    expect(s).toEqual({ status: 'signedIn', identifier: 'a@b.c' });
  });

  it('会话失效 → expired 且清掉标识', () => {
    const s = run(
      { type: 'hydrate', hasToken: true },
      { type: 'login:success', identifier: 'a@b.c' },
      { type: 'session:expired' }
    );
    expect(s).toEqual({ status: 'expired', identifier: null });
  });

  it('登出 → signedOut', () => {
    expect(run({ type: 'hydrate', hasToken: true }, { type: 'logout' }).status).toBe('signedOut');
  });
});

describe('TC-P1-13-6A · 集成：水合 / 登录 / 失效 / 登出', () => {
  function Probe(): React.ReactElement {
    const session = useSession();
    return (
      <Pressable
        testID="act"
        onPress={() => {
          void session.login('a@b.c', 'pw');
        }}
      >
        <Text role="body">{`status=${session.status} signedIn=${session.isSignedIn}`}</Text>
      </Pressable>
    );
  }

  it('冷启动有水合令牌 → 直接 signedIn（不校验有效性，靠第一次请求的 401/403）', async () => {
    await saveToken('jwt-existing');
    const view = await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByText(/status=signedIn/)).toBeTruthy());
  });

  it('冷启动无令牌 → signedOut', async () => {
    const view = await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByText(/status=signedOut/)).toBeTruthy());
  });

  it('登录成功 → 令牌落盘 **且请求层同步可见**', async () => {
    loginApi.mockResolvedValue({ success: true, token: 'jwt-new' });
    const view = await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByText(/status=signedOut/)).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('act'));
    await waitFor(() => expect(view.getByText(/status=signedIn/)).toBeTruthy());
    expect(readTokenSync()).toBe('jwt-new');
    expect(secureStore.__store.get(JWT_STORAGE_KEY)).toBe('jwt-new');
  });

  it('登录失败（后端 200 + 无 token）→ 保持 signedOut，⛔ 不写令牌', async () => {
    loginApi.mockResolvedValue({ success: false, message: '密码错误' });
    const view = await renderApp(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('act'));
    await waitFor(() => expect(loginApi).toHaveBeenCalled());
    expect(readTokenSync()).toBeNull();
  });

  it('⛔ **被封禁不清令牌**：`handleAuthFailure` 对 403+banned 只返回错误', async () => {
    function FailureProbe(): React.ReactElement {
      const session = useSession();
      const [kind, setKind] = React.useState('none');
      return (
        <Pressable
          testID="fail"
          onPress={() => {
            void (async () => {
              const err = await session.handleAuthFailure({ status: 403, body: { banned: true } });
              setKind(err.kind);
            })();
          }}
        >
          <Text role="body">{`kind=${kind} token=${String(readTokenSync())}`}</Text>
        </Pressable>
      );
    }
    await saveToken('jwt-still-valid');
    const view = await renderApp(
      <SessionProvider>
        <FailureProbe />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByText(/status|kind=none/)).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('fail'));
    await waitFor(() => expect(view.getByText(/kind=permission/)).toBeTruthy());
    // 令牌**必须还在**（被封禁的用户仍然有效，只是不能发内容）
    expect(readTokenSync()).toBe('jwt-still-valid');
  });

  it('会话失效（403 令牌类）→ 清令牌 + 状态 expired', async () => {
    function ExpireProbe(): React.ReactElement {
      const session = useSession();
      return (
        <Pressable
          testID="expire"
          onPress={() => {
            void session.handleAuthFailure({ status: 403, body: { message: '令牌无效或已过期' } });
          }}
        >
          <Text role="body">{`status=${session.status} token=${String(readTokenSync())}`}</Text>
        </Pressable>
      );
    }
    await saveToken('jwt-old');
    await setItem('draft:publish-wall', {content:'Previous account private draft'});
    const view = await renderApp(
      <SessionProvider>
        <ExpireProbe />
      </SessionProvider>
    );
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('expire'));
    await waitFor(() => expect(view.getByText(/status=expired/)).toBeTruthy());
    expect(readTokenSync()).toBeNull();
    expect(secureStore.__store.has(JWT_STORAGE_KEY)).toBe(false);
    expect(await getAllNamespacedKeys()).toEqual([]);
  });

  it('登出 → 清令牌 **且清落盘命名空间**（否则下个账号看到上个账号的草稿与缓存）', async () => {
    function LogoutProbe(): React.ReactElement {
      const session = useSession();
      return (
        <Pressable
          testID="logout"
          onPress={() => {
            void session.logout();
          }}
        >
          <Text role="body">{`status=${session.status}`}</Text>
        </Pressable>
      );
    }
    await saveToken('jwt-x');
    // 先放一份"上一个账号"的落盘内容
    await setItem('draft:post-new', { title: '上一个账号的草稿' });
    expect((await getAllNamespacedKeys()).length).toBeGreaterThan(0);

    const view = await renderApp(
      <SessionProvider>
        <LogoutProbe />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByText(/status=signedIn/)).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('logout'));
    await waitFor(() => expect(view.getByText(/status=signedOut/)).toBeTruthy());
    expect(readTokenSync()).toBeNull();
    await waitFor(async () => {
      expect(await getAllNamespacedKeys()).toEqual([]);
    });
  });

  it('⛔ 没有 Provider 时 `useSession` 直接抛（不静默当成未登录）', () => {
    function Bare(): React.ReactElement {
      useSession();
      return <Text role="body">x</Text>;
    }
    expect(() => renderApp(<Bare />)).rejects.toThrow(/SessionProvider/);
  });
});

describe('TC-P1-13-7A · 登录页（最小链路）', () => {
  const LoginScreen = require('../app/login').default as () => React.ReactElement;

  it('渲染两个字段与提交按钮', async () => {
    const view = await renderApp(
      <SessionProvider>
        <LoginScreen />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByTestId('login-submit')).toBeTruthy());
    expect(view.getByTestId('login-identifier')).toBeTruthy();
    expect(view.getByTestId('login-password')).toBeTruthy();
  });

  it('学号为空 → **不调接口**，就近报错', async () => {
    const view = await renderApp(
      <SessionProvider>
        <LoginScreen />
      </SessionProvider>
    );
    await waitFor(() => expect(view.getByTestId('login-submit')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('login-submit'));
    await waitFor(() => expect(view.getByText('这一项不能为空')).toBeTruthy());
    expect(loginApi).not.toHaveBeenCalled();
  });

  it('提交成功 → 令牌落盘并离开本页（⛔ 不弹成功对话框）', async () => {
    loginApi.mockResolvedValue({ success: true, token: 'jwt-page' });
    const view = await renderApp(
      <SessionProvider>
        <LoginScreen />
      </SessionProvider>
    );
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.type(view.getByTestId('login-identifier'), 'a@b.c');
    await user.type(view.getByTestId('login-password'), 'pw');
    await user.press(view.getByTestId('login-submit'));
    await waitFor(() => expect(readTokenSync()).toBe('jwt-page'));
    expect(router.replace).toHaveBeenCalled();
  });

  it('提交失败 → 摘要区出现三段文案（走 `toErrorCopy`，⛔ 页面不写文案）', async () => {
    loginApi.mockResolvedValue({ success: false, message: '密码错误' });
    const view = await renderApp(
      <SessionProvider>
        <LoginScreen />
      </SessionProvider>
    );
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.type(view.getByTestId('login-identifier'), 'a@b.c');
    await user.press(view.getByTestId('login-submit'));
    await waitFor(() => expect(view.getByTestId('login-summary')).toBeTruthy());
    expect(loginApi).toHaveBeenCalled();
  });
});

describe('TC-P1-13-8A · 结构约束与接线', () => {
  it('⛔ 根布局挂了 `SessionProvider` 与 `login` 路由', () => {
    const src = readApp('_layout.tsx');
    expect(src).toContain('SessionProvider');
    expect(src).toContain('name="login"');
  });

  it('⛔ feature 层去注释后 0 处中文字面量（除开发者可见的 Error）', () => {
    const offenders: string[] = [];
    for (const file of ['tokenStore.ts', 'authFailure.ts', 'session.tsx']) {
      const code = stripComments(readAuth(file)).replace(
        /new Error\((['"`])[^'"`]*\1\)/g,
        'new Error()'
      );
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('⛔ 0 处 hex / 0 处数字字号 / 0 处自造浮层', () => {
    for (const file of ['session.tsx', 'tokenStore.ts', 'authFailure.ts']) {
      const src = readAuth(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/\bModal\b/);
    }
  });

  it('⛔ 不新建第二套鉴权机制：复用 `@/shared/api` 的注入接缝', () => {
    const src = readAuth('session.tsx');
    expect(src).toContain('setTokenGetter');
    expect(src).toContain('shared/api/auth');
  });
});
