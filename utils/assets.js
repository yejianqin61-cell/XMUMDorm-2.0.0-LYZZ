function normalizeBaseUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  return s.endsWith('/') ? s : s + '/';
}

/**
 * 将数据库中存的 object key（如 'posts/post_1_1.jpg'）转为可访问 URL。
 * 兼容策略：
 * - 若设置了 PUBLIC_ASSET_BASE_URL：返回 `${PUBLIC_ASSET_BASE_URL}/${key}`
 * - 否则回退到本地静态：`/uploads/${key}`
 * - 若 key 已是 http(s) URL：原样返回
 */
function assetUrl(key) {
  if (!key) return null;
  const s = String(key).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const clean = s.replace(/^\/+/, '');
  const base = normalizeBaseUrl(process.env.PUBLIC_ASSET_BASE_URL);
  if (base) return base + clean;
  return '/uploads/' + clean;
}

module.exports = { assetUrl };

