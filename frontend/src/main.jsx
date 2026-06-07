import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import './registerServiceWorker';
import { initCapacitor, isNative } from './utils/capacitor';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Capacitor native initialization — ZERO impact on web
// All native code is gated behind isNative() checks
(async () => {
  await initCapacitor();
  if (!isNative()) return; // Web: nothing below runs

  // StatusBar: match the app's theme
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#ffffff' });
  } catch {}

  // Push Notifications: cap native push, web push handled by sw.js
  try {
    const { initPush } = await import('./services/pushService');
    await initPush();
  } catch {}

  // SplashScreen: hide after React renders
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    SplashScreen.hide();
  } catch {}
})();
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

