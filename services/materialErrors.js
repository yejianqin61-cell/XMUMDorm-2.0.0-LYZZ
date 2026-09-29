/**
 * ============================================
 * 学习资料 · 错误类型
 * ============================================
 * 带语义 code 的错误，路由层据此映射 HTTP 状态与前端可读提示。
 * 独立成文件，避免 materialValidation ↔ githubMaterials 互相依赖。
 */

class MaterialError extends Error {
  /**
   * @param {string} code - 稳定错误码（前端可依赖，不要改）
   * @param {string} message - 面向用户的中文提示
   * @param {number} [httpStatus=400]
   * @param {object} [meta] - 附加信息（如已有资料链接）
   */
  constructor(code, message, httpStatus = 400, meta = null) {
    super(message);
    this.name = 'MaterialError';
    this.code = code;
    this.httpStatus = httpStatus;
    if (meta) this.meta = meta;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.meta ? { meta: this.meta } : {}),
    };
  }
}

/** 错误码 → 默认 HTTP 状态（供 route 层兜底） */
const HTTP_BY_CODE = {
  MATERIALS_NOT_CONFIGURED: 503,
  MATERIALS_DISABLED: 503,
  MATERIALS_GITHUB_AUTH_FAILED: 502,
  MATERIALS_GITHUB_FORBIDDEN: 502,
  MATERIALS_GITHUB_NOT_FOUND: 502,
  MATERIALS_GITHUB_CONFLICT: 409,
  MATERIALS_GITHUB_UPSTREAM: 502,
  MATERIALS_GITHUB_TIMEOUT: 504,
  MATERIALS_GITHUB_ERROR: 502,
  MATERIALS_INTERNAL: 500,
};

function httpStatusFor(code, fallback = 400) {
  return HTTP_BY_CODE[code] || fallback;
}

module.exports = { MaterialError, httpStatusFor, HTTP_BY_CODE };
