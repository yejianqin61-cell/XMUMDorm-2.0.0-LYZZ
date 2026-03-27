// 简单注册 Service Worker，用于 PWA 基础离线支持
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[Service Worker] 注册失败（推送/离线将不可用）:', err);
      }
    });
  });
}

