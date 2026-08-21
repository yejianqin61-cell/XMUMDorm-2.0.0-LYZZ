import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deactivateMyAccount } from '@shared/api/users';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { isLoggedIn, logout } = useAuth();
  const isZh = lang !== 'en';
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: { pathname: '/myzone/settings' } }} />;
  const deactivate = async () => {
    if (!window.confirm(isZh ? '注销后将立即退出登录，且无法再次登录此账号。是否继续？' : 'You will be signed out immediately and cannot sign in again. Continue?')) return;
    if (!window.confirm(isZh ? '请再次确认：确定注销账号吗？' : 'Please confirm again: deactivate this account?')) return;
    await deactivateMyAccount();
    logout();
    navigate('/', { replace: true });
  };
  const Row = ({ children, onClick, danger = false }) => (
    <button type="button" className={`settings-row${danger ? ' settings-row--danger' : ''}`} onClick={onClick}>
      <span>{children}</span><span className="settings-row-chevron" aria-hidden="true">›</span>
    </button>
  );
  return (
    <div className="settings-page">
      <div className="settings-content">
        <button type="button" className="settings-back" onClick={() => navigate('/myzone')}>‹ {isZh ? '我的' : 'My Zone'}</button>
        <h1>{isZh ? '设置' : 'Settings'}</h1>
        <p className="settings-subtitle">{isZh ? '管理个人资料、语言与账号' : 'Manage your profile, language and account'}</p>
        <section className="settings-section">
          <h2>{isZh ? '个人' : 'Personal'}</h2>
          <div className="settings-group"><Row onClick={() => navigate('/myzone/profile')}>{isZh ? '编辑资料' : 'Edit profile'}</Row></div>
        </section>
        <section className="settings-section">
          <h2>{isZh ? '语言' : 'Language'}</h2>
          <div className="settings-group settings-language">
            <button type="button" className={isZh ? 'active' : ''} onClick={() => setLang('zh')}>中文</button>
            <button type="button" className={!isZh ? 'active' : ''} onClick={() => setLang('en')}>English</button>
          </div>
        </section>
        <section className="settings-section">
          <h2>{isZh ? '账号' : 'Account'}</h2>
          <div className="settings-group">
            <Row onClick={() => { logout(); navigate('/', { replace: true }); }}>{isZh ? '退出登录' : 'Log out'}</Row>
            <Row danger onClick={deactivate}>{isZh ? '注销账号' : 'Deactivate account'}</Row>
          </div>
        </section>
      </div>
    </div>
  );
}
