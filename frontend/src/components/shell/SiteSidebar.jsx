import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ShellNavItem from './ShellNavItem';
import { SITE_PRIMARY_NAV_ITEMS, isSiteNavActive } from './siteShellNav';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteSidebar({ children = null, className = '' }) {
  const location = useLocation();
  const { lang } = useLanguage();
  const { isAdmin } = useAuth();
  const isZh = lang !== 'en';
  const primaryItems = SITE_PRIMARY_NAV_ITEMS.map((item) => ({
    ...item,
    label: isZh ? item.labelZh : item.labelEn,
  }));

  return (
    <aside className={joinClassNames('site-web-shell__sidebar', className)}>
      <div className="site-web-shell__panel site-web-shell__panel--sidebar">
        {children || (
          <>
            <div className="site-web-shell__panel-head">
              <p className="site-web-shell__panel-eyebrow">Primary Navigation</p>
              <h2 className="site-web-shell__panel-title">{isZh ? '主站导航' : 'Explore modules'}</h2>
            </div>
            <nav className="site-web-shell__nav" aria-label="Site sections">
              {primaryItems.map((item) => (
                <ShellNavItem
                  key={item.key}
                  to={item.to}
                  label={item.label}
                  accent={item.accent}
                  active={isSiteNavActive(location.pathname, item)}
                  caption={item.to === '/myzone'
                    ? (isZh ? '个人中心与常用工具' : 'Profile and tools')
                    : (isZh ? '进入模块首页' : 'Open module home')}
                />
              ))}
            </nav>
            {isAdmin ? (
              <div className="site-web-shell__sidebar-admin">
                <p className="site-web-shell__sidebar-admin-label">
                  {isZh ? '管理入口' : 'Admin access'}
                </p>
                <ShellNavItem
                  to="/myzone/admin"
                  label={isZh ? '管理员后台' : 'Admin Panel'}
                  accent="var(--accent-admin)"
                  active={location.pathname.startsWith('/myzone/admin')}
                  caption={isZh ? '内容、公告与系统治理' : 'Content and system ops'}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
