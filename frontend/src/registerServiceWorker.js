// Service Worker（PWA/离线/推送）
// 重要：开发环境禁用并主动注销，否则会缓存 /src/* 导致 Vite HMR 看起来“前端不更新”
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
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

// A stale service-worker response can leave the HTML and hashed CSS from
// different deployments on screen. Recover once when the global token sheet
// is missing instead of rendering an unstyled application.
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  const recoveryKey = 'dorm-css-recovery-v1';
  const hasCoreStyles = () => Boolean(getComputedStyle(document.documentElement).getPropertyValue('--color-bg-page').trim());
  window.addEventListener('load', () => {
    if (hasCoreStyles() || window.sessionStorage.getItem(recoveryKey)) return;
    window.sessionStorage.setItem(recoveryKey, '1');
    navigator.serviceWorker?.getRegistrations?.()
      .then((regs) => Promise.all(regs.map((registration) => registration.unregister())))
      .catch(() => {})
      .finally(() => {
        if (window.caches?.keys) {
          window.caches.keys().then((keys) => Promise.all(keys.map((key) => window.caches.delete(key)))).catch(() => {});
        }
        window.location.reload();
      });
  });
}

