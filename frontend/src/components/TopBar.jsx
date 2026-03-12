import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/** 微信风格顶部栏：标题居中，可选左侧返回、右侧语言切换+信箱 */
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
          <span className="top-bar-title-decor top-bar-title-decor-left" aria-hidden />
          <span className="top-bar-title-text">{title}</span>
          <span className="top-bar-title-decor top-bar-title-decor-right" aria-hidden />
        </h1>
        <button
          type="button"
          className="top-bar-mailbox"
          onClick={() => navigate('/mailbox')}
          aria-label="信箱 Mailbox"
        >
          <MailboxIcon />
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

function MailboxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
    </svg>
  );
}

export default TopBar;
