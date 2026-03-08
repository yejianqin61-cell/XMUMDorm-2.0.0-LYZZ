/**
 * 后端 API 根地址
 * - 开发环境：优先用空字符串，走同源请求，依赖 Vite 代理把 /api、/uploads 转到后端（手机用电脑 IP 访问时也生效）
 * - 若设置了 VITE_API_BASE_URL 则用该值（如生产或单独指定后端地址）
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : '';

/**
 * 将后端返回的图片/logo 相对路径转为前端可请求的完整 URL
 * - 保证 base 与 path 之间只有一个斜杠，避免 404
 * - 后端返回格式一般为 /uploads/products/xxx 或 /uploads/shops/xxx
 */
export function getUploadUrl(path) {
  if (path == null || path === '') return path;
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) return path;
  const base = API_BASE_URL || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return base.replace(/\/$/, '') + normalizedPath;
}
