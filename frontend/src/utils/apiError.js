/** 所有接口失败时统一向用户展示的文案，避免 undefined 或后端原始错误 */
export const API_ERROR_MESSAGE = '网络错误，请稍后重试';

/** 401 时提示重新登录 */
export const API_ERROR_UNAUTHORIZED = '请重新登录';

/**
 * 获取展示用的 API 错误文案
 * - 401：提示「请重新登录」（发帖/评论等需登录接口失败时更明确）
 * - 其他：统一「网络错误，请稍后重试」
 * @param {Error|{ status?: number }} [err] 请求抛出的错误，可能带 err.status（HTTP 状态码）
 * @returns {string}
 */
export function getApiErrorMessage(err) {
  const status = err?.status;
  if (status === 401) return API_ERROR_UNAUTHORIZED;
  return API_ERROR_MESSAGE;
}
