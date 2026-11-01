import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import { Shield } from 'lucide-react';
import ShellNavItem from './ShellNavItem';
import { SITE_FRIENDLY_LINK_ITEMS, SITE_PRIMARY_NAV_ITEMS, isSiteNavActive } from './siteShellNav';

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
  const friendlyLinks = SITE_FRIENDLY_LINK_ITEMS.map((item) => ({
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
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={isSiteNavActive(location.pathname, item)}
                />
              ))}
            </nav>
            <section className="site-web-shell__sidebar-group" aria-labelledby="site-friendly-links-title">
              <h2 className="site-web-shell__sidebar-group-title" id="site-friendly-links-title">
                {isZh ? '友情链接' : 'Useful links'}
              </h2>
              <nav aria-label={isZh ? '校方系统链接' : 'University system links'}>
                <div className="site-web-shell__nav">
                  {friendlyLinks.map((item) => (
                    <ShellNavItem
                      key={item.key}
                      href={item.href}
                      label={item.label}
                      Icon={item.icon}
                    />
                  ))}
                </div>
              </nav>
            </section>
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
