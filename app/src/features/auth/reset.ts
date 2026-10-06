/**
 * 找回密码的**纯规则**（P2C2-03 / `A-04`）
 *
 * 服务端事实（`routes/auth.js:128-240`）：
 *   · `send-reset-code` **要求邮箱已注册**（与注册的发码不同 —— 那条不检查）；
 *   · 冷却 60s、10 次/日、10 分钟有效，验证码哈希入库；
 *   · `reset-password` 取**最新一条**未用且未过期的码，校验后置 `used_at`；
 *   · 新密码 **≥6**（与注册同一条规则）。
 *
 * ## 一页三步（不跳页）
 * `request`（填邮箱 + 发码）→ `confirm`（验证码 + 新密码）→ `done`。
 * 状态用**纯函数**表达，⛔ 不用"页面里一堆 boolean 拼步骤"（那样"没发码就能提交"这类洞看不出来）。
 */

import type { MessageKey } from '@/i18n';
import { MIN_PASSWORD_LENGTH, emailErrorKey, codeErrorKey } from './register';

export type ResetStep = 'request' | 'confirm';

export type ResetValues = {
  email: string;
  code: string;
  newPassword: string;
};

/**
 * 现在在哪一步（纯函数）。
 * ⛔ **没发过码就不许进 confirm** —— "未发码就提交"是这一页最容易出的洞。
 */
export function resetStepFor(codeSent: boolean): ResetStep {
  return codeSent ? 'confirm' : 'request';
}

/** 新密码错误 → 词条 key（`null` = 通过）；与服务端同一条规则（≥6） */
export function newPasswordErrorKey(password: string): MessageKey | null {
  const value = String(password ?? '');
  if (value === '') return 'form.error.required';
  return value.length >= MIN_PASSWORD_LENGTH ? null : 'auth.passwordShort';
}

/**
 * 能不能提交重置：返回**第一个**错误 key（`null` = 可以）。
 * ⛔ 未发码直接返回 `null` 之外的错误 —— 页面据此**不发请求**（省一次必然失败的往返）。
 */
export function canSubmitReset(values: ResetValues, codeSent: boolean): MessageKey | null {
  if (!codeSent) return 'auth.codeNotSent';
  return (
    emailErrorKey(values.email) ??
    codeErrorKey(values.code) ??
    newPasswordErrorKey(values.newPassword)
  );
}

/** 提交体（字段名与服务端一致：`new_password` / `verification_code`） */
export type ResetBody = {
  email: string;
  verification_code: string;
  new_password: string;
};

export function resetBody(values: ResetValues): ResetBody {
  return {
    email: String(values.email ?? '').trim(),
    verification_code: String(values.code ?? '').trim(),
    new_password: String(values.newPassword ?? ''),
  };
}
