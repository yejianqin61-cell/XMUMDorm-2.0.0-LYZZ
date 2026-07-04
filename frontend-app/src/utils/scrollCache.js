const KEY_PREFIX = 'scroll_cache_';

/**
 * 按页面 key 保存滚动位置（及可选页码）
 * @param {string} key 如 'treehole' 或 '/'
 * @param {number} scrollTop
 * @param {number} [page] 当前页码，恢复时用于先加载到该页再滚到 scrollTop
 */
export function saveScroll(key, scrollTop, page = 1) {
  try {
    const k = KEY_PREFIX + key;
    sessionStorage.setItem(k, JSON.stringify({ scrollTop, page }));
  } catch (_) {}
}

/**
 * 读取并清除该 key 的缓存（用一次即删，避免下次进列表还恢复）
 * @param {string} key
 * @returns {{ scrollTop: number, page: number } | null}
 */
export function takeScroll(key) {
  try {
    const k = KEY_PREFIX + key;
    const raw = sessionStorage.getItem(k);
    if (raw == null) return null;
    sessionStorage.removeItem(k);
    const data = JSON.parse(raw);
    return {
      scrollTop: Number(data.scrollTop) || 0,
      page: Math.max(1, Number(data.page) || 1),
    };
  } catch (_) {
    return null;
  }
}
