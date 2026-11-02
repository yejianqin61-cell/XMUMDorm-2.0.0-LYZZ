import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContextState';

/** 微信风格顶部栏：标题居中，可选左侧返回、右侧语言切换+消息 */
function TopBar({ title, showBack }) {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <div className="top-bar-left">
          {showBack ? (
            <button
              type="button"
              className="top-bar-back"
              onClick={() => navigate(-1)}
              aria-label="返回 Back"
            >
              <BackIcon />
            </button>
          ) : (
            <div className="top-bar-placeholder" />
          )}
          <div className="top-bar-lang" role="group" aria-label={isZh ? '语言切换' : 'Language switch'}>
            <button
              type="button"
              className={`top-bar-lang-btn ${isZh ? 'active' : ''}`}
              onClick={() => setLang('zh')}
            >
              中
            </button>
            <span className="top-bar-lang-sep">/</span>
            <button
              type="button"
              className={`top-bar-lang-btn ${!isZh ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
        <h1 className="top-bar-title">
          <span className="top-bar-title-text">{title}</span>
        </h1>
        <button
          type="button"
          className="top-bar-mailbox"
          onClick={() => navigate('/mailbox')}
          aria-label="消息 Messages"
        >
          <Bell size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export default TopBar;
