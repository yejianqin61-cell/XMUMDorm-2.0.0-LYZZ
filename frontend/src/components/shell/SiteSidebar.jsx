import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';
import ShellNavItem from './ShellNavItem';
import { SITE_PRIMARY_NAV_ITEMS, isSiteNavActive } from './siteShellNav';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteSidebar({ children = null, className = '' }) {
  const location = useLocation();
  const { isZh } = useLanguage();
  const { isAdmin } = useAuth();
  const primaryItems = SITE_PRIMARY_NAV_ITEMS.map((item) => ({
    ...item,
    label: isZh ? item.labelZh : item.labelEn,
  }));

  return (
    <aside className={joinClassNames('site-web-shell__sidebar', className)}>
      <div className="site-web-shell__panel site-web-shell__panel--sidebar">
        {children || (
          <>
            <nav className="site-web-shell__nav" aria-label={isZh ? '站点分区' : 'Site sections'}>
              {primaryItems.map((item) => (
                <ShellNavItem
                  key={item.key}
                  to={item.to}
                  label={item.label}
                  Icon={item.icon}
                  active={isSiteNavActive(location.pathname, item)}
                />
              ))}
            </nav>
            {isAdmin ? (
              <div className="site-web-shell__sidebar-admin">
                <ShellNavItem
                  to="/myzone/admin"
                  label={isZh ? '管理员后台' : 'Admin Panel'}
                  Icon={Shield}
                  active={location.pathname.startsWith('/myzone/admin')}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
