// Stage 2 Web-only adapter. No native Capacitor lifecycle or plugin support.
export const Browser = {
  async open({ url } = {}) {
    if (typeof url !== 'string' || !url.trim()) {
      throw new TypeError('Browser.open requires an absolute HTTP or HTTPS URL.');
    }
    let target;
    try { target = new URL(url); }
    catch { throw new TypeError('Browser.open requires an absolute HTTP or HTTPS URL.'); }
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new TypeError('Browser.open only allows HTTP and HTTPS URLs.');
    }
    if (typeof window === 'undefined' || typeof window.open !== 'function') {
      throw new Error('Browser.open Web adapter requires a browser window.');
    }
    // Call synchronously within the user gesture. With noopener a null return
    // does not reliably distinguish success from popup blocking; do not claim
    // native success, or retry with a less secure window configuration.
    window.open(target.href, '_blank', 'noopener,noreferrer');
  },
};
