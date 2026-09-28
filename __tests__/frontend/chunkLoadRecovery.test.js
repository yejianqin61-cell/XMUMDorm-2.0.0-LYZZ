/**
 * 部署后旧标签页懒加载 chunk 失效 → 白屏的恢复策略测试
 *
 * 根 jest 配置是 testEnvironment: node，frontend/ 自带 package.json（"type": "module"），
 * 根 .babelrc 不覆盖 frontend/src/**，因此组件只能读源码做结构断言；
 * 判定/闸门这类纯逻辑放在 shared/utils/chunkLoadRecovery.js 里做真实单测。
 */
const fs = require('fs');
const path = require('path');
const {
  CHUNK_RELOAD_FLAG_PREFIX,
  isChunkLoadError,
  extractChunkKey,
  shouldReloadForChunkError,
  recoverFromChunkLoadError,
} = require('../../shared/utils/chunkLoadRecovery');

const read = (...segments) => fs.readFileSync(path.resolve(__dirname, '..', '..', ...segments), 'utf8');

/** 真实抓到的两条报错文案（1440×900 / vite preview 复现） */
const MIME_ERROR = new Error(
  'Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html". Strict MIME type checking is enforced for module scripts per HTML spec.'
);
const FETCH_ERROR = new Error(
  'Failed to fetch dynamically imported module: http://127.0.0.1:4173/assets/FoodDetail-0qV9N_xu.js'
);

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

describe('isChunkLoadError：只认「模块脚本没拿到 JS」这一类错误', () => {
  it('认得 SPA 重写返回 text/html 时的 MIME 报错', () => {
    expect(isChunkLoadError(MIME_ERROR)).toBe(true);
  });

  it('认得动态 import 失败', () => {
    expect(isChunkLoadError(FETCH_ERROR)).toBe(true);
  });

  it('认得 Firefox / Safari / webpack 的同类文案', () => {
    expect(isChunkLoadError(new Error('error loading dynamically imported module: /assets/x.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 12 failed.' })).toBe(true);
  });

  it('认得被包一层的 AggregateError / cause', () => {
    const aggregate = new Error('Uncaught');
    aggregate.errors = [FETCH_ERROR];
    expect(isChunkLoadError(aggregate)).toBe(true);

    expect(isChunkLoadError({ message: 'boom', cause: FETCH_ERROR })).toBe(true);
  });

  it('不把普通业务报错误判成 chunk 失效（否则会白白刷新页面）', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined (reading "status")'))).toBe(false);
    expect(isChunkLoadError(new TypeError("Cannot read properties of null (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(new Error('Request failed with status code 500'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({})).toBe(false);
  });
});

describe('extractChunkKey：按文件名做闸门 key', () => {
  it('从报错里抽出 chunk 文件名', () => {
    expect(extractChunkKey(FETCH_ERROR)).toBe('FoodDetail-0qV9N_xu.js');
    expect(extractChunkKey(new Error('... @ http://127.0.0.1:4173/assets/FoodDetailView-CVt234iS.js:0'))).toBe(
      'FoodDetailView-CVt234iS.js'
    );
  });

  it('去掉 query / hash', () => {
    expect(extractChunkKey(new Error('failed to fetch dynamically imported module: /assets/a-b.js?v=2#x'))).toBe('a-b.js');
  });

  it('抽不出文件名时退化成 app', () => {
    expect(extractChunkKey(new Error('Importing a module script failed.'))).toBe('app');
  });

  it('不同部署的 chunk 名不同 → 闸门 key 不同（新版本仍能再自愈一次）', () => {
    const a = extractChunkKey(new Error('... /assets/FoodDetail-0qV9N_xu.js'));
    const b = extractChunkKey(new Error('... /assets/FoodDetail-Bm98Qu4G.js'));
    expect(a).not.toBe(b);
  });
});

describe('recoverFromChunkLoadError：同一文件每会话只自动重载一次', () => {
  it('chunk 失效 → 重载并写下闸门标记', () => {
    const storage = fakeStorage();
    let reloads = 0;
    const result = recoverFromChunkLoadError(FETCH_ERROR, { storage, reload: () => { reloads += 1; } });

    expect(result).toBe('reloaded');
    expect(reloads).toBe(1);
    expect(storage._dump()[`${CHUNK_RELOAD_FLAG_PREFIX}FoodDetail-0qV9N_xu.js`]).toBe('1');
  });

  it('同一个文件第二次失败 → 不再重载（防死循环）', () => {
    const storage = fakeStorage();
    let reloads = 0;
    const reload = () => { reloads += 1; };

    expect(recoverFromChunkLoadError(FETCH_ERROR, { storage, reload })).toBe('reloaded');
    expect(recoverFromChunkLoadError(FETCH_ERROR, { storage, reload })).toBe('already-reloaded');
    expect(reloads).toBe(1);
  });

  it('换了一个新文件名（下一次部署）→ 允许再自愈', () => {
    const storage = fakeStorage();
    let reloads = 0;
    const reload = () => { reloads += 1; };

    recoverFromChunkLoadError(FETCH_ERROR, { storage, reload });
    const next = new Error('Failed to fetch dynamically imported module: /assets/FoodDetail-Bm98Qu4G.js');
    expect(recoverFromChunkLoadError(next, { storage, reload })).toBe('reloaded');
    expect(reloads).toBe(2);
  });

  it('普通业务报错 → 不重载，交给兜底 UI', () => {
    const storage = fakeStorage();
    let reloads = 0;
    const result = recoverFromChunkLoadError(new Error('Cannot read properties of undefined'), {
      storage,
      reload: () => { reloads += 1; },
    });

    expect(result).toBe('not-chunk-error');
    expect(reloads).toBe(0);
    expect(storage._dump()).toEqual({});
  });

  it('用户手动点「重新加载」→ force 跳过闸门', () => {
    const storage = fakeStorage({ [`${CHUNK_RELOAD_FLAG_PREFIX}app`]: '1' });
    let reloads = 0;
    const result = recoverFromChunkLoadError(new Error('Cannot read properties of undefined'), {
      storage,
      reload: () => { reloads += 1; },
      force: true,
    });

    expect(result).toBe('reloaded');
    expect(reloads).toBe(1);
  });

  it('没有 reload 回调时不假装成功', () => {
    expect(recoverFromChunkLoadError(FETCH_ERROR, { storage: fakeStorage() })).toBe('no-reload-handler');
  });

  it('sessionStorage 不可用（隐私模式）不阻断恢复：宁可多刷一次也不要白屏', () => {
    const hostile = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    let reloads = 0;

    expect(shouldReloadForChunkError('a.js', hostile)).toBe(true);
    expect(recoverFromChunkLoadError(FETCH_ERROR, { storage: hostile, reload: () => { reloads += 1; } })).toBe(
      'reloaded'
    );
    expect(reloads).toBe(1);
  });
});

describe('接线：兜底必须真的挂上去（否则逻辑再对也还是白屏）', () => {
  it('main.jsx 监听 vite:preloadError 并先于 React 接管', () => {
    const main = read('frontend', 'src', 'main.jsx');
    expect(main).toContain("window.addEventListener('vite:preloadError'");
    expect(main).toContain('recoverFromChunkLoadError(event.payload');
    expect(main).toContain("if (result === 'reloaded') event.preventDefault();");
    // 必须在 createRoot(...).render(...) 之前注册
    expect(main.indexOf('vite:preloadError')).toBeLessThan(main.indexOf('createRoot('));
  });

  it('每个懒加载路由都被 RouteErrorBoundary 包住，且边界在 Suspense 之外', () => {
    const routes = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
    expect(routes).toContain("import RouteErrorBoundary from '../components/RouteErrorBoundary';");
    expect(routes).toContain('<RouteErrorBoundary>');
    expect(routes.indexOf('<RouteErrorBoundary>')).toBeLessThan(routes.indexOf('<Suspense fallback='));
  });

  it('路由变化时清掉错误态，避免同位置换参数后一直卡在兜底页', () => {
    const boundary = read('frontend', 'src', 'components', 'RouteErrorBoundary.jsx');
    expect(boundary).toContain('static getDerivedStateFromError(error)');
    expect(boundary).toContain('componentDidCatch(error)');
    expect(boundary).toContain('prevProps.resetKey !== this.props.resetKey');
    expect(boundary).toContain('const { pathname } = useLocation();');
    expect(boundary).toContain('resetKey={pathname}');
  });

  it('兜底 UI 不是空白：给出文案与「重新加载」按钮', () => {
    const boundary = read('frontend', 'src', 'components', 'RouteErrorBoundary.jsx');
    expect(boundary).toContain('role="alert"');
    expect(boundary).toContain('页面资源已更新，需要重新加载');
    expect(boundary).toContain('页面渲染失败');
    expect(boundary).toContain('重新加载');
  });
});
