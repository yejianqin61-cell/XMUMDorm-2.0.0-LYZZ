import { useRef, useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from './TopBar';
import TabBar from './TabBar';
import { getTabIndex, getTabRootPath } from './TabBar';
import TreeHole from '../pages/TreeHole';
import CanteenArea from '../pages/CanteenArea';
import AboutUs from '../pages/AboutUs';
import MyZone from '../pages/MyZone';
import { useLanguage } from '../context/LanguageContext';
import { enterFullscreen } from '../utils/fullscreen';
import { useAuth } from '../context/AuthContext';
import { getUnreadAnnouncements, markNotificationRead, markNotificationsReadBatch } from '../api/notifications';
import { QK } from '../query/queryKeys';
import { BACKGROUND_IMAGES } from '../config/backgrounds';
import './TopBar.css';
import './TabBar.css';
import './Layout.css';

/** 未读公告列表在客户端缓存时间，减少重复请求与 CORS 预检 */
const UNREAD_ANN_STALE_MS = 3 * 60 * 1000;

const TAB_ROOT_COMPONENTS = {
  '/': TreeHole,
  '/eat': CanteenArea,
  '/about': AboutUs,
  '/myzone': MyZone,
};

const TITLE_BY_PATH_ZH = {
  '/': '厦马小筑',
  '/eat': '食堂',
  '/about': '广场',
  '/myzone': '我的',
  '/mailbox': '信箱',
  '/post/new': '发布帖子',
  '/myzone/posts': '我的帖子',
  '/myzone/reviews': '我的点评',
  '/myzone/profile': '修改资料',
  '/about/algorithm': '评分算法说明',
  '/about/profile': '关于我们',
  '/about/schedule': '课程表',
};

const TITLE_BY_PATH_EN = {
  '/': 'XMUM Dorm',
  '/eat': 'Canteen',
  '/about': 'Square',
  '/myzone': 'My Zone',
  '/mailbox': 'Mailbox',
  '/post/new': 'Post',
  '/myzone/posts': 'My Posts',
  '/myzone/reviews': 'My Reviews',
  '/myzone/profile': 'Profile',
  '/about/algorithm': 'Scoring Algorithm',
  '/about/profile': 'About us',
  '/about/schedule': 'Schedule',
};

/** 需要显示返回键的路径（含 /post/:id 详情页、帖子搜索/话题） */
const SHOW_BACK_PATHS = ['/post/new', '/post/', '/posts/'];

/** 整体布局：顶栏（标题+信箱）+ 内容区 + 底部 Tab；Tab 仅能通过底部点击切换；主 Tab 间切换带过渡动画 + 公告弹窗 */
function Layout() {
  const location = useLocation();
  const pathname = location.pathname;
  const queryClient = useQueryClient();
  const { isLoggedIn, token } = useAuth();
  const tokenKey = token ?? '';
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
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
  const isRootTabPage = useMemo(() => {
    // 只在四个根 Tab 页使用“常驻页面 + 滑块切换”，子路由仍交给 Outlet 渲染
    return pathname === '/' || pathname === '/eat' || pathname === '/about' || pathname === '/myzone';
  }, [pathname]);

  // iOS Safari 对 overscroll-behavior 支持不稳定：对“禁止滚动”的 Tab 兜底阻止 touchmove
  const preventTouchScroll = (e) => {
    e.preventDefault();
  };

  const handleAnnouncementKnow = async (id) => {
    queryClient.setQueryData(QK.unreadAnnouncements(tokenKey), (old) => {
      const arr = Array.isArray(old) ? old : [];
      return arr.filter((n) => n.id !== id);
    });
    try {
      await markNotificationRead(id);
    } catch (_) {
      // 忽略单条失败
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
    } catch (_) {
      // 忽略批量失败
    }
  };

  const handleFirstInteraction = () => {
    if (hasTriedFullscreenRef.current) return;
    hasTriedFullscreenRef.current = true;
    enterFullscreen();
  };

  const TITLE_BY_PATH = isZh ? TITLE_BY_PATH_ZH : TITLE_BY_PATH_EN;
  let title = TITLE_BY_PATH[pathname];
  if (!title) {
    if (pathname.startsWith('/eat/food/') && pathname.endsWith('/review')) {
      title = isZh ? '发布点评' : 'Publish Review';
    } else if (pathname === '/eat/rankings') {
      title = isZh ? '排行榜' : 'Rankings';
    } else if (/\/eat\/[^/]+\/ranking\/?$/.test(pathname)) {
      const seg = pathname.split('/')[2];
      const code = seg ? decodeURIComponent(seg) : '';
      title = isZh ? `${code || '分区'} 商品榜` : `${code || 'Area'} · Top foods`;
    } else if (
      pathname.startsWith('/eat/') &&
      !pathname.startsWith('/eat/merchant') &&
      !pathname.startsWith('/eat/food') &&
      pathname !== '/eat/rankings'
    ) {
      // 分区商家页 /eat/D6 …：中文仅分区代码；英文附带 Merchants，与下方 Top foods 卡片呼应
      const seg = pathname.split('/')[2];
      const codeLabel = seg ? decodeURIComponent(seg) : '';
      title = codeLabel ? (isZh ? codeLabel : `${codeLabel} · Merchants`) : (isZh ? '食堂' : 'Canteen');
    } else if (pathname.startsWith('/eat')) {
      title = isZh ? '食堂' : 'Canteen';
    } else if (pathname.startsWith('/mailbox')) {
      title = isZh ? '信箱' : 'Mailbox';
    } else if (pathname === '/post/new') {
      title = isZh ? '发布帖子' : 'Post';
    } else if (pathname.startsWith('/posts/search')) {
      title = isZh ? '搜索帖子' : 'Search posts';
    } else if (pathname.startsWith('/posts/tag/')) {
      title = isZh ? '话题帖子' : 'Posts by tag';
    } else if (pathname.startsWith('/post/')) {
      title = isZh ? '帖子详情' : 'Post';
    } else if (pathname === '/myzone/posts') {
      title = isZh ? '我的帖子' : 'My Posts';
    } else if (pathname === '/myzone/reviews') {
      title = isZh ? '我的点评' : 'My Reviews';
    } else if (pathname === '/myzone/profile') {
      title = isZh ? '修改资料' : 'Profile';
    } else if (pathname === '/merchant/create') {
      title = isZh ? '店铺创建' : 'Create Store';
    } else if (pathname === '/merchant/manage') {
      title = isZh ? '菜品管理' : 'Manage Food';
    } else if (pathname === '/merchant/food/new') {
      title = isZh ? '菜品发布' : 'Publish Food';
    } else if (pathname.startsWith('/merchant/food/')) {
      title = isZh ? '菜品详情' : 'Food Detail';
    } else if (pathname.startsWith('/merchant/')) {
      title = isZh ? '商家' : 'Merchant';
    } else if (pathname === '/about/thanks') {
      title = isZh ? '特别鸣谢' : 'Special Thanks';
    } else if (pathname === '/about/team') {
      title = isZh ? '团队介绍' : 'Team';
    } else if (pathname === '/about/editor-note') {
      title = isZh ? '编者的话' : "Editor's Note";
    } else if (pathname === '/about/algorithm') {
      title = isZh ? '评分算法说明' : 'Scoring Algorithm';
    } else {
      title = isZh ? '厦马小筑' : 'XMUM Dorm';
    }
  }
  const showBack =
    pathname.startsWith('/posts/') ||
    pathname.startsWith('/post/') ||
    (pathname.startsWith('/eat') && pathname !== '/eat') ||
    pathname.startsWith('/merchant') ||
    pathname === '/myzone/posts' ||
    pathname === '/myzone/reviews' ||
    pathname === '/myzone/profile' ||
    pathname.startsWith('/about/');

  /** 顶栏仅在「树洞」Tab（/ 及 /post、/posts 等子路由）显示；食堂/广场/我的主 Tab 隐藏 */
  const showTopBar = getTabRootPath(pathname) === '/';

  return (
    <div
      className={`app-layout${showTopBar ? '' : ' app-layout--no-topbar'}${isRootTabPage ? ' app-layout--tabstack' : ''}`}
      onClick={handleFirstInteraction}
    >
      {showTopBar ? <TopBar title={title} showBack={showBack} /> : null}
      <main className="app-main">
        <div
          className="app-main-bg"
          aria-hidden="true"
          style={{
            backgroundImage: `url('${(Array.isArray(BACKGROUND_IMAGES) && BACKGROUND_IMAGES[bgIndex]) || '/background.jpg'}')`,
          }}
        />
        <div className="app-main-inner">
          {isRootTabPage ? (
            <div className="tab-stack-wrap" aria-label="Tab pages">
              <div
                className="tab-stack-track"
                style={{
                  transform: `translateX(-${activeTabIndex * 25}%)`,
                }}
              >
                <div className="tab-stack-pane" aria-label="TreeHole">
                  <TreeHole />
                </div>
                <div className="tab-stack-pane tab-stack-pane--no-scroll" aria-label="Eat" onTouchMove={preventTouchScroll}>
                  <CanteenArea />
                </div>
                <div className="tab-stack-pane tab-stack-pane--no-scroll" aria-label="Square" onTouchMove={preventTouchScroll}>
                  <AboutUs />
                </div>
                <div className="tab-stack-pane tab-stack-pane--no-scroll" aria-label="MyZone" onTouchMove={preventTouchScroll}>
                  <MyZone />
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
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
      <TabBar />
    </div>
  );
}

export default Layout;
