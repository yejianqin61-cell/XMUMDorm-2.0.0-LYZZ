import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deactivateMyAccount } from '@shared/api/users';

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
  return <div className="page-shell"><div className="page-content"><h1>{isZh ? '设置' : 'Settings'}</h1><p>{isZh ? '管理个人资料、语言与账号' : 'Manage your profile, language and account'}</p><button type="button" onClick={() => navigate('/myzone/profile')}>{isZh ? '编辑资料' : 'Edit profile'}</button><div><button type="button" onClick={() => setLang('zh')}>中文</button> / <button type="button" onClick={() => setLang('en')}>English</button></div><button type="button" onClick={() => { logout(); navigate('/', { replace: true }); }}>{isZh ? '退出登录' : 'Log out'}</button><button type="button" onClick={deactivate}>{isZh ? '注销账号' : 'Deactivate account'}</button></div></div>;
}
