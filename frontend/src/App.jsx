import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/query/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ExpFeedbackProvider } from './context/ExpFeedbackContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import AuthGuard from './components/AuthGuard';
import SiteShellRoute from './components/shell/SiteShellRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserList from './pages/Admin/UserList';
import UserDetail from './pages/Admin/UserDetail';
import ReportList from './pages/Admin/ReportList';
import ReportDetail from './pages/Admin/ReportDetail';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AnnouncementManage from './pages/Admin/AnnouncementManage';
import AuditLogList from './pages/Admin/AuditLogList';
import SystemConfig from './pages/Admin/SystemConfig';
import SensitiveWordsManage from './pages/Admin/SensitiveWordsManage';
import ContentList from './pages/Admin/ContentList';
import ContentDetail from './pages/Admin/ContentDetail';
import { layoutRoutes } from './routes/layoutRoutes';
import './App.css';
import './styles/states.css';
import './styles/tokens.css';
import './styles/legacy-wx-bridge.css';
import './styles/card.css';
import './styles/state.css';

function SplashScreen({ fadeOut, onReady }) {
  const videoRef = useRef(null);

  const handleLoadedData = () => {
    const el = videoRef.current;
    if (el) {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
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
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route
                  path="/"
                  element={(
                    <AuthGuard>
                      <SiteShellRoute />
                    </AuthGuard>
                  )}
                >
                  {layoutRoutes}
                </Route>
                <Route
                  path="/myzone/admin"
                  element={(
                    <AuthGuard>
                      <AdminLayout />
                    </AuthGuard>
                  )}
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<UserList />} />
                  <Route path="users/:id" element={<UserDetail />} />
                  <Route path="reports" element={<ReportList />} />
                  <Route path="reports/:id" element={<ReportDetail />} />
                  <Route path="announcements" element={<AnnouncementManage />} />
                  <Route path="logs" element={<AuditLogList />} />
                  <Route path="config" element={<SystemConfig />} />
                  <Route path="sensitive-words" element={<SensitiveWordsManage />} />
                  <Route path="contents/:module" element={<ContentList />} />
                  <Route path="contents/:module/:id" element={<ContentDetail />} />
                </Route>
              </Routes>
            </ExpFeedbackProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function InstallPrompt({ showInstallPrompt, manualGuide, onInstallLater, onInstallNow }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  if (!showInstallPrompt) return null;

  return (
    <div className="install-hint-backdrop" onClick={onInstallLater}>
      <div className="install-hint-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="install-hint-title">{isEn ? 'Add Dorm to Home Screen' : '添加 Dorm 到主屏幕'}</h2>
        {manualGuide === 'ios-safari' && (
          <p className="install-hint-text">
            {isEn
              ? 'You are using iOS Safari. Tap the Share button at the bottom, then choose “Add to Home Screen” to place Dorm on your phone desktop.'
              : '当前在 iOS Safari 浏览器中。请点击底部中间的「分享」按钮，向下滑动并选择「添加到主屏幕 Add to Home Screen」，即可将 Dorm 添加到手机桌面。'}
          </p>
        )}
        {manualGuide === 'wechat-ios' && (
          <p className="install-hint-text">
            {isEn
              ? 'You are in the WeChat built-in browser. First tap the top-right menu and choose “Open in Safari”, then use Safari’s Share → Add to Home Screen to install Dorm.'
              : '当前在微信内置浏览器中。请先点击右上角「···」选择「在 Safari 中打开」，然后在 Safari 中通过底部的「分享」→「添加到主屏幕 Add to Home Screen」将 Dorm 添加到桌面。'}
          </p>
        )}
        {!manualGuide && (
          <p className="install-hint-text">
            {isEn
              ? 'Install Dorm on your phone desktop for a full-screen app-like experience with faster launch.'
              : '将 Dorm 安装到手机桌面，像 App 一样全屏使用，启动更快、体验更好。'}
          </p>
        )}
        <div className="install-hint-actions">
          <button
            type="button"
            className="install-hint-btn install-hint-btn-secondary"
            onClick={onInstallLater}
          >
            {manualGuide ? (isEn ? 'Got it' : '知道了') : (isEn ? 'Maybe later' : '暂时不用')}
          </button>
          {!manualGuide && (
            <button
              type="button"
              className="install-hint-btn install-hint-btn-primary"
              onClick={onInstallNow}
            >
              {isEn ? 'Add to Home Screen' : '添加到主屏幕'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const timersRef = useRef({ fade: null, hide: null });
  const startedRef = useRef(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [manualGuide, setManualGuide] = useState(null);

  const startSplashTimers = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timersRef.current.fade = setTimeout(() => setFadeOut(true), 1700);
    timersRef.current.hide = setTimeout(() => setShowSplash(false), 2000);
  }, []);

  useEffect(() => {
    const fallback = setTimeout(() => {
      startSplashTimers();
    }, 3000);

    return () => {
      clearTimeout(fallback);
      if (timersRef.current.fade) clearTimeout(timersRef.current.fade);
      if (timersRef.current.hide) clearTimeout(timersRef.current.hide);
    };
  }, [startSplashTimers]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const hasShown = window.localStorage.getItem('dorm-install-hint-dismissed') === 'true';
    if (hasShown) return undefined;

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPromptEvent(event);
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasShown = window.localStorage.getItem('dorm-install-hint-dismissed') === 'true';
    if (hasShown) return;

    const ua = window.navigator.userAgent || '';
    const isIOS = /iP(hone|od|ad)/.test(ua);
    const isWeChat = /MicroMessenger/i.test(ua);
    const isIOSWeChat = isIOS && isWeChat;
    const isSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua) && !isWeChat;

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
      <InstallPrompt
        showInstallPrompt={showInstallPrompt}
        manualGuide={manualGuide}
        onInstallLater={handleInstallLater}
        onInstallNow={handleInstallNow}
      />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}
