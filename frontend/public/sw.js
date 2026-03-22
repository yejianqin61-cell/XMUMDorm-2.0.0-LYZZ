const CACHE_NAME = 'dorm-cache-v3';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.jsx',
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

  const url = request.url;
  const isApi = url.includes('/api/');

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!isApi && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
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
