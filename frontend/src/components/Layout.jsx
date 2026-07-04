import { useRef, useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TabBar from './TabBar';
import { getTabIndex } from './TabBar';
import TreeHole from '../pages/TreeHole';
import CanteenHome from '../pages/CanteenHome';
import SquareHome from '../pages/SquareHome';
import MyZone from '../pages/MyZone';
import { useLanguage } from '../context/LanguageContext';
import { enterFullscreen } from '../utils/fullscreen';
import { useAuth } from '../context/AuthContext';
import { getUnreadAnnouncements, markNotificationRead, markNotificationsReadBatch } from '@shared/api/notifications';
import { QK } from '@shared/query/queryKeys';
import { BACKGROUND_IMAGES } from '../config/backgrounds';
import { resolvePageTitle } from '../config/pageTitles';
import './TopBar.css';
import './TabBar.css';
import './Layout.css';

/** 未读公告列表在客户端缓存时间，减少重复请求与 CORS 预检 */
const UNREAD_ANN_STALE_MS = 3 * 60 * 1000;

const TAB_ROOT_COMPONENTS = {
  '/about': SquareHome,
  '/': TreeHole,
  '/eat': CanteenHome,
  '/myzone': MyZone,
};


/** 需要显示返回键的路径（含 /post/:id 详情页、帖子搜索/话题） */
const SHOW_BACK_PATHS = ['/post/new', '/post/', '/posts/'];

function renderDesktopRootRoute(pathname) {
  const RootComponent = TAB_ROOT_COMPONENTS[pathname];
  return RootComponent ? <RootComponent /> : null;
}

/** 整体布局：顶栏（标题+信箱）+ 内容区 + 底部 Tab；Tab 仅能通过底部点击切换；主 Tab 间切换带过渡动画 + 公告弹窗 */
function Layout({ mode = 'mobile' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const queryClient = useQueryClient();
  const { isLoggedIn, token, isAdmin } = useAuth();
  const tokenKey = token ?? '';
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const isDesktopShell = mode === 'desktop';
  // 只在用户第一次交互时尝试进入全屏
  const hasTriedFullscreenRef = useRef(false);

  const unreadAnnouncementsQuery = useQuery({
    queryKey: QK.unreadAnnouncements(tokenKey),
    queryFn: async () => {
      const list = await getUnreadAnnouncements();
      return Array.isArray(list) ? list : [];
    },
    enabled: isLoggedIn && !!token,
    staleTime: UNREAD_ANN_STALE_MS,
  });
  const announcements = unreadAnnouncementsQuery.data ?? [];
  const showAnnouncements =
    isLoggedIn && unreadAnnouncementsQuery.isSuccess && announcements.length > 0;
  const [bgIndex] = useState(() => {
    if (!Array.isArray(BACKGROUND_IMAGES) || BACKGROUND_IMAGES.length === 0) return 0;
    return Math.floor(Math.random() * BACKGROUND_IMAGES.length);
  });

  const activeTabIndex = useMemo(() => getTabIndex(pathname), [pathname]);
  // 性能：Tab 常驻模式下，未访问过的 Tab 不挂载，避免无关页面的 Query 同时触发
  const [mountedTabs, setMountedTabs] = useState(() => new Set([getTabIndex(pathname)]));
  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(activeTabIndex)) return prev;
      const next = new Set(prev);
      next.add(activeTabIndex);
      return next;
    });
  }, [activeTabIndex]);

  useEffect(() => {
    if (isDesktopShell) return;
    if (pathname === '/' && location.key === 'default') {
      navigate('/about', { replace: true });
    }
  }, [isDesktopShell, location.key, navigate, pathname]);
  const isRootTabPage = useMemo(() => {
    // 只在四个根 Tab 页使用“常驻页面 + 滑块切换”，子路由仍交给 Outlet 渲染
    return pathname === '/' || pathname === '/eat' || pathname === '/about' || pathname === '/myzone';
  }, [pathname]);

  // iOS Safari 对 overscroll-behavior 支持不稳定：对“不可滚动”的 Tab（Eat/Square）全局禁止下拉回弹
  // iOS 下拉回弹锁已不再需要（所有 Tab 页均为滚动列表）

  const handleAnnouncementKnow = async (id) => {
    const key = QK.unreadAnnouncements(tokenKey);
    const previous = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (old) => {
      const arr = Array.isArray(old) ? old : [];
      return arr.filter((n) => n.id !== id);
    });
    try {
      await markNotificationRead(id);
    } catch (err) {
      queryClient.setQueryData(key, previous);
      console.warn('[Layout] mark announcement read failed:', err);
    }
  };

  const handleAnnouncementKnowAll = async () => {
    const key = QK.unreadAnnouncements(tokenKey);
    const current = queryClient.getQueryData(key);
    const ids = Array.isArray(current) ? current.map((n) => n.id) : [];
    queryClient.setQueryData(key, []);
    if (ids.length === 0) return;
    try {
      await markNotificationsReadBatch(ids);
    } catch (err) {
      queryClient.setQueryData(key, current);
      console.warn('[Layout] mark all announcements read failed:', err);
    }
  };

  const handleFirstInteraction = () => {
    if (isDesktopShell) return;
    if (hasTriedFullscreenRef.current) return;
    hasTriedFullscreenRef.current = true;
    enterFullscreen();
  };

  const title = resolvePageTitle(pathname, isZh);
  const showTreeHoleFab = !isDesktopShell && pathname === '/' && activeTabIndex === 1;
  const desktopRootRoute = isDesktopShell ? renderDesktopRootRoute(pathname) : null;
  const routeContent = isDesktopShell
    ? (desktopRootRoute || <Outlet />)
    : (
      isRootTabPage ? (
        <div className="tab-stack-wrap" aria-label="Tab pages">
          <div
            className="tab-stack-track"
            style={{
              transform: `translateX(-${activeTabIndex * 25}%)`,
            }}
          >
            <div className="tab-stack-pane" data-active={activeTabIndex === 0} aria-label="Square">
              {mountedTabs.has(0) ? <SquareHome /> : null}
            </div>
            <div className="tab-stack-pane" data-active={activeTabIndex === 1} aria-label="TreeHole">
              {mountedTabs.has(1) ? <TreeHole /> : null}
            </div>
            <div className="tab-stack-pane" data-active={activeTabIndex === 2} aria-label="Eat">
              {mountedTabs.has(2) ? <CanteenHome /> : null}
            </div>
            <div className="tab-stack-pane tab-stack-pane--myzone" data-active={activeTabIndex === 3} aria-label="MyZone">
              {mountedTabs.has(3) ? <MyZone /> : null}
            </div>
          </div>
        </div>
      ) : (
        <Outlet />
      )
    );

  return (
    <div
      className={`app-layout app-layout--no-topbar${!isDesktopShell && isRootTabPage ? ' app-layout--tabstack' : ''}${isDesktopShell ? ' app-layout--desktop-shell' : ''}`}
      onClick={handleFirstInteraction}
    >
      <main className="app-main">
        <div
          className="app-main-bg"
          aria-hidden="true"
          style={{
            backgroundImage: `url('${(Array.isArray(BACKGROUND_IMAGES) && BACKGROUND_IMAGES[bgIndex]) || '/background.jpg'}')`,
          }}
        />
        <div className="app-main-inner">
          {routeContent}
        </div>
      </main>
      {showTreeHoleFab && (
        <>
          <button
            type="button"
            className="treehole-top pressable"
            aria-label="回到顶端 Back to top"
            onClick={() => {
              const pane = document.querySelector('.tab-stack-pane[data-active="true"]');
              const sc = pane || document.querySelector('.app-main');
              try {
                sc?.scrollTo?.({ top: 0, behavior: 'smooth' });
              } catch {
                if (sc) sc.scrollTop = 0;
                else window.scrollTo(0, 0);
              }
            }}
          >
            <UpIcon />
          </button>
          <Link
            to="/post/new"
            className="treehole-fab pressable"
            aria-label={isAdmin ? '发布公告 Announcement' : '发布帖子 Post'}
          >
            <PlusIcon />
            {isAdmin && <span className="treehole-fab-tag">公告</span>}
          </Link>
        </>
      )}
      {showAnnouncements && announcements.length > 0 && (
        <div className="app-ann-modal-backdrop" role="dialog" aria-modal="true" aria-label="全站公告 Site-wide announcements">
          <div className="app-ann-modal">
            <h2 className="app-ann-title">全站公告 Site-wide Announcements</h2>
            <div className="app-ann-list">
              {announcements.map((n) => (
                <div key={n.id} className="app-ann-item">
                  <p className="app-ann-item-title">{n.extra?.title || '公告 Announcement'}</p>
                  <p className="app-ann-item-meta">
                    {n.from_user?.nickname || n.from_user?.username || '管理员 Admin'} ·{' '}
                    {n.created_at ? new Date(n.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  <button
                    type="button"
                    className="app-ann-know-btn"
                    onClick={() => handleAnnouncementKnow(n.id)}
                  >
                    知道了 Got it
                  </button>
                </div>
              ))}
            </div>
            {announcements.length > 1 && (
              <button
                type="button"
                className="app-ann-know-all-btn"
                onClick={handleAnnouncementKnowAll}
              >
                全部知道了 Mark all as read
              </button>
            )}
          </div>
        </div>
      )}
      {!isDesktopShell ? <TabBar /> : null}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function UpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 19V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 11l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default Layout;
