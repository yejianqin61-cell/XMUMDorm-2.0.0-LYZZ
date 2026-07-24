import { Link, useNavigate } from 'react-router-dom';
import { Languages, Mail, PenLine, Shield } from 'lucide-react';
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
              <div className="site-web-shell__brand-copy">
                <strong>Dorm</strong>
              </div>
            </Link>
            <div className="site-web-shell__header-meta">
              <button
                type="button"
                className="site-web-shell__header-action site-web-shell__lang-switch"
                onClick={() => setLang(isZh ? 'en' : 'zh')}
                aria-label={isZh ? '切换为英文' : 'Switch to Chinese'}
                title={isZh ? '切换为英文' : 'Switch to Chinese'}
              >
                <Languages size={20} strokeWidth={2} aria-hidden="true" />
                <span className="site-web-shell__header-action-label">{isZh ? 'EN' : '中'}</span>
              </button>
              <Link to="/publish" className="site-web-shell__header-action" title={isZh ? '发布中心' : 'Publish'}>
                <PenLine size={20} strokeWidth={2} aria-hidden="true" />
                <span className="site-web-shell__header-action-label">{isZh ? '发布' : 'Publish'}</span>
              </Link>
              <button
                type="button"
                className="site-web-shell__header-action"
                onClick={() => navigate('/mailbox')}
                title={isZh ? '信箱' : 'Mailbox'}
              >
                <Mail size={20} strokeWidth={2} aria-hidden="true" />
                <span className="site-web-shell__header-action-label">{isZh ? '信箱' : 'Mailbox'}</span>
              </button>
              {isAdmin ? (
                <Link to="/myzone/admin" className="site-web-shell__header-action" title={isZh ? '管理后台' : 'Admin'}>
                  <Shield size={20} strokeWidth={2} aria-hidden="true" />
                  <span className="site-web-shell__header-action-label">{isZh ? '后台' : 'Admin'}</span>
                </Link>
              ) : null}
              <Link to="/myzone" className="site-web-shell__profile-entry" aria-label={isZh ? '个人中心' : 'My Zone'}>
                {displayAvatar ? (
                  <img className="site-web-shell__profile-avatar" src={displayAvatar} alt={displayName} />
                ) : (
                  <span className="site-web-shell__profile-avatar site-web-shell__profile-avatar--fallback" role="img" aria-label={displayName}>
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
