/**
 * 统一 API 请求工具
 * - 封装 fetch，自动附带 Authorization token
 * - 统一 JSON 请求/响应
 * - 统一错误处理（后端 status !== 0 时抛出）
 * Token 从 localStorage 读取（与 AuthContext 使用同一 key）
 */
import { API_BASE_URL } from './config';
import { getInjectedBaseUrl, readInjectedToken } from './platform';

const STORAGE_TOKEN = 'token';

/** 请求实际使用的后端根地址：**注入优先**（App 运行时注入），否则历史值（Web） */
function resolveBaseUrl() {
  return getInjectedBaseUrl() ?? API_BASE_URL;
}

/**
 * 读 token。
 * - **宿主注入优先**（App：`expo-secure-store` 的内存镜像）→ 注入了就以它为准，
 *   返回 `null` 也照样是 `null`，⛔ 不再回落 localStorage（RN 下它不存在）
 * - 未注入 → 历史行为：Web 的 localStorage（与 AuthContext 同一 key）
 */
export function getToken() {
  const injected = readInjectedToken();
  if (injected !== undefined) return injected;
  // ⚠️ 只判 `typeof window` **不够**：RN 里 `window` 存在但**没有 localStorage**
  //    （实测 jest-expo 环境即如此，裸访问会 ReferenceError）→ 必须同时判 localStorage 本身。
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_TOKEN);
  } catch {
    return null;
  }
}

/**
 * 统一请求
 * @param {string} path - 相对路径，如 '/api/posts'，会拼上 API_BASE_URL
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object|FormData} [options.body] - 对象会 JSON 序列化并设 Content-Type；FormData 不设 Content-Type
 * @param {Object} [options.headers] - 额外请求头
 * @param {string|null} [options.token] - 覆盖默认 token，传 null 表示不带 Authorization
 * @param {boolean} [options.skipAuth] - 为 true 时不带 Authorization（如登录/注册）
 * @returns {Promise<any>} 后端 data 字段（即业务数据）；若后端无 data 则返回解析后的整 body
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    token = getToken(),
    skipAuth = false,
  } = options;

  const url = path.startsWith('http') ? path : `${resolveBaseUrl()}${path}`;
  const headers = { ...extraHeaders };

  if (!headers['Content-Type'] && body != null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
  };
  if (body != null) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    const isHtml = /^\s*</.test(text) || text.includes('<!doctype') || text.includes('<html');
    const message = isHtml
      ? `请求异常 ${res.status}，请检查网络或后端是否启动（若用手机访问请确保与电脑同一局域网且已配置代理）`
      : (text || `请求失败 ${res.status}`);
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (data.status !== 0 && data.status !== undefined) {
    const err = new Error(data.error || data.message || '请求失败');
    err.status = res.status;
    err.apiStatus = data.status;
    /**
     * **把响应体一并带上**（仅新增字段，Web 侧不受影响）。
     *
     * 为什么必须带：后端用**两个**状态码表示鉴权失败 ——
     *   · 没带令牌 → `401`（`middleware/auth.js`）
     *   · 令牌无效/过期 → **`403`**（同上）
     * 而 `403` 同时被 `checkSanction` 用来表示**被封禁 / 被禁言**，两者只靠
     * **响应体里的 `banned` / `muted` 标记**区分。若把响应体丢掉，App 就无法分辨
     * "会话过期该重新登录"与"账号被处罚"—— 前者要清令牌，后者**绝不能**清。
     */
    err.body = data;
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

/**
 * 返回完整响应体（不提取 data，不因 status 抛错），用于登录/注册等需要 token 的接口
 * @returns {Promise<{ status, message?, token?, data? }>}
 */
export async function requestRaw(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders = {}, token = getToken(), skipAuth = false } = options;
  const url = path.startsWith('http') ? path : `${resolveBaseUrl()}${path}`;
  const headers = { ...extraHeaders };
  if (!headers['Content-Type'] && body != null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth && token) headers['Authorization'] = `Bearer ${token}`;
  const fetchOptions = { method, headers };
  if (body != null) fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  const res = await fetch(url, fetchOptions);
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      const body = await res.json();
      if (body && typeof body === 'object') {
        body.__httpStatus = res.status;
      }
      return body;
    } catch {
      const err = new Error(`服务器返回异常（${res.status}），请稍后重试`);
      err.status = res.status;
      throw err;
    }
  }
  const text = await res.text();
  const err = new Error(text?.trim() || `请求失败 ${res.status}`);
  err.status = res.status;
  throw err;
}

/** GET 请求 */
export function get(path, options = {}) {
  return request(path, { ...options, method: 'GET' });
}

/** POST 请求 */
export function post(path, body, options = {}) {
  return request(path, { ...options, method: 'POST', body });
}

/** PATCH 请求 */
export function patch(path, body, options = {}) {
  return request(path, { ...options, method: 'PATCH', body });
}

/** DELETE 请求 */
export function del(path, options = {}) {
  return request(path, { ...options, method: 'DELETE' });
}
