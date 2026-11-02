import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import { ChevronDown, Shield } from 'lucide-react';
import ShellNavItem from './ShellNavItem';
import { SITE_FRIENDLY_LINK_ITEMS, SITE_PRIMARY_NAV_ITEMS, isSiteNavActive } from './siteShellNav';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteSidebar({ children = null, className = '' }) {
  const location = useLocation();
  const { isZh } = useLanguage();
  const { isAdmin } = useAuth();
  const [friendlyLinksOpen, setFriendlyLinksOpen] = useState(false);
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
              <button
                className="site-web-shell__nav-item site-web-shell__sidebar-group-toggle"
                id="site-friendly-links-title"
                type="button"
                aria-expanded={friendlyLinksOpen}
                aria-controls="site-friendly-links-list"
                onClick={() => setFriendlyLinksOpen((open) => !open)}
              >
                <span className="site-web-shell__nav-label">{isZh ? '友情链接' : 'Useful links'}</span>
                <ChevronDown
                  className="site-web-shell__sidebar-group-chevron"
                  size={18}
                  aria-hidden="true"
                />
              </button>
              {friendlyLinksOpen ? (
                <nav id="site-friendly-links-list" aria-label={isZh ? '校方系统链接' : 'University system links'}>
                  <div className="site-web-shell__nav site-web-shell__sidebar-group-links">
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
              ) : null}
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
