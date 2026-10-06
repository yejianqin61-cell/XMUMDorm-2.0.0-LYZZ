/**
 * P2C2-03 · `A-04` 找回密码 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：步骤机（**没发码不许进第二步**）、新密码 ≥6、可提交判定、提交体字段名；
 *   S-1 页面：初始只有"邮箱 + 发码"，**没发码就没有提交的两步**；重置成功 → 回登录页；
 *   S-5 结构约束：登录页是 A-03/A-04 的入口（页面清单）且复用同一个 `D25`。
 *
 * 依据：`docs/app/task/phase-2/P2C2-03-A04找回密码.md`、`routes/auth.js:128-240`。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { userEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { ToastProvider } from '@/components/ui/Toast';
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen';
import { canSubmitReset, newPasswordErrorKey, resetBody, resetStepFor } from '@/features/auth/reset';
import { MIN_PASSWORD_LENGTH } from '@/features/auth/register';

jest.mock('expo-router', () => {
  const state = { replaced: [] as unknown[], pushed: [] as unknown[] };
  return {
    __state: state,
    useRouter: () => ({
      replace: (target: unknown) => state.replaced.push(target),
      push: (target: unknown) => state.pushed.push(target),
      back: jest.fn(),
      canGoBack: () => true,
    }),
  };
});
jest.mock('../../../shared/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  sendVerificationCode: jest.fn(),
  sendResetCode: jest.fn(),
  resetPassword: jest.fn(),
}));

const routerState = require('expo-router').__state as { replaced: unknown[]; pushed: unknown[] };
const api = require('../../../shared/api/auth') as {
  sendResetCode: jest.Mock;
  resetPassword: jest.Mock;
};

beforeEach(() => {
  routerState.replaced.length = 0;
  routerState.pushed.length = 0;
  api.sendResetCode.mockReset();
  api.resetPassword.mockReset();
  api.sendResetCode.mockResolvedValue({ success: true, message: 'ok', verificationCode: '111222' });
  api.resetPassword.mockResolvedValue({ success: true, message: 'ok' });
});

describe('P2C2-03 A-04 找回密码', () => {
  describe('TC-P2C2-03-1A · 步骤机：没发码不许进第二步', () => {
    it('未发码 → `request`；已发码 → `confirm`', () => {
      expect(resetStepFor(false)).toBe('request');
      expect(resetStepFor(true)).toBe('confirm');
    });

    it('未发码就提交 → **拦下**（⛔ 不空跑一次必然失败的请求）', () => {
      expect(canSubmitReset({ email: 'a@xmu.edu.my', code: '123456', newPassword: '123456' }, false)).toBe(
        'auth.codeNotSent'
      );
      expect(zh['auth.codeNotSent']).toBeTruthy();
    });
  });

  describe('TC-P2C2-03-2A · 新密码规则（与服务端同一条：≥6）', () => {
    it('5 位拒绝、6 位通过；空值走必填', () => {
      expect(MIN_PASSWORD_LENGTH).toBe(6);
      expect(newPasswordErrorKey('12345')).toBe('auth.passwordShort');
      expect(newPasswordErrorKey('123456')).toBeNull();
      expect(newPasswordErrorKey('')).toBe('form.error.required');
    });

    it('已在第二步时，返回**第一个**错误（邮箱 → 验证码 → 新密码）', () => {
      const good = { email: 'a@xmu.edu.my', code: '123456', newPassword: '123456' };
      expect(canSubmitReset(good, true)).toBeNull();
      expect(canSubmitReset({ ...good, email: 'a@qq.com' }, true)).toBe('auth.emailDomain');
      expect(canSubmitReset({ ...good, code: '12' }, true)).toBe('auth.codeLength');
      expect(canSubmitReset({ ...good, newPassword: '1' }, true)).toBe('auth.passwordShort');
    });

    it('提交体字段名与服务端一致', () => {
      expect(resetBody({ email: ' a@xmu.edu.my ', code: ' 123456 ', newPassword: 'abcdef' })).toEqual({
        email: 'a@xmu.edu.my',
        verification_code: '123456',
        new_password: 'abcdef',
      });
    });
  });

  describe('TC-P2C2-03-3A · 页面：两步是"发过码才长出来"的', () => {
    it('初始只有邮箱与发码按钮 —— **没有**验证码/新密码字段', async () => {
      const view = await renderApp(
        <ToastProvider>
          <ResetPasswordScreen />
        </ToastProvider>
      );
      expect(view.getByTestId('reset-email')).toBeTruthy();
      expect(view.getByTestId('reset-send-code')).toBeTruthy();
      expect(view.queryByTestId('reset-code')).toBeNull();
      expect(api.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('TC-P2C2-03-4A · 未注册邮箱：如实转达（不自己发明隐私策略）', () => {
    it('发码失败 → 给可改正的提示，且**不进入第二步**', async () => {
      api.sendResetCode.mockResolvedValue({ success: false, message: '该邮箱未注册' });
      const view = await renderApp(
        <ToastProvider>
          <ResetPasswordScreen />
        </ToastProvider>
      );
      // 用 `userEvent` 而不是裸 `fireEvent`：见 P2B-06 的教训 —— 未 await 的 act 作用域会污染后续用例
      const user = userEvent.setup();
      await user.type(view.getByTestId('reset-email'), 'nobody@xmu.edu.my');
      await user.press(view.getByTestId('reset-send-code'));
      await waitFor(() => expect(view.getByTestId('reset-send-failed')).toBeTruthy());
      expect(view.queryByTestId('reset-code')).toBeNull();
    });
  });

  describe('TC-P2C2-03-5A · 结构约束：入口在登录页，且复用同一个 D25', () => {
    it('登录页有"注册新账号"与"找回密码"两个入口（页面清单：A-03/A-04 的入口 = A-02）', () => {
      const code = stripComments(fs.readFileSync(path.join(__dirname, '..', 'app', 'login.tsx'), 'utf8'));
      expect(code).toContain("'/register'");
      expect(code).toContain("'/reset-password'");
      expect(code).toContain('login-to-register');
      expect(code).toContain('login-to-reset');
    });

    it('找回密码页复用 `D25 CountdownButton`（⛔ 没有第二套倒计时）', () => {
      const code = stripComments(
        fs.readFileSync(path.join(__dirname, '..', 'features', 'auth', 'ResetPasswordScreen.tsx'), 'utf8')
      );
      expect(code).toContain('CountdownButton');
      expect(code).not.toMatch(/setInterval/);
    });
  });
});
