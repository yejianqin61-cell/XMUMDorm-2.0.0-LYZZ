import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { recoverFromChunkLoadError } from '@shared/utils/chunkLoadRecovery';
import './registerServiceWorker';

/**
 * 部署换血防护：站点发新版本后，已经打开的标签页内存里仍是旧的 index.html，
 * 点开懒加载路由会去请求「旧文件名」的 chunk（服务端已删除），动态 import 失败 → 白屏。
 * Vite 会为这类失败派发 `vite:preloadError`，这里先于 React 接管：自动重载一次取回新版本。
 * 闸门规则见 shared/utils/chunkLoadRecovery（同一文件名每会话只重载一次，避免死循环）。
 */
window.addEventListener('vite:preloadError', (event) => {
  const storage = (() => {
    try {
      return window.sessionStorage;
    } catch (_) {
      return null;
    }
  })();

  const result = recoverFromChunkLoadError(event.payload, {
    storage,
    reload: () => window.location.reload(),
  });

  // 已经在重载了，就别让 Vite 再把错误抛出去（否则会走一遍兜底 UI 再刷新）
  if (result === 'reloaded') event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
/*
index.html 里有 <div id="root"></div>
        ↓
main.jsx 执行：document.getElementById('root') 得到这个 div
        ↓
createRoot(这个 div) → 得到「根对象」
        ↓
根对象.render( <StrictMode><App /></StrictMode> )
        ↓
React 把 App（以及 App 里的路由、Layout、页面）画进 div#root
        ↓
用户看到的是你的整站界面（登录页 / 树洞 / 发帖等）
*/

// --- Capacitor Safe Area (minimal, defensive, cannot crash) ---
setTimeout(function () {
  try {
    var C = window.Capacitor;
    if (!C || C.getPlatform() === 'web') return;
    document.body.classList.add('capacitor-native');

    // Safe Area
    var SB = C.Plugins && C.Plugins.StatusBar;
    if (SB && SB.getInfo) {
      SB.getInfo().then(function (info) {
        if (info && info.height > 0) {
          var px = info.height + 'px';
          document.documentElement.style.setProperty('--safe-top', px);
          document.documentElement.style.setProperty('--safe-pt', (info.height + 12) + 'px');
        }
      }).catch(function () {});
    }
  } catch (_) {}
}, 500);
