import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteHeader({ children = null, className = '' }) {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { displayName, displayAvatar, isAdmin } = useAuth();
  const isZh = lang !== 'en';
  const avatarInitial = (displayName || 'D').slice(0, 1).toUpperCase();

  return (
    <header className={joinClassNames('site-web-shell__header', className)}>
      <div className="site-web-shell__header-inner">
        {children || (
          <>
            <Link to="/about" className="site-web-shell__brand">
              <span className="site-web-shell__brand-mark" aria-hidden="true">XM</span>
              <div className="site-web-shell__brand-copy">
                <strong>XMUMDorm</strong>
                <span>{isZh ? '校园生活主站' : 'Campus Web Portal'}</span>
              </div>
            </Link>
            <div className="site-web-shell__header-meta">
              <div className="site-web-shell__lang-switch" role="group" aria-label={isZh ? '语言切换' : 'Language switch'}>
                <button
                  type="button"
                  className={joinClassNames('site-web-shell__lang-btn', isZh && 'site-web-shell__lang-btn--active')}
                  onClick={() => setLang('zh')}
                >
                  中
                </button>
                <span className="site-web-shell__lang-sep">/</span>
                <button
                  type="button"
                  className={joinClassNames('site-web-shell__lang-btn', !isZh && 'site-web-shell__lang-btn--active')}
                  onClick={() => setLang('en')}
                >
                  EN
                </button>
              </div>
              <Link to="/posts/search" className="site-web-shell__header-chip">
                {isZh ? '搜索内容' : 'Search'}
              </Link>
              <Link to="/publish" className="site-web-shell__header-chip site-web-shell__header-chip--primary">
                {isZh ? '发布中心' : 'Publish'}
              </Link>
              <button
                type="button"
                className="site-web-shell__header-chip"
                onClick={() => navigate('/mailbox')}
              >
                {isZh ? '信箱' : 'Mailbox'}
              </button>
              {isAdmin ? (
                <Link to="/myzone/admin" className="site-web-shell__header-chip">
                  {isZh ? '管理后台' : 'Admin'}
                </Link>
              ) : null}
              <Link to="/myzone" className="site-web-shell__profile-entry">
                {displayAvatar ? (
                  <img className="site-web-shell__profile-avatar" src={displayAvatar} alt={displayName} />
                ) : (
                  <span className="site-web-shell__profile-avatar site-web-shell__profile-avatar--fallback" aria-hidden="true">
                    {avatarInitial}
                  </span>
                )}
                <span className="site-web-shell__profile-name">{displayName}</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
