/**
 * 注册的**纯规则**（P2C2-02 / `A-03`）
 *
 * 三条来自服务端的事实（`routes/auth.js`）：
 *   · 邮箱**硬门槛** `@xmu.edu.my`（`auth.js:61` 前后端同判）→ 前端给**可读原因**，⛔ 不是"格式错误"；
 *   · 验证码 **6 位**、**10 分钟**有效、**60s** 冷却、**10 次/日**（`auth.js:98,103,68-95`）；
 *   · 密码 **≥6**（`auth.js:331`），且 `register` **从不写 `student_id`** → 注册表单里的字段是
 *     **`username`**（登录标识），⛔ 不承诺"学号"。
 *
 * ⛔ 本文件不 import 任何 UI 组件。
 */

import type { MessageKey } from '@/i18n';

export const CAMPUS_EMAIL_SUFFIX = '@xmu.edu.my';
export const CODE_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 6;

/** 注册表单的值（页面持有；提交时映射成后端字段） */
export type RegisterValues = {
  email: string;
  code: string;
  username: string;
  password: string;
};

/** 校内邮箱判定（与服务端同一条规则：**后缀**匹配，大小写不敏感） */
export function isCampusEmail(email: string): boolean {
  const value = String(email ?? '').trim().toLowerCase();
  return value.endsWith(CAMPUS_EMAIL_SUFFIX) && value.length > CAMPUS_EMAIL_SUFFIX.length;
}

/** 邮箱错误 → 词条 key（`null` = 通过）。文案必须说清"要什么"，⛔ 不只说"格式不对"。 */
export function emailErrorKey(email: string): MessageKey | null {
  const value = String(email ?? '').trim();
  if (value === '') return 'form.error.required';
  if (!value.includes('@')) return 'auth.emailDomain';
  return isCampusEmail(value) ? null : 'auth.emailDomain';
}

/** 验证码错误 → 词条 key（`null` = 通过） */
export function codeErrorKey(code: string): MessageKey | null {
  const value = String(code ?? '').trim();
  if (value === '') return 'form.error.required';
  return value.length === CODE_LENGTH ? null : 'auth.codeLength';
}

/** 密码错误 → 词条 key（`null` = 通过） */
export function passwordErrorKey(password: string): MessageKey | null {
  const value = String(password ?? '');
  if (value === '') return 'form.error.required';
  return value.length >= MIN_PASSWORD_LENGTH ? null : 'auth.passwordShort';
}

/** 整个表单能不能提交（返回**第一个**错误 key，页面据此定位字段） */
export function canSubmitRegister(values: RegisterValues): MessageKey | null {
  return (
    emailErrorKey(values.email) ??
    codeErrorKey(values.code) ??
    (String(values.username ?? '').trim() === '' ? 'form.error.required' : null) ??
    passwordErrorKey(values.password)
  );
}

/** 提交体（⛔ 不猜"学号"：字段就是 `username`） */
export type RegisterBody = {
  role: string;
  email: string;
  username: string;
  password: string;
  verification_code: string;
};

export function registerBody(values: RegisterValues): RegisterBody {
  return {
    role: 'student',
    email: String(values.email ?? '').trim(),
    username: String(values.username ?? '').trim(),
    password: String(values.password ?? ''),
    verification_code: String(values.code ?? '').trim(),
  };
}

/**
 * **开发期验证码**：后端只在 `NODE_ENV=development` 时把它放在响应体顶层
 * （`routes/auth.js:110-114`）。所以判据就是"有没有带回来"——
 * ⛔ 不在客户端读环境变量（那是猜服务端的行为），生产下它自然为 `null`。
 */
export function revealDevCode(result: unknown): string | null {
  const raw = result as { verificationCode?: unknown } | null;
  const code = raw?.verificationCode;
  return typeof code === 'string' && code.trim().length > 0 ? code : null;
}
