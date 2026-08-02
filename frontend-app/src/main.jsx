import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import './registerServiceWorker';
import { initCapacitor } from './utils/capacitor';

// Native setup is intentionally defensive: web builds must remain independent
// from Capacitor plugins while the app prepares safe-area handling.
void initCapacitor();

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
      }).catch(function () {
        // Native status bar APIs are optional on some builds.
      });
    }
  } catch {
    // Native-only setup must never prevent the web app from rendering.
  }
}, 500);
