/**
 * 认证 API：登录、注册
 * 使用 requestRaw 以获取 token（登录/注册响应在顶层返回 token）
 */
import { requestRaw } from './request';
import { getApiErrorMessage } from '../utils/apiError';

/** 从 requestRaw 的 JSON 中取用户可读错误（优先后端 message，否则按 HTTP 状态兜底） */
function messageFromRaw(data) {
  const msg = data && typeof data.message === 'string' ? data.message.trim() : '';
  if (msg) return msg;
  const st = data && typeof data.__httpStatus === 'number' ? data.__httpStatus : undefined;
  return getApiErrorMessage({ status: st });
}

/**
 * 登录
 * @param {string} studentIdOrEmail - 邮箱或商家用户名（与登录页一致）
 * @param {string} password
 * @returns {Promise<{ success: boolean, message?: string, token?: string, data?: object }>}
 */
export async function login(studentIdOrEmail, password) {
  const s = typeof studentIdOrEmail === 'string' ? studentIdOrEmail.trim() : '';
  const isEmail = s.includes('@');
  const body = isEmail ? { email: s, password } : { username: s, password };
  const data = await requestRaw('/api/auth/login', {
    method: 'POST',
    body,
    skipAuth: true,
  });
  if (data.status === 0 && data.token) {
    return { success: true, token: data.token, data: data.data };
  }
  return { success: false, message: messageFromRaw(data) };
}

/**
 * 注册
 * @param {Object} body - { email?, student_id?, username, password, role: 'student'|'merchant', invite_code? }
 * @returns {Promise<{ success: boolean, message?: string, token?: string, data?: object }>}
 */
export async function register(body) {
  const data = await requestRaw('/api/auth/register', {
    method: 'POST',
    body,
    skipAuth: true,
  });
  if (data.status === 0 && data.token) {
    return { success: true, token: data.token, data: data.data };
  }
  return { success: false, message: messageFromRaw(data) };
}

/**
 * 发送邮箱验证码（学生注册用）
 * @param {string} email
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function sendVerificationCode(email) {
  const data = await requestRaw('/api/auth/send-verification-code', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
  if (data.status === 0) {
    return { success: true, message: data.message || '验证码已发送' };
  }
  return { success: false, message: messageFromRaw(data) };
}

/**
 * 发送重置密码验证码
 * @param {string} email
 */
export async function sendResetCode(email) {
  const data = await requestRaw('/api/auth/send-reset-code', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
  if (data.status === 0) {
    return { success: true, message: data.message || '重置验证码已发送' };
  }
  return { success: false, message: messageFromRaw(data) };
}

/**
 * 重置密码
 * @param {{ email: string, verification_code: string, new_password: string }} body
 */
export async function resetPassword(body) {
  const data = await requestRaw('/api/auth/reset-password', {
    method: 'POST',
    body,
    skipAuth: true,
  });
  if (data.status === 0) {
    return { success: true, message: data.message || '密码重置成功' };
  }
  return { success: false, message: messageFromRaw(data) };
}
