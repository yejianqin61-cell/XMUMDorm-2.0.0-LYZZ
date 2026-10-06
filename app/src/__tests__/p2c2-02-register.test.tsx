/**
 * P2C2-02 · `A-03` 注册 + `D25 CountdownButton` + 开发期验证码 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：邮箱域名硬门槛、验证码位数、密码长度、提交体字段、开发期验证码判据、倒计时状态机；
 *   S-1 页面：倒计时按钮禁用/文案、dev 码回显、注册成功后进已登录态；
 *   S-5 结构约束：共享层**只增字段**（`shared/api/auth.js` 带回了 verification_code）。
 *
 * 依据：`docs/app/task/phase-2/P2C2-02-A03注册与D25倒计时.md`、`routes/auth.js:46-123,249-401`。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { CODE_COOLDOWN_SECONDS, CountdownButton, resolveCountdownState } from '@/components/ui/CountdownButton';
import {
  CAMPUS_EMAIL_SUFFIX,
  CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  canSubmitRegister,
  codeErrorKey,
  emailErrorKey,
  isCampusEmail,
  passwordErrorKey,
  registerBody,
  revealDevCode,
} from '@/features/auth/register';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  sendVerificationCode: jest.fn(),
  sendResetCode: jest.fn(),
  resetPassword: jest.fn(),
}));

const api = require('../../../shared/api/auth') as {
  register: jest.Mock;
  sendVerificationCode: jest.Mock;
};

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

describe('P2C2-02 A-03 注册 / D25 倒计时', () => {
  describe('TC-P2C2-02-1A · 邮箱硬门槛：说清"要什么"', () => {
    it('校内邮箱通过；校外邮箱给出**可读原因**（⛔ 不是"格式错误"）', () => {
      expect(CAMPUS_EMAIL_SUFFIX).toBe('@xmu.edu.my');
      expect(isCampusEmail('a@xmu.edu.my')).toBe(true);
      expect(isCampusEmail('A@XMU.EDU.MY')).toBe(true);
      expect(isCampusEmail('a@qq.com')).toBe(false);
      expect(isCampusEmail('@xmu.edu.my')).toBe(false);

      expect(emailErrorKey('a@xmu.edu.my')).toBeNull();
      expect(emailErrorKey('')).toBe('form.error.required');
      expect(emailErrorKey('a@qq.com')).toBe('auth.emailDomain');
      // 文案必须存在且**说清要什么**
      expect(zh['auth.emailDomain']).toContain('@xmu.edu.my');
    });
  });

  describe('TC-P2C2-02-2A · 验证码与密码规则（服务端镜像）', () => {
    it('验证码 6 位；密码 ≥6', () => {
      expect(CODE_LENGTH).toBe(6);
      expect(MIN_PASSWORD_LENGTH).toBe(6);
      expect(codeErrorKey('12345')).toBe('auth.codeLength');
      expect(codeErrorKey('123456')).toBeNull();
      expect(passwordErrorKey('12345')).toBe('auth.passwordShort');
      expect(passwordErrorKey('123456')).toBeNull();
    });

    it('整表校验返回**第一个**错误（页面据此定位字段）', () => {
      const base = { email: 'a@xmu.edu.my', code: '123456', username: 'u', password: '123456' };
      expect(canSubmitRegister(base)).toBeNull();
      expect(canSubmitRegister({ ...base, email: 'a@qq.com' })).toBe('auth.emailDomain');
      expect(canSubmitRegister({ ...base, code: '' })).toBe('form.error.required');
      expect(canSubmitRegister({ ...base, username: '  ' })).toBe('form.error.required');
      expect(canSubmitRegister({ ...base, password: '1' })).toBe('auth.passwordShort');
    });
  });

  describe('TC-P2C2-02-3A · 提交体与开发期验证码', () => {
    it('字段是 `username`（⛔ 不承诺"学号"）；角色是 student', () => {
      const body = registerBody({ email: ' a@xmu.edu.my ', code: ' 123456 ', username: ' u1 ', password: '123456' });
      expect(body).toEqual({
        role: 'student',
        email: 'a@xmu.edu.my',
        username: 'u1',
        password: '123456',
        verification_code: '123456',
      });
      expect(Object.keys(body)).not.toContain('student_id');
    });

    it('开发期验证码：**服务端给没给**是唯一判据（⛔ 不在客户端读环境变量）', () => {
      expect(revealDevCode({ success: true, verificationCode: '654321' })).toBe('654321');
      expect(revealDevCode({ success: true })).toBeNull();
      expect(revealDevCode({ success: true, verificationCode: '   ' })).toBeNull();
      expect(revealDevCode(null)).toBeNull();
    });

    it('共享层**只增字段**：`shared/api/auth.js` 把 verification_code 带回来', () => {
      const code = fs.readFileSync(path.join(REPO_ROOT, 'shared', 'api', 'auth.js'), 'utf8');
      expect(code).toContain('verification_code');
      expect(code).toContain('verificationCode');
    });
  });

  describe('TC-P2C2-02-4A · D25 倒计时状态机与按钮', () => {
    it('状态：loading → busy；倒计时中 → counting；否则 ready', () => {
      expect(resolveCountdownState({ remainingSeconds: 0, loading: false, disabled: false })).toBe('ready');
      expect(resolveCountdownState({ remainingSeconds: 12, loading: false, disabled: false })).toBe('counting');
      expect(resolveCountdownState({ remainingSeconds: 0, loading: true, disabled: false })).toBe('busy');
    });

    it('点一次后进入倒计时：按钮禁用 + 文案换成剩余秒数', async () => {
      const onPress = jest.fn(async () => undefined);
      const view = await renderApp(
        <CountdownButton
          testID="cd"
          label={zh['auth.sendCode']}
          formatCountdown={(n) => zh['auth.resendIn'].replace('{n}', String(n))}
          onPress={onPress}
        />
      );
      expect(view.getByText(zh['auth.sendCode'])).toBeTruthy();

      fireEvent.press(view.getByTestId('cd'));
      await waitFor(() => expect(onPress).toHaveBeenCalledTimes(1));
      // 60s 冷却（与服务端一致）→ 立刻变成"60 秒后重发"且禁用
      await waitFor(() =>
        expect(view.getByText(zh['auth.resendIn'].replace('{n}', String(CODE_COOLDOWN_SECONDS)))).toBeTruthy()
      );
      expect(view.getByTestId('cd').props.accessibilityState.disabled).toBe(true);
    });

    it('冷却秒数与服务端一致（60s）', () => {
      expect(CODE_COOLDOWN_SECONDS).toBe(60);
      // 结构约束：冷却时长只在一处定义（⛔ 不许各页写 60）
      const screen = stripComments(
        fs.readFileSync(path.join(__dirname, '..', 'features', 'auth', 'RegisterScreen.tsx'), 'utf8')
      );
      expect(screen).not.toMatch(/seconds=\{60\}/);
    });
  });

  describe('TC-P2C2-02-5A · 注册成功 → 令牌落地（进已登录态）', () => {
    it('注册走的是与登录**同一条**落地路径（写令牌 + 进 signedIn）', () => {
      const sessionSrc = stripComments(
        fs.readFileSync(path.join(__dirname, '..', 'features', 'auth', 'session.tsx'), 'utf8')
      );
      // 调用的是 `register` 端点，成功后同样 `saveToken` + `login:success`
      expect(sessionSrc).toContain('registerApi');
      expect(sessionSrc).toMatch(/registerApi\(body\)/);
      expect(sessionSrc).toContain('saveToken');
      expect(sessionSrc).toContain("type: 'login:success'");
    });
  });
});
