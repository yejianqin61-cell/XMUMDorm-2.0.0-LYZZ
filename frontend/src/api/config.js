/**
 * 后端 API 根地址
 * - 开发环境：优先用空字符串，走同源请求，依赖 Vite 代理把 /api、/uploads 转到后端（手机用电脑 IP 访问时也生效）
 * - 若设置了 VITE_API_BASE_URL 则用该值（如生产或单独指定后端地址）
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : '';

/** 商品默认图路径，由前端 public 提供，不拼后端地址 */
export const DEFAULT_PRODUCT_IMAGE_PATH = '/products/default.jpg';

/**
 * 将后端返回的图片/logo 相对路径转为前端可请求的完整 URL
 * - 商品默认图 /products/default.jpg 从前端 public 提供，直接返回路径（不拼 API_BASE_URL）
 * - 其余一般为 /uploads/products/xxx 或 /uploads/shops/xxx，需拼后端地址时则拼
 */
export function getUploadUrl(path) {
  if (path == null || path === '') return path;
  if (typeof path !== 'string') return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === DEFAULT_PRODUCT_IMAGE_PATH || normalizedPath.endsWith('/products/default.jpg')) {
    return normalizedPath;
  }
  const base = API_BASE_URL || '';
  if (!base) return normalizedPath;
  return base.replace(/\/$/, '') + normalizedPath;
}
