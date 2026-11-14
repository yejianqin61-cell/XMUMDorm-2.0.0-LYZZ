import { useEffect, useState } from 'react';
import { getTabIndex } from './tabRoutes';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, Languages, Menu, PenLine, Shield, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContextState';
import { useAuth } from '../context/AuthContextState';
import { SITE_PRIMARY_NAV_ITEMS, isSiteNavActive } from './shell/siteShellNav';

/** 底部 Tab：根据语言显示纯中文或纯英文 */
const TABS = [
  { path: '/about', iconKey: 'Square', labelZh: '广场', labelEn: 'Square' },
  { path: '/', iconKey: 'TreeHole', labelZh: '树洞', labelEn: 'TreeHole' },
  { path: '/eat', iconKey: 'Eat', labelZh: '食堂', labelEn: 'Eat' },
  { path: '/myzone', iconKey: 'My Zone', labelZh: '我的', labelEn: 'My Zone' },
];

/** 根据当前路径得到对应的 Tab 下标（供 Layout 全屏滑动切换复用） */


/** Tab 根路径（供 Layout 滑动动画判断是否为主 Tab 切换） */


/** 根据 pathname 得到所属 Tab 的根路径 */


/** 微信风格底部 Tab：四栏，图标+文字，选中绿色；支持左右滑动切换（全屏滑动在 Layout 上） */
function TabBar() {
  const { lang, setLang } = useLanguage();
  const { isAdmin } = useAuth();
  const isZh = lang !== 'en';
  const location = useLocation();
  const [moreOpenPath, setMoreOpenPath] = useState(null);
  const moreOpen = moreOpenPath === location.pathname;
  const activeIndex = getTabIndex(location.pathname);
  const primarySectionActive = SITE_PRIMARY_NAV_ITEMS.some((item) => (
    ['square', 'treehole', 'canteen', 'myzone'].includes(item.key)
    && isSiteNavActive(location.pathname, item)
  ));
  const moreActive = !primarySectionActive && (
    SITE_PRIMARY_NAV_ITEMS.some((item) => isSiteNavActive(location.pathname, item))
    || ['/publish', '/mailbox'].includes(location.pathname)
  );

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMoreOpenPath(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  useEffect(() => {
    document.body.classList.toggle('mobile-more-open', moreOpen);
    return () => document.body.classList.remove('mobile-more-open');
  }, [moreOpen]);

  return (
    <nav
      className="tab-bar"
      role="tablist"
      aria-label="主导航"
    >
      <div className="tab-bar-shell" role="presentation">
        <div
          className="tab-indicator"
          aria-hidden="true"
          style={{
            width: '20%',
            transform: `translateX(${(moreActive ? 4 : activeIndex) * 100}%)`,
          }}
        >
          <div className="tab-indicator-pill" />
        </div>
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
            end={tab.path === '/'}
          >
            {({ isActive }) => (
              <>
                <span className="tab-icon">{getIcon(tab.iconKey, isActive)}</span>
                <span className="tab-label">{isZh ? tab.labelZh : tab.labelEn}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          className={`tab-item tab-item-more ${moreOpen || moreActive ? 'active' : ''}`}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          aria-label={isZh ? '更多导航' : 'More navigation'}
          onClick={() => setMoreOpenPath(moreOpen ? null : location.pathname)}
        >
          <span className="tab-icon">{moreOpen ? <X size={24} /> : <Menu size={24} />}</span>
          <span className="tab-label">{isZh ? '更多' : 'More'}</span>
        </button>
      </div>
      {moreOpen ? (
        <>
          <button
            type="button"
            className="mobile-more-backdrop"
            aria-label={isZh ? '关闭导航菜单' : 'Close navigation menu'}
            onClick={() => setMoreOpenPath(null)}
          />
          <section
            id="mobile-more-menu"
            className="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label={isZh ? '全部功能' : 'All features'}
          >
            <div className="mobile-more-menu__heading">{isZh ? '全部功能' : 'All features'}</div>
            <div className="mobile-more-menu__grid">
              {SITE_PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isSiteNavActive(location.pathname, item);
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={`mobile-more-menu__item${active ? ' mobile-more-menu__item--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMoreOpenPath(null)}
                  >
                    <Icon size={21} strokeWidth={2} aria-hidden="true" />
                    <span>{isZh ? item.labelZh : item.labelEn}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mobile-more-menu__actions">
              <Link to="/publish" onClick={() => setMoreOpenPath(null)}>
                <PenLine size={19} aria-hidden="true" />{isZh ? '发布中心' : 'Publish'}
              </Link>
              <Link to="/mailbox" onClick={() => setMoreOpenPath(null)}>
                <Bell size={19} aria-hidden="true" />{isZh ? '消息' : 'Messages'}
              </Link>
              {isAdmin ? (
                <Link to="/myzone/admin" onClick={() => setMoreOpenPath(null)}>
                  <Shield size={19} aria-hidden="true" />{isZh ? '管理员后台' : 'Admin Panel'}
                </Link>
              ) : null}
              <button type="button" onClick={() => setLang(isZh ? 'en' : 'zh')}>
                <Languages size={19} aria-hidden="true" />{isZh ? '切换为英文' : 'Switch to Chinese'}
              </button>
            </div>
          </section>
        </>
      ) : null}
    </nav>
  );
}

function getIcon(label, filled) {
  const size = 24;
  const common = { width: size, height: size, viewBox: '0 0 24 24' };
  if (filled) {
    switch (label) {
      case 'TreeHole':
        return (
          <svg {...common} fill="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'Eat':
        return (
          <svg {...common} fill="currentColor">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1V8zM2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <circle cx="6" cy="2.5" r="1.5" />
            <circle cx="10" cy="2.5" r="1.5" />
            <circle cx="14" cy="2.5" r="1.5" />
          </svg>
        );
      case 'Square':
        return (
          <svg {...common} fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
      case 'My Zone':
        return (
          <svg {...common} fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        );
      default:
        return null;
    }
  }
  switch (label) {
    case 'TreeHole':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'Eat':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      );
    case 'Square':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
    case 'My Zone':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

export default TabBar;
export { TABS };
