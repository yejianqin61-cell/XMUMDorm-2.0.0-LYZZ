/**
 * 统一 HTTP 请求工具（合并 request.js + client.ts）
 *
 * 使用方式：
 *   import { get, post, patch, del, requestRaw } from '../utils/http';
 *
 * 兼容别名（过渡期，逐步迁移到 get/post/patch/del）：
 *   apiGet   → get
 *   apiPost  → post
 *   apiPatch → patch
 *   apiDelete → del
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_TOKEN = 'token';

// ============ API Config ============
let _baseUrl = '';
try {
  _baseUrl = require('../api/config').API_BASE_URL || '';
} catch {
  // fallback: config may not exist in test
}

export function getBaseUrl(): string {
  return _baseUrl;
}

// ============ Token 缓存 ============
let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(STORAGE_TOKEN);
    return cachedToken;
  } catch {
    return null;
  }
}

export function setCachedToken(token: string | null): void {
  cachedToken = token || null;
}

// ============ 核心请求函数 ============
interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  token?: string | null;
  skipAuth?: boolean;
}

export async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    token = await getToken(),
    skipAuth = false,
  } = options;

  const url = path.startsWith('http') ? path : `${_baseUrl}${path}`;
  const headers: Record<string, string> = { ...extraHeaders };

  if (!headers['Content-Type'] && body != null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = { method, headers };
  if (body != null) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  let data: any;
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (isJson) {
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      const isHtml = /^\s*</.test(rawText) || rawText.includes('<!doctype');
      const message = isHtml
        ? `请求异常 ${res.status}：服务器返回了网页而非 JSON。请检查 API 地址是否正确。\nURL: ${url}`
        : (rawText.slice(0, 200) || `请求失败 ${res.status}`);
      const err: any = new Error(message);
      err.status = res.status;
      throw err;
    }
  } else {
    const text = await res.text();
    const isHtml = /^\s*</.test(text) || text.includes('<!doctype') || text.includes('<html');
    const message = isHtml
      ? `请求异常 ${res.status}，请检查网络或后端是否启动`
      : (text || `请求失败 ${res.status}`);
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (data.status !== 0 && data.status !== undefined) {
    const err: any = new Error(data.message || '请求失败');
    err.status = res.status;
    err.apiStatus = data.status;
    throw err;
  }

  const business = data.data !== undefined ? data.data : data;
  if (data.exp != null) {
    if (business != null && typeof business === 'object' && !Array.isArray(business)) {
      return { ...business, __exp: data.exp };
    }
    return { __payload: business, __exp: data.exp };
  }
  return business;
}

// ============ 便捷方法 ============
export function get(path: string, options: RequestOptions = {}): Promise<any> {
  return request(path, { ...options, method: 'GET' });
}

export function post(path: string, body?: any, options: RequestOptions = {}): Promise<any> {
  return request(path, { ...options, method: 'POST', body });
}

export function patch(path: string, body?: any, options: RequestOptions = {}): Promise<any> {
  return request(path, { ...options, method: 'PATCH', body });
}

export function del(path: string, options: RequestOptions = {}): Promise<any> {
  return request(path, { ...options, method: 'DELETE' });
}

// ============ 完整响应（用于登录等需要原始 body 的接口） ============
export async function requestRaw(path: string, options: RequestOptions = {}): Promise<any> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    token = await getToken(),
    skipAuth = false,
  } = options;

  const url = path.startsWith('http') ? path : `${_baseUrl}${path}`;
  const headers: Record<string, string> = { ...extraHeaders };

  if (!headers['Content-Type'] && body != null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth && token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOptions: RequestInit = { method, headers };
  if (body != null) fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);

  const res = await fetch(url, fetchOptions);
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      const body = await res.json();
      if (body && typeof body === 'object') {
        (body as any).__httpStatus = res.status;
      }
      return body;
    } catch {
      const err: any = new Error(`服务器返回异常（${res.status}），请稍后重试`);
      err.status = res.status;
      throw err;
    }
  }
  const text = await res.text();
  const err: any = new Error(text?.trim() || `请求失败 ${res.status}`);
  err.status = res.status;
  throw err;
}

// ============ 兼容别名（过渡期，逐步迁移到 get/post/patch/del） ============
// 这些别名供旧代码过渡使用，新代码请直接使用 get/post/patch/del
export const apiGet = get;
export const apiPost = post;
export const apiPatch = patch;
export const apiDelete = del;
