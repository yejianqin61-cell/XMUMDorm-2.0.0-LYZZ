/**
 * 后端 API 根地址
 * - 开发环境：用电脑局域网 IP（手机通过 Wi-Fi 访问）
 * - 生产环境：改为线上域名
 *
 * 修改此地址为你的电脑 IP（在终端执行 ipconfig 查看）
 */
export const API_BASE_URL = 'http://10.72.10.97:4040';

// 如果你是生产环境，取消下行注释并注释上行
// export const API_BASE_URL = 'https://api.dorm.app';

/**
 * 将后端返回的图片/logo 相对路径转为完整 URL
 * - http/https 开头的直接返回
 * - 相对路径拼上 API_BASE_URL
 */
export function getUploadUrl(path) {
  if (path == null || path === '') return path;
  if (typeof path !== 'string') return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL || '';
  if (!base) return normalizedPath;
  return base.replace(/\/$/, '') + normalizedPath;
}

/** 商品默认图 */
export const DEFAULT_PRODUCT_IMAGE_PATH = API_BASE_URL + '/products/default.png';

/** 商家 logo 默认占位图 */
export const DEFAULT_SHOP_LOGO_PATH = API_BASE_URL + '/shops/default.jpg';

/** 商品列表/详情主图：未上传或空路径时用默认图 */
export function productImageUrl(path) {
  if (path == null || path === '') return DEFAULT_PRODUCT_IMAGE_PATH;
  const resolved = getUploadUrl(path);
  if (resolved == null || resolved === '') return DEFAULT_PRODUCT_IMAGE_PATH;
  return resolved;
}
