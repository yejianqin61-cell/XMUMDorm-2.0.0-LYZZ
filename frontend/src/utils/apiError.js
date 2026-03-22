/** 无法连接服务器、DNS、断网等（且拿不到任何业务 message）时的兜底 */
export const API_ERROR_MESSAGE = '无法连接服务器，请检查网络或稍后再试 / Check network and try again';

/** 已登录态下接口返回 401（token 缺失/失效）时的提示 */
export const API_ERROR_UNAUTHORIZED = '登录已失效，请重新登录 / Session expired, please log in again';

/** 常见 HTTP 状态在无 body.message 时的双语简短说明 */
const HTTP_STATUS_HINTS = {
  400: '请求无效 / Bad request',
  403: '没有权限 / Forbidden',
  404: '资源不存在 / Not found',
  408: '请求超时 / Request timeout',
  409: '数据冲突 / Conflict',
  413: '上传内容过大 / Payload too large',
  429: '请求过于频繁，请稍后再试 / Too many requests',
  502: '网关错误，服务暂时不可用 / Bad gateway',
  503: '服务暂时不可用 / Service unavailable',
  504: '网关超时 / Gateway timeout',
};

/**
 * 获取展示用的 API 错误文案
 * - 始终优先使用后端或上游给出的 `message`（含登录失败 401 的业务说明）
 * - 无 message 时：401 → 登录失效；其它 HTTP 状态 → 对应提示；否则网络兜底
 *
 * @param {Error | { message?: string, status?: number }} [err]
 * @returns {string}
 */
export function getApiErrorMessage(err) {
  if (err && typeof err.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }
  const status = err?.status;
  if (status === 401) {
    return API_ERROR_UNAUTHORIZED;
  }
  if (status != null && HTTP_STATUS_HINTS[status]) {
    return HTTP_STATUS_HINTS[status];
  }
  return API_ERROR_MESSAGE;
}

/**
 * 从 fetch 的 Response + 已解析的 JSON body 组装给 getApiErrorMessage 用的对象
 * @param {Response} res
 * @param {{ message?: string, status?: number }} [data]
 */
export function apiFailureFromResponse(res, data) {
  const msg = data && typeof data.message === 'string' ? data.message.trim() : '';
  return {
    message: msg || undefined,
    status: res && typeof res.status === 'number' ? res.status : undefined,
    apiStatus: data && typeof data.status === 'number' ? data.status : undefined,
  };
}
