// Service Worker（PWA/离线/推送）
// 重要：开发环境禁用并主动注销，否则会缓存 /src/* 导致 Vite HMR 看起来“前端不更新”
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Capacitor owns the native WebView lifecycle; registering the PWA worker
  // here can cache stale bundles and intercept native API requests.
  const isCapacitor = Boolean(window.Capacitor && window.Capacitor.getPlatform?.() !== 'web');
  if (isCapacitor) {
    // Remove a worker left by a previous PWA install when opening the native app.
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((registration) => registration.unregister())))
        .catch(() => {});
    });
  } else if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[Service Worker] 注册失败（推送/离线将不可用）:', err);
      });
    });
  }
}

