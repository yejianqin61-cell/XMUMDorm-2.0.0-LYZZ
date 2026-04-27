// IMPORTANT: bump this to force clients update cache
const CACHE_NAME = 'dorm-cache-v10';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/break.png',
  // Eat page: background + stickers (public root)
  '/eatbackground.png',
  '/B1.png',
  '/D6.png',
  '/LY3.png',
  '/OTHERS.png',
  '/Rank.png',
  '/bell.png',

  // Square page: background + stickers
  '/square/background.png',
  '/square/%E4%BA%8C%E6%89%8B.png',
  '/square/%E6%96%B0%E7%94%9F%E6%89%8B%E5%86%8C.png',
  '/square/%E7%83%AD%E6%90%9C.png',
  '/square/%E7%A4%BE%E5%9B%A2.png',
  '/square/%E8%B7%91%E8%85%BF.png',

  // GIF assets
  '/gif/b4.gif',
  '/gif/vsgif_com_dogecoin-meme_.3422573.gif',
  '/gif/%E6%96%91%E9%A9%AC%E7%BA%BF%E4%BA%BA%E8%A1%8C%E9%81%93%E8%BF%87%E9%A9%AC%E8%B7%AF%E8%B5%B0%E8%B7%AF%E8%B5%B0gif%E5%9B%BE%E7%B4%A0%E6%9D%90_%E7%88%B1%E7%BB%99%E7%BD%91_aigei_com.gif',
  '/gif/%E8%80%84%E8%80%8B%E7%8C%AB%E5%8A%A8%E6%80%81gif%E8%A1%A8%E6%83%85%E5%8C%85%20(6)_%E7%88%B1%E7%BB%99%E7%BD%91_aigei_com.gif',
  '/gif/%E8%BF%AA%E8%8E%AB%E8%B5%B0%E7%8C%AB%E6%AD%A5_%E7%88%B1%E7%BB%99%E7%BD%91_aigei_com.gif',
];

self.addEventListener('install', (event) => {
  // 在 Vite 开发环境（通常 5173 端口）不做预缓存，避免缓存到源码导致 HMR/页面不更新
  if (String(self.location && self.location.port) === '5173') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 默认网络优先：先请求网络，失败或离线时才用缓存，这样网站更新后手机无需清缓存
// 但 Eat / Square 的贴图、背景、GIF 属于“稳定静态资源”，这里做 cache-first，避免每次刷新重新加载。
// API 请求不写入缓存，且网络失败时必须返回合法 Response（否则 Uncaught: Failed to convert value to 'Response'）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Vite dev：不要拦截任何请求（否则容易把 /src/* 缓存住导致“前端没更新”）
  if (String(self.location && self.location.port) === '5173') return;

  // 静态关键图 / 贴图 / GIF：缓存优先（丝滑刷新）
  try {
    const u = new URL(request.url);
    const sameOrigin = u.origin === self.location.origin;
    const p = u.pathname || '';
    const isKeyStatic =
      sameOrigin &&
      (
        p === '/break.png' ||
        p === '/eatbackground.png' ||
        p.startsWith('/square/') ||
        p.startsWith('/gif/') ||
        p.startsWith('/backgrounds/') ||
        // Eat stickers at public root
        /^\/(B1|D6|LY3|OTHERS|Rank|bell)\.png$/i.test(p)
      );

    if (isKeyStatic) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(request);
          if (cached) return cached;
          const resp = await fetch(request);
          // 只缓存 200 且非 partial 的响应，避免污染
          if (
            resp &&
            resp.ok &&
            resp.status === 200 &&
            !resp.headers.get('Content-Range') &&
            (resp.type === 'basic' || resp.type === 'cors')
          ) {
            cache.put(request, resp.clone()).catch(() => {});
          }
          return resp;
        })
      );
      return;
    }
  } catch (_) {}

  const url = request.url;
  const isApi = url.includes('/api/');

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache API 不允许缓存 206 Partial Content / opaque；否则会报错并污染控制台
        const canCache =
          !isApi &&
          response.ok &&
          response.status === 200 &&
          !response.headers.get('Content-Range') &&
          (response.type === 'basic' || response.type === 'cors');
        if (canCache) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clone))
            .catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (isApi) {
            return new Response(
              JSON.stringify({ status: -1, message: '网络不可用或未缓存该接口' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        })
      )
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Dorm', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Dorm';
  const tag = data.tag || 'dorm-push';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/about/schedule' },
    tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // 测试推送：保持横幅直到用户操作，避免被系统立刻收起或只进通知中心不易发现
    requireInteraction: tag === 'test',
    renotify: tag === 'test',
  };
  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error('[sw push] showNotification failed:', err);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/about/schedule';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
