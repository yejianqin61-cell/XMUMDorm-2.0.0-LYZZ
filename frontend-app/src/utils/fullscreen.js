// 统一封装 Fullscreen 进入逻辑，兼容主流浏览器；若不支持则静默失败
export function enterFullscreen() {
  if (typeof document === 'undefined') return;

  const docEl = document.documentElement;
  const request =
    docEl.requestFullscreen ||
    docEl.webkitRequestFullscreen ||
    docEl.mozRequestFullScreen ||
    docEl.msRequestFullscreen;

  const isFullscreen =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement;

  if (!request || isFullscreen) return;

  try {
    const p = request.call(docEl);
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  } catch {
    // 静默失败即可，不影响正常使用
  }
}

