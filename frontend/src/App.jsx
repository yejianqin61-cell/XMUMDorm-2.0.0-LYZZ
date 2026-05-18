import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ExpFeedbackProvider } from './context/ExpFeedbackContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import { layoutRoutes } from './routes/layoutRoutes';
import './App.css';
import './styles/states.css';

function SplashScreen({ fadeOut, onReady }) {
  const videoRef = useRef(null);

  const handleLoadedData = () => {
    const el = videoRef.current;
    if (el) {
      // 主动触发播放，兼容部分移动端浏览器
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
  };

  const handlePlay = () => {
    if (onReady) onReady();
  };

  return (
    <div className={`splash-screen ${fadeOut ? 'splash-screen--fade-out' : ''}`}>
      <video
        ref={videoRef}
        className="splash-screen-video"
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-orientation="portrait"
        preload="auto"
        onLoadedData={handleLoadedData}
        onPlay={handlePlay}
      />
    </div>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <ExpFeedbackProvider>
            <LanguageProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <Layout />
                    </AuthGuard>
                  }
                >
                  {layoutRoutes}
                </Route>
              </Routes>
            </LanguageProvider>
            </ExpFeedbackProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const timersRef = useRef({ fade: null, hide: null });
  const startedRef = useRef(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [manualGuide, setManualGuide] = useState(null); // 'ios-safari' | 'wechat-ios' | null

  const startSplashTimers = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timersRef.current.fade = setTimeout(() => setFadeOut(true), 1700);
    timersRef.current.hide = setTimeout(() => setShowSplash(false), 2000);
  }, []);

  useEffect(() => {
    // 兜底：如果视频迟迟没加载，最多 3 秒后也启动计时
    const fallback = setTimeout(() => {
      startSplashTimers();
    }, 3000);
    return () => {
      clearTimeout(fallback);
      if (timersRef.current.fade) clearTimeout(timersRef.current.fade);
      if (timersRef.current.hide) clearTimeout(timersRef.current.hide);
    };
  }, [startSplashTimers]);

  // 监听 PWA 安装提示（仅支持的浏览器会触发）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasShown = window.localStorage.getItem('dorm-install-hint-dismissed') === 'true';
    if (hasShown) return;

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPromptEvent(e);
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 针对 iOS Safari / 微信内置浏览器的手动“添加到主屏幕”指引
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasShown = window.localStorage.getItem('dorm-install-hint-dismissed') === 'true';
    if (hasShown) return;
    const ua = window.navigator.userAgent || '';
    const isIOS = /iP(hone|od|ad)/.test(ua);
    const isWeChat = /MicroMessenger/i.test(ua);
    const isIOSWeChat = isIOS && isWeChat;
    const isSafari =
      isIOS &&
      /Safari/i.test(ua) &&
      !/CriOS|FxiOS|EdgiOS/i.test(ua) && // 排除 iOS 上的 Chrome/Firefox/Edge
      !isWeChat;

    if (isIOSWeChat) {
      setManualGuide('wechat-ios');
      setShowInstallPrompt(true);
    } else if (isSafari) {
      setManualGuide('ios-safari');
      setShowInstallPrompt(true);
    }
  }, []);

  const handleInstallLater = () => {
    setShowInstallPrompt(false);
    try {
      window.localStorage.setItem('dorm-install-hint-dismissed', 'true');
    } catch {}
  };

  const handleInstallNow = async () => {
    if (!installPromptEvent) {
      handleInstallLater();
      return;
    }
    try {
      installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } catch {}
    handleInstallLater();
  };

  if (showSplash) {
    return <SplashScreen fadeOut={fadeOut} onReady={startSplashTimers} />;
  }

  return (
    <>
      <MainApp />
      {showInstallPrompt && (
        <div className="install-hint-backdrop" onClick={handleInstallLater}>
          <div
            className="install-hint-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="install-hint-title">添加 Dorm 到主屏幕</h2>
            {manualGuide === 'ios-safari' && (
              <p className="install-hint-text">
                当前在 iOS Safari 浏览器中。请点击底部中间的「分享」按钮，向下滑动并选择「添加到主屏幕
                Add to Home Screen」，即可将 Dorm 添加到手机桌面。
              </p>
            )}
            {manualGuide === 'wechat-ios' && (
              <p className="install-hint-text">
                当前在微信内置浏览器中。请先点击右上角「···」选择「在 Safari 中打开」，然后在 Safari
                中通过底部的「分享」→「添加到主屏幕 Add to Home Screen」将 Dorm 添加到桌面。
              </p>
            )}
            {!manualGuide && (
              <p className="install-hint-text">
                将 Dorm 安装到手机桌面，像 App 一样全屏使用，启动更快、体验更好。
              </p>
            )}
            <div className="install-hint-actions">
              <button
                type="button"
                className="install-hint-btn install-hint-btn-secondary"
                onClick={handleInstallLater}
              >
                {manualGuide ? '知道了' : '暂时不用'}
              </button>
              {!manualGuide && (
                <button
                  type="button"
                  className="install-hint-btn install-hint-btn-primary"
                  onClick={handleInstallNow}
                >
                  添加到主屏幕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
