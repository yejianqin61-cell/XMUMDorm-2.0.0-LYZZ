/**
 * 后端 API 根地址
 * - 开发环境：优先用空字符串，走同源请求，依赖 Vite 代理把 /api、/uploads 转到后端（手机用电脑 IP 访问时也生效）
 * - 若设置了 VITE_API_BASE_URL 则用该值（如生产或单独指定后端地址）
 *
 * ⚠️ **RN/App 侧不要依赖这个常量**：它是 import 时求值的，而 App 的后端地址由
 * 宿主在运行时注入（`configureApi`，见 `./platform`）。App 的请求与图片 URL 都走
 * `platform.getInjectedBaseUrl()` 优先，本常量只是 Web 与"未注入时的回落"。
 * ⚠️ `import.meta.env` 是 **Vite 专有**的；RN/Hermes 下它是 `undefined`
 * → 必须带可选链，否则**模块初始化即抛**（实测 TypeError）。见 P1-01。
 */
import { getInjectedBaseUrl } from './platform';

const configuredApiBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
const nativeApiBaseUrl = 'https://xmumdorm-200-lyzz-production.up.railway.app';
const isNativeApp =
  typeof window !== 'undefined' &&
  window.Capacitor?.getPlatform?.() !== undefined &&
  window.Capacitor.getPlatform() !== 'web';

export const API_BASE_URL = configuredApiBaseUrl || (isNativeApp ? nativeApiBaseUrl : '');

const rawProductDefault = import.meta.env?.VITE_DEFAULT_PRODUCT_IMAGE_PATH;
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
  // 注入的后端地址优先（App）；未注入（Web）时用历史值
  const base = getInjectedBaseUrl() ?? API_BASE_URL ?? '';
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
