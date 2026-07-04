import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getSiteShellMeta } from './siteShellMeta';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteAside({ children = null, className = '' }) {
  const location = useLocation();
  const { lang } = useLanguage();
  const { isAdmin } = useAuth();
  const isZh = lang !== 'en';
  const meta = getSiteShellMeta(location.pathname, { isZh, isAdmin });

  return (
    <aside className={joinClassNames('site-web-shell__aside', className)}>
      <div className="site-web-shell__panel site-web-shell__panel--aside">
        {children || (
          <>
            <div className="site-web-shell__panel-head">
              <p className="site-web-shell__panel-eyebrow">Secondary Aside</p>
              <h2 className="site-web-shell__panel-title">{isZh ? '辅助信息区' : 'Secondary aside'}</h2>
            </div>
            <div className="site-web-shell__aside-stack">
              {Array.isArray(meta.asideSections) && meta.asideSections.map((section) => (
                <div key={section.title} className="site-web-shell__placeholder-card">
                  <strong>{section.title}</strong>
                  <span>{section.description}</span>
                </div>
              ))}
              {Array.isArray(meta.quickLinks) && meta.quickLinks.length > 0 ? (
                <div className="site-web-shell__placeholder-card">
                  <strong>{isZh ? '快捷入口' : 'Quick links'}</strong>
                  <div className="site-web-shell__aside-links">
                    {meta.quickLinks.map((link) => (
                      <Link key={link.to} to={link.to} className="site-web-shell__aside-link">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
