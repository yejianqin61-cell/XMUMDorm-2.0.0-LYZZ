/**
 * 懒加载 chunk 失效的恢复策略 —— 纯逻辑（可单测）
 *
 * 背景（部署后「点开渲染失败、刷新一下就好」）：
 *   站点发新版本后，已经打开的标签页内存里仍然是**旧的 index.html**（SPA，不会重新请求文档）。
 *   用户点开任意懒加载路由时，浏览器按旧 index.html 的记录去请求 `FoodDetail-<旧hash>.js`，
 *   而新部署已经把该文件删掉（且 SPA 重写会把这类请求当成前端路由，返回 200 text/html）。
 *   于是动态 import 失败 → React.lazy 在渲染期抛错 → 仓库里没有任何 ErrorBoundary
 *   → 整棵 React 树被卸载 → **全站白屏**（地址栏已经变了，页面却是空白）。
 *   刷新一次会重新取 index.html（max-age=0, must-revalidate），chunk 名对上，于是恢复正常。
 *
 * 本模块只负责两件可测的事：判断「这是不是 chunk 失效」、以及「这次该不该自动重载」。
 * 真正的 DOM 动作（location.reload / 事件监听 / 兜底 UI）在 main.jsx 与 RouteErrorBoundary 中。
 */

/** sessionStorage 前缀：按 chunk 文件名为粒度记录「已经自动重载过一次」 */
export const CHUNK_RELOAD_FLAG_PREFIX = 'dorm:chunk-reload:';

/**
 * 各浏览器 / 打包器在不同环节报出的「模块脚本没拿到 JS」文案。
 * 全部小写比较，避免大小写差异导致漏判。
 */
const CHUNK_ERROR_PATTERNS = [
  // Chromium / Firefox / Safari 对动态 import 失败
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  // 拿到 text/html（SPA 重写把缺失的 chunk 当成了前端路由）时的 MIME 报错
  'failed to load module script',
  'expected a javascript-or-wasm module script',
  'expected a javascript module script',
  // webpack/turbopack 风格的命名
  'chunkloaderror',
  'loading chunk',
];

/** 把 error 及其 errors 链（AggregateError / 嵌套 cause）摊平成一段可搜索的文本 */
function flattenErrorText(error) {
  const parts = [];
  const seen = new Set();

  const walk = (item, depth) => {
    if (!item || depth > 3 || seen.has(item)) return;
    if (typeof item === 'object') seen.add(item);
    if (typeof item === 'string') {
      parts.push(item);
      return;
    }
    if (typeof item !== 'object') return;
    if (item.name) parts.push(String(item.name));
    if (item.message) parts.push(String(item.message));
    if (Array.isArray(item.errors)) item.errors.forEach((child) => walk(child, depth + 1));
    if (item.cause) walk(item.cause, depth + 1);
  };

  walk(error, 0);
  return parts.join(' ').toLowerCase();
}

/**
 * 是否属于「chunk 文件加载失败」。
 * 注意：这类错误必须与普通业务报错区分开——普通报错显示兜底 UI，chunk 失效直接自愈。
 */
export function isChunkLoadError(error) {
  const text = flattenErrorText(error);
  if (!text) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

/**
 * 从错误信息里抽出失败的 chunk 文件名，作为「自动重载闸门」的 key。
 *
 * 用文件名而不是固定 key 的原因：
 *   - 同一个文件名在同一会话里再失败 = 真的坏了，不能无限重载（返回 null → 退化成 'app'）；
 *   - 下一次部署会生成**新的文件名**，于是又能自愈一次，不会因为「本会话已经重载过」而永久失效。
 */
export function extractChunkKey(error) {
  const raw = typeof error === 'string' ? error : (error && (error.message || error.name)) || '';
  const text = String(raw);
  const match = text.match(/https?:\/\/[^\s'"]+?\.(?:js|mjs|cjs|css)|(?:\/[\w.\-/@]+)\.(?:js|mjs|cjs|css)/i);
  if (!match) return 'app';
  const value = match[0];
  const withoutQuery = value.split('?')[0].split('#')[0];
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1] || 'app';
}

/**
 * 该 chunk 是否还允许自动重载（每个会话、每个文件名只做一次）。
 * sessionStorage 不可用（隐私模式 / 禁用）时不阻断恢复：宁可多刷一次，也不要白屏。
 */
export function shouldReloadForChunkError(key, storage) {
  if (!storage || key === null || key === undefined) return true;
  try {
    return storage.getItem(CHUNK_RELOAD_FLAG_PREFIX + key) !== '1';
  } catch (_) {
    return true;
  }
}

function markReloaded(key, storage) {
  if (!storage) return;
  try {
    storage.setItem(CHUNK_RELOAD_FLAG_PREFIX + key, '1');
  } catch (_) {
    // 存不进去也不影响本次重载
  }
}

/**
 * chunk 失效时的统一入口。
 *
 * @param {unknown} error 捕获到的错误（window 'vite:preloadError' 的 payload 或 ErrorBoundary 的 error）
 * @param {{ storage?: Storage|null, reload?: Function, force?: boolean }} [options]
 *        - storage：一般传 window.sessionStorage
 *        - reload：一般传 () => window.location.reload()
 *        - force：ErrorBoundary 里用户手动点「重新加载」时置 true，跳过闸门
 * @returns {'not-chunk-error'|'reloaded'|'already-reloaded'|'no-reload-handler'}
 */
export function recoverFromChunkLoadError(error, options = {}) {
  const { storage = null, reload = null, force = false } = options;

  if (!force && !isChunkLoadError(error)) return 'not-chunk-error';
  if (typeof reload !== 'function') return 'no-reload-handler';

  const key = extractChunkKey(error);
  if (!force && !shouldReloadForChunkError(key, storage)) return 'already-reloaded';

  markReloaded(key, storage);
  reload();
  return 'reloaded';
}
