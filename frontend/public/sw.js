const CACHE_NAME = 'dorm-cache-v8';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.jsx',
  '/break.png',
];

self.addEventListener('install', (event) => {
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

// 网络优先：先请求网络，失败或离线时才用缓存，这样网站更新后手机无需清缓存
// API 请求不写入缓存，且网络失败时必须返回合法 Response（否则 Uncaught: Failed to convert value to 'Response'）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // 静态关键图：缓存优先，避免每次都走网络导致慢
  try {
    const u = new URL(request.url);
    if (u.origin === self.location.origin && u.pathname === '/break.png') {
      event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
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
