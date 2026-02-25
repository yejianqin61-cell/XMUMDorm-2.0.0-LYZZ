/** 后端 API 根地址，与 html/config.js 一致 */
const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isLocal ? 'http://127.0.0.1:4040' : '');
