/**
 * P2C2-01 · `A-01` 启动与会话水合 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：`resolveGateAction`（**水合期绝不跳转** = 不闪屏的病根）、哪些路由要身份；
 *   S-1 渲染：水合期显示启动位；过期被送到登录页时**能解释原因**；
 *   S-5 结构约束：门只在根布局挂一次，且⛔ 不新增 `useSafeAreaInsets()` 调用点。
 *
 * 依据：`docs/app/task/phase-2/P2C2-01-A01启动与会话水合.md`、宪法 17.1-S2、骨架规范 §6.3。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { SessionProvider } from '@/features/auth/session';
import { SessionGate, SessionSplash } from '@/features/auth/SessionGate';
import { PROTECTED_ROUTE_PREFIXES, loginNoticeKeyFor, resolveGateAction, routeRequiresAuth } from '@/features/auth/gate';

jest.mock('expo-router', () => {
  const state = { replaced: [] as unknown[], pathname: '/' };
  return {
    __state: state,
    usePathname: () => state.pathname,
    useRouter: () => ({
      push: jest.fn(),
      replace: (target: unknown) => state.replaced.push(target),
      back: jest.fn(),
      canGoBack: () => true,
    }),
  };
});

const routerState = require('expo-router').__state as { replaced: unknown[]; pathname: string };

const SRC_ROOT = path.resolve(__dirname, '..');
const readSrc = (rel: string): string => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');

describe('P2C2-01 A-01 启动与会话水合', () => {
  describe('TC-P2C2-01-1A · 门的三态（⛔ 水合期绝不跳转）', () => {
    it('`restoring`：无论路径要不要身份，都只显示启动位', () => {
      expect(resolveGateAction('restoring', true)).toBe('splash');
      expect(resolveGateAction('restoring', false)).toBe('splash');
    });

    it('`signedIn` 放行；`signedOut`/`expired` 只在"要身份"时送去登录页', () => {
      expect(resolveGateAction('signedIn', true)).toBe('allow');
      expect(resolveGateAction('signedOut', true)).toBe('toLogin');
      expect(resolveGateAction('expired', true)).toBe('toLogin');
      // 匿名可看的页面：⛔ 不跳（内测时"没登录也能看看"）
      expect(resolveGateAction('signedOut', false)).toBe('allow');
      expect(resolveGateAction('expired', false)).toBe('allow');
    });

    it('`expired` 与普通未登录**不同**：前者要解释原因', () => {
      expect(loginNoticeKeyFor('expired')).toBe('auth.expired');
      expect(loginNoticeKeyFor('signedOut')).toBeNull();
      expect(loginNoticeKeyFor('restoring')).toBeNull();
    });
  });

  describe('TC-P2C2-01-2A · 需要身份的路由清单', () => {
    it('「我的」与发布链路要身份；广场/工具/校园里不要', () => {
      expect(routeRequiresAuth('/me')).toBe(true);
      expect(routeRequiresAuth('/me/settings')).toBe(true);
      expect(routeRequiresAuth('/mailbox')).toBe(true);
      expect(routeRequiresAuth('/publish-center')).toBe(true);
      expect(routeRequiresAuth('/publish/confession')).toBe(true);

      expect(routeRequiresAuth('/')).toBe(false);
      expect(routeRequiresAuth('/tools')).toBe(false);
      expect(routeRequiresAuth('/campus')).toBe(false);
      expect(routeRequiresAuth('/canteen')).toBe(false);
      // ⛔ 登录页自己永远不需要身份（否则会无限跳）
      expect(routeRequiresAuth('/login')).toBe(false);
    });

    it('前缀匹配不误伤同名前缀（`/messages` 不该被 `/me` 命中）', () => {
      expect(routeRequiresAuth('/messages')).toBe(false);
      expect(PROTECTED_ROUTE_PREFIXES).toContain('/me');
    });
  });

  describe('TC-P2C2-01-3A · 启动位', () => {
    it('启动位渲染品牌位 + spinner（整块由根布局传入的 insets 夹在安全区内）', async () => {
      const view = await renderApp(<SessionSplash topInset={24} bottomInset={48} />);
      expect(view.getByTestId('session-splash')).toBeTruthy();
      expect(view.getByTestId('splash-brand')).toBeTruthy();
      expect(view.getByTestId('splash-loading')).toBeTruthy();
      expect(view.getByText(zh['auth.splash'])).toBeTruthy();
    });

    it('⚠️ 门本身在 `renderApp` 里**看不到**启动位：水合已经把状态推到 signedOut —— 这正是"不闪屏"想要的结果', async () => {
      routerState.replaced.length = 0;
      routerState.pathname = '/me';
      const view = await renderApp(
        <SessionProvider>
          <SessionGate topInset={24} bottomInset={48} />
        </SessionProvider>
      );
      expect(view.queryByTestId('session-splash')).toBeNull();
      // 未登录 + 要身份的路由 → 送去登录页
      await waitFor(() => expect(routerState.replaced).toContain('/login'));
    });
  });

  describe('TC-P2C2-01-4A · 结构约束：门挂一次，且不新增 insets 调用点', () => {
    it('门只在 `_layout.tsx` 里出现（页面里 0 处）', () => {
      const walk = (dir: string, out: string[] = []): string[] => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === '__tests__') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full, out);
          else if (/\.tsx$/.test(entry.name)) out.push(full);
        }
        return out;
      };
      const holders = walk(SRC_ROOT)
        .filter((file) => stripComments(fs.readFileSync(file, 'utf8')).includes('<SessionGate'))
        .map((file) => path.relative(SRC_ROOT, file));
      expect(holders).toEqual([path.join('app', '_layout.tsx')]);
    });

    it('`SessionGate` ⛔ 不 import `react-native-safe-area-context`（insets 由根布局传入）', () => {
      // ⚠️ 必须剥注释：本文件的注释里就写着"不 import react-native-safe-area-context"，
      //    不剥注释会把说明文字当成违规（Phase 1 的共享 `stripComments` 就是被这类误报逼出来的）
      const code = stripComments(readSrc(path.join('features', 'auth', 'SessionGate.tsx')));
      expect(code).not.toContain('react-native-safe-area-context');
      expect(code).not.toContain('useSafeAreaInsets');
      // 而根布局**必须**把它算好的值传进来
      const layout = stripComments(readSrc(path.join('app', '_layout.tsx')));
      expect(layout).toContain('<SessionGate');
      expect(layout).toContain('topInset={insets.top}');
    });

    it('登录页能解释"为什么被送到这里"（`auth.expired`）', () => {
      const code = stripComments(readSrc(path.join('app', 'login.tsx')));
      expect(code).toContain("session.status === 'expired'");
      expect(code).toContain('login-expired');
    });
  });
});
