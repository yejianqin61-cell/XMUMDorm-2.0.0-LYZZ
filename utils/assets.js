function normalizeBaseUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  return s.endsWith('/') ? s : s + '/';
}

/**
 * 将数据库中存的 object key（如 'posts/post_1_1.jpg'）转为可访问 URL。
 * 兼容策略：
 * - 若设置了 PUBLIC_ASSET_BASE_URL：返回 `${PUBLIC_ASSET_BASE_URL}/${key}`（图片在对象存储，必须配置此项才能正常显示）
 * - 否则回退到本地静态：`/uploads/${key}`（仅当图片写在本地 uploads 目录时有效；当前商品/帖子图已上传到对象存储，未配置时本地会 404）
 * - 若 key 已是 http(s) URL：原样返回
 * @param {string} key - 文件 key 或路径
 * @param {Date|number|string} [version] - 可选。传入后会在 URL 后追加 ?t=<时间戳>，用于破坏缓存，修改图片后浏览器会重新请求
 */
function assetUrl(key, version) {
  if (!key) return null;
  const s = String(key).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const clean = s.replace(/^\/+/, '');
  const base = normalizeBaseUrl(process.env.PUBLIC_ASSET_BASE_URL);
  let url = base ? base + clean : '/uploads/' + clean;
  if (version != null && version !== '') {
    const t = typeof version === 'number' ? version : (version instanceof Date ? version.getTime() : new Date(version).getTime());
    if (Number.isFinite(t)) url += (url.includes('?') ? '&' : '?') + 't=' + t;
  }
  return url;
}

module.exports = { assetUrl };

