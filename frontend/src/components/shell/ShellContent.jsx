import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getSiteShellMeta } from './siteShellMeta';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ShellContent({ children = null, className = '' }) {
  const location = useLocation();
  const { lang } = useLanguage();
  const { isAdmin } = useAuth();
  const isZh = lang !== 'en';
  const meta = getSiteShellMeta(location.pathname, { isZh, isAdmin });

  return (
    <main className={joinClassNames('site-web-shell__content', className)}>
      <div className="site-web-shell__content-inner">
        <div className="site-web-shell__viewport">
          <div className="site-web-shell__viewport-hero">
            <div className="site-web-shell__viewport-copy">
              <p className="site-web-shell__panel-eyebrow">{meta.eyebrow}</p>
              <h1 className="site-web-shell__content-title">{meta.title}</h1>
              <p className="site-web-shell__content-description">{meta.description}</p>
            </div>
            {Array.isArray(meta.chips) && meta.chips.length > 0 ? (
              <div className="site-web-shell__viewport-chips">
                {meta.chips.map((chip) => (
                  <span key={chip} className="site-web-shell__viewport-chip">{chip}</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="site-web-shell__viewport-body">
            {children || (
              <div className="site-web-shell__panel site-web-shell__panel--content">
                <div className="site-web-shell__panel-head">
                  <p className="site-web-shell__panel-eyebrow">Main Viewport</p>
                  <h2 className="site-web-shell__panel-title">
                    {isZh ? '主内容容器占位' : 'Viewport placeholder'}
                  </h2>
                </div>
                <p className="site-web-shell__content-description">
                  {isZh
                    ? '后续列表页、详情页、表单页和工作台页都会落在这个主内容区中。'
                    : 'Future list, detail, form, and dashboard pages will land inside this viewport.'}
                </p>
                {Array.isArray(meta.quickLinks) && meta.quickLinks.length > 0 ? (
                  <div className="site-web-shell__viewport-links">
                    {meta.quickLinks.map((link) => (
                      <Link key={link.to} to={link.to} className="site-web-shell__viewport-link">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
