// 简单注册 Service Worker，用于 PWA 基础离线支持
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // 注册失败时静默忽略，不影响正常访问
      });
  });
}

