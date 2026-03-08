/**
 * 认证 API：登录、注册
 * 使用 requestRaw 以获取 token（登录/注册响应在顶层返回 token）
 */
import { requestRaw } from './request';

/**
 * 登录
 * @param {string} studentIdOrEmail - 学号或邮箱
 * @param {string} password
 * @returns {Promise<{ success: boolean, message?: string, token?: string, data?: object }>}
 */
export async function login(studentIdOrEmail, password) {
  const isEmail = typeof studentIdOrEmail === 'string' && studentIdOrEmail.includes('@');
  const body = isEmail
    ? { email: studentIdOrEmail, password }
    : { student_id: studentIdOrEmail, password };
  const data = await requestRaw('/api/auth/login', {
    method: 'POST',
    body,
    skipAuth: true,
  });
  if (data.status === 0 && data.token) {
    return { success: true, token: data.token, data: data.data };
  }
  return { success: false, message: data.message || '登录失败' };
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
  return { success: false, message: data.message || '注册失败' };
}
