/**
 * 后端 API 根地址
 * - 开发环境：优先用空字符串，走同源请求，依赖 Vite 代理把 /api、/uploads 转到后端（手机用电脑 IP 访问时也生效）
 * - 若设置了 VITE_API_BASE_URL 则用该值（如生产或单独指定后端地址）
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : '';

const rawProductDefault = import.meta.env.VITE_DEFAULT_PRODUCT_IMAGE_PATH;
/** 商品默认图路径：frontend/public/products/ 下文件，不拼后端地址；可通过 VITE_DEFAULT_PRODUCT_IMAGE_PATH 覆盖 */
export const DEFAULT_PRODUCT_IMAGE_PATH =
  typeof rawProductDefault === 'string' && rawProductDefault.trim() !== ''
    ? (() => {
        const t = rawProductDefault.trim();
        return t.startsWith('/') ? t : `/${t}`;
      })()
    : '/products/default.png';

/** 商家 logo 默认占位图路径（前端 public 提供，不拼后端地址） */
export const DEFAULT_SHOP_LOGO_PATH = '/shops/default.jpg';

function isProductDefaultStaticPath(normalizedPath) {
  if (normalizedPath === DEFAULT_PRODUCT_IMAGE_PATH) return true;
  // 旧数据/旧接口可能仍返回 .jpg，统一到当前默认图文件
  if (normalizedPath === '/products/default.jpg' || normalizedPath.endsWith('/products/default.jpg')) return true;
  return false;
}

/**
 * 将后端返回的图片/logo 相对路径转为前端可请求的完整 URL
 * - 商品默认图从前端 public 提供，直接返回路径（不拼 API_BASE_URL）
 * - 其余一般为 /uploads/products/xxx 或 /uploads/shops/xxx，需拼后端地址时则拼
 */
export function getUploadUrl(path) {
  if (path == null || path === '') return path;
  if (typeof path !== 'string') return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (isProductDefaultStaticPath(normalizedPath)) {
    if (normalizedPath === '/products/default.jpg' || normalizedPath.endsWith('/products/default.jpg')) {
      return DEFAULT_PRODUCT_IMAGE_PATH;
    }
    return normalizedPath;
  }
  const base = API_BASE_URL || '';
  if (!base) return normalizedPath;
  return base.replace(/\/$/, '') + normalizedPath;
}

/** 商品列表/详情主图：未上传或空路径时用默认图 */
export function productImageUrl(path) {
  if (path == null || path === '') return DEFAULT_PRODUCT_IMAGE_PATH;
  const resolved = getUploadUrl(path);
  if (resolved == null || resolved === '') return DEFAULT_PRODUCT_IMAGE_PATH;
  return resolved;
}
