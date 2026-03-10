import { useRef, useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import TabBar from './TabBar';
import { TABS, getTabIndex, getTabRootPath } from './TabBar';
import TreeHole from '../pages/TreeHole';
import CanteenArea from '../pages/CanteenArea';
import AboutUs from '../pages/AboutUs';
import MyZone from '../pages/MyZone';
import { enterFullscreen } from '../utils/fullscreen';
import { useAuth } from '../context/AuthContext';
import { getUnreadAnnouncements, markNotificationRead, markNotificationsReadBatch } from '../api/notifications';
import { BACKGROUND_IMAGES, BACKGROUND_SWITCH_INTERVAL_MS } from '../config/backgrounds';
import './TopBar.css';
import './TabBar.css';
import './Layout.css';

const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_VERTICAL = 80;
const SLIDE_DURATION_MS = 280;

const TAB_ROOT_COMPONENTS = {
  '/': TreeHole,
  '/eat': CanteenArea,
  '/about': AboutUs,
  '/myzone': MyZone,
};

/** 顶栏标题：中英并列（XMUM Dorm 厦马小筑） */
const TITLE_BY_PATH = {
  '/': '厦马小筑 XMUM Dorm',
  '/eat': '食堂 Eat',
  '/about': '关于我们 About us',
  '/myzone': '我的 My Zone',
  '/mailbox': '信箱 Mailbox',
  '/post/new': '发布帖子 Post',
  '/myzone/posts': '我的帖子 My Posts',
  '/myzone/reviews': '我的点评 My Reviews',
  '/myzone/profile': '修改资料 Profile',
  '/about/algorithm': '评分算法说明 Scoring Algorithm',
};

/** 需要显示返回键的路径（含 /post/:id 详情页） */
const SHOW_BACK_PATHS = ['/post/new', '/post/'];

/** 整体布局：顶栏（标题+信箱）+ 内容区 + 底部 Tab；支持全屏滑动切换 Tab + 微信风格过渡动画 + 公告弹窗 */
function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { isLoggedIn } = useAuth();
  const touchStart = useRef({ x: 0, y: 0 });
  const prevPathRef = useRef(pathname);
  // 只在用户第一次交互时尝试进入全屏
  const hasTriedFullscreenRef = useRef(false);
  const [slide, setSlide] = useState(null);
  const [slidePhase, setSlidePhase] = useState('start');
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [bgIndex, setBgIndex] = useState(() => {
    if (!Array.isArray(BACKGROUND_IMAGES) || BACKGROUND_IMAGES.length === 0) return 0;
    return Math.floor(Math.random() * BACKGROUND_IMAGES.length);
  });

  useEffect(() => {
    const prevRoot = getTabRootPath(prevPathRef.current);
    const nextRoot = getTabRootPath(pathname);
    if (prevRoot !== nextRoot && TAB_ROOT_COMPONENTS[prevRoot] && TAB_ROOT_COMPONENTS[nextRoot]) {
      const direction = getTabIndex(pathname) > getTabIndex(prevPathRef.current) ? 1 : -1;
      setSlide({ fromPath: prevRoot, toPath: nextRoot, direction });
      setSlidePhase('start');
      const t1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSlidePhase('end'));
      });
      const t2 = setTimeout(() => {
        setSlide(null);
      }, SLIDE_DURATION_MS);
      prevPathRef.current = pathname;
      return () => {
        cancelAnimationFrame(t1);
        clearTimeout(t2);
      };
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  // 全站背景轮播：在 BACKGROUND_SWITCH_INTERVAL_MS 间隔内轮播 BACKGROUND_IMAGES
  useEffect(() => {
    if (!Array.isArray(BACKGROUND_IMAGES) || BACKGROUND_IMAGES.length <= 1) return undefined;
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, BACKGROUND_SWITCH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // 加载未读公告，用于登录后弹窗
  useEffect(() => {
    if (!isLoggedIn) {
      setAnnouncements([]);
      setShowAnnouncements(false);
      return;
    }
    let cancelled = false;
    getUnreadAnnouncements()
      .then((list) => {
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        setAnnouncements(arr);
        setShowAnnouncements(arr.length > 0);
      })
      .catch(() => {
        // 忽略公告加载错误，避免影响主流程
      });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handleAnnouncementKnow = async (id) => {
    setAnnouncements((prev) => prev.filter((n) => n.id !== id));
    try {
      await markNotificationRead(id);
    } catch (_) {
      // 忽略单条失败
    }
    setShowAnnouncements((prev) => prev && announcements.filter((n) => n.id !== id).length > 0);
  };

  const handleAnnouncementKnowAll = async () => {
    const ids = announcements.map((n) => n.id);
    setAnnouncements([]);
    setShowAnnouncements(false);
    if (ids.length === 0) return;
    try {
      await markNotificationsReadBatch(ids);
    } catch (_) {
      // 忽略批量失败
    }
  };

  const onSwipeTouchStart = (e) => {
    const t = e.touches?.[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onSwipeTouchEnd = (e) => {
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_MAX_VERTICAL) return;
    const cur = getTabIndex(pathname);
    if (dx < 0 && cur < TABS.length - 1) navigate(TABS[cur + 1].path);
    else if (dx > 0 && cur > 0) navigate(TABS[cur - 1].path);
  };

  const handleFirstInteraction = () => {
    if (hasTriedFullscreenRef.current) return;
    hasTriedFullscreenRef.current = true;
    enterFullscreen();
  };

  let title = TITLE_BY_PATH[pathname];
  if (!title) {
    if (pathname.startsWith('/eat/food/') && pathname.endsWith('/review')) title = '发布点评 Publish Review';
    else if (pathname === '/eat/rankings') title = '排行榜 Rankings';
    else if (pathname.startsWith('/eat')) title = '食堂 Eat';
    else if (pathname.startsWith('/mailbox')) title = '信箱 Mailbox';
    else if (pathname === '/post/new') title = '发布帖子 Post';
    else if (pathname.startsWith('/post/')) title = '帖子详情 Post';
    else if (pathname === '/myzone/posts') title = '我的帖子 My Posts';
    else if (pathname === '/myzone/reviews') title = '我的点评 My Reviews';
    else if (pathname === '/myzone/profile') title = '修改资料 Profile';
    else if (pathname === '/merchant/create') title = '店铺创建 Create Store';
    else if (pathname === '/merchant/manage') title = '菜品管理 Manage Food';
    else if (pathname === '/merchant/food/new') title = '菜品发布 Publish Food';
    else if (pathname.startsWith('/merchant/food/')) title = '菜品详情 Food Detail';
    else if (pathname.startsWith('/merchant/')) title = '商家 Merchant';
    else if (pathname === '/about/thanks') title = '特别鸣谢 Special Thanks';
    else if (pathname === '/about/team') title = '团队介绍 Team';
    else if (pathname === '/about/editor-note') title = '编者的话 Editor\'s Note';
    else if (pathname === '/about/algorithm') title = '评分算法说明 Scoring Algorithm';
    else title = '厦马小筑 XMUM Dorm';
  }
  const showBack =
    pathname.startsWith('/post/') ||
    (pathname.startsWith('/eat') && pathname !== '/eat') ||
    pathname.startsWith('/merchant') ||
    pathname === '/myzone/posts' ||
    pathname === '/myzone/reviews' ||
    pathname === '/myzone/profile' ||
    pathname.startsWith('/about/');

  return (
    <div
      className="app-layout"
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}
      onClick={handleFirstInteraction}
    >
      <TopBar title={title} showBack={showBack} />
      <main className="app-main">
        <div
          className="app-main-bg"
          aria-hidden="true"
          style={{
            backgroundImage: `url('${(Array.isArray(BACKGROUND_IMAGES) && BACKGROUND_IMAGES[bgIndex]) || '/background.jpg'}')`,
          }}
        />
        <div className="app-main-inner">
          {slide ? (
            <div className={`app-slide-wrap app-slide-${slide.direction === 1 ? 'forward' : 'back'} app-slide-${slidePhase}`}>
              <div className="app-slide-track">
                {slide.direction === 1 ? (
                  <>
                    <div className="app-slide-pane">{(() => { const C = TAB_ROOT_COMPONENTS[slide.fromPath]; return C ? <C /> : null; })()}</div>
                    <div className="app-slide-pane">{(() => { const C = TAB_ROOT_COMPONENTS[slide.toPath]; return C ? <C /> : null; })()}</div>
                  </>
                ) : (
                  <>
                    <div className="app-slide-pane">{(() => { const C = TAB_ROOT_COMPONENTS[slide.toPath]; return C ? <C /> : null; })()}</div>
                    <div className="app-slide-pane">{(() => { const C = TAB_ROOT_COMPONENTS[slide.fromPath]; return C ? <C /> : null; })()}</div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
      {showAnnouncements && announcements.length > 0 && (
        <div className="app-ann-modal-backdrop" role="dialog" aria-modal="true" aria-label="全站公告">
          <div className="app-ann-modal">
            <h2 className="app-ann-title">全站公告</h2>
            <div className="app-ann-list">
              {announcements.map((n) => (
                <div key={n.id} className="app-ann-item">
                  <p className="app-ann-item-title">{n.extra?.title || '公告 Announcement'}</p>
                  <p className="app-ann-item-meta">
                    {n.from_user?.nickname || n.from_user?.username || '管理员'} ·{' '}
                    {n.created_at ? new Date(n.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  <button
                    type="button"
                    className="app-ann-know-btn"
                    onClick={() => handleAnnouncementKnow(n.id)}
                  >
                    知道了
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
                全部知道了
              </button>
            )}
          </div>
        </div>
      )}
      <TabBar />
    </div>
  );
}

export default Layout;
