/** 网络层级异常（后端挂了 / 跨域 / 非 JSON 响应）时的兜底文案 */
export const API_ERROR_MESSAGE = '网络错误，请稍后重试';

/** 401 时提示重新登录 */
export const API_ERROR_UNAUTHORIZED = '请重新登录';

/**
 * 获取展示用的 API 错误文案
 * - 401：提示「请重新登录」（发帖/评论等需登录接口失败时更明确）
 * - 其他：优先展示后端返回的 message；仅在拿不到 message 时兜底为「网络错误」
 * @param {Error|{ status?: number }} [err] 请求抛出的错误，可能带 err.status（HTTP 状态码）
 * @returns {string}
 */
export function getApiErrorMessage(err) {
  const status = err?.status;
  if (status === 401) return API_ERROR_UNAUTHORIZED;
  // 若有明确错误信息（例如后端返回的 message），优先展示给用户
  if (err && typeof err.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }
  // 否则认为是网络或未知错误，使用统一兜底文案
  return API_ERROR_MESSAGE;
}
