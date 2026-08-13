import { useState } from 'react';
import { ChevronRight, Languages, LogOut, UserRound, UserX } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deactivateMyAccount } from '@shared/api/users';

export default function Settings() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { isLoggedIn, logout } = useAuth();
  const isZh = lang !== 'en';
  const [deactivating, setDeactivating] = useState(false);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/myzone/settings' } }} />;
  }

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };
  const handleDeactivate = async () => {
    const first = window.confirm(isZh ? '注销后将立即退出登录，且无法再次登录此账号。是否继续？' : 'You will be signed out immediately and cannot sign in to this account again. Continue?');
    if (!first) return;
    const second = window.confirm(isZh ? '请再次确认：确定注销账号吗？' : 'Please confirm again: deactivate this account?');
    if (!second) return;
    setDeactivating(true);
    try { await deactivateMyAccount(); logout(); navigate('/', { replace: true }); }
    catch (error) { window.alert(error?.message || (isZh ? '注销失败，请稍后重试' : 'Could not deactivate the account. Please try again later.')); }
    finally { setDeactivating(false); }
  };

  return <div className="h-full w-full bg-[#F9FAFB]"><div className="h-full overflow-y-auto px-4 pb-[calc(var(--tabbar-height)+var(--safe-bottom)+24px)] pt-6">
    <div className="mb-5 flex items-start justify-between"><div><h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{isZh ? '设置' : 'Settings'}</h1><p className="mt-1 text-[13px] font-medium text-slate-400">{isZh ? '管理个人资料、语言与账号' : 'Manage your profile, language and account'}</p></div><button type="button" onClick={() => navigate(-1)} className="text-[13px] font-medium text-slate-500">{isZh ? '返回' : 'Back'}</button></div>
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm"><SettingRow icon={<UserRound className="h-5 w-5" />} title={isZh ? '编辑资料' : 'Edit profile'} onClick={() => navigate('/myzone/profile')} /><div className="border-t border-slate-100" /><div className="flex items-center justify-between px-4 py-4"><span className="flex items-center gap-3 text-[14px] font-semibold text-slate-900"><Languages className="h-5 w-5 text-slate-500" />{isZh ? '语言' : 'Language'}</span><div className="flex items-center gap-2 text-[13px]"><button type="button" onClick={() => setLang('zh')} aria-pressed={lang === 'zh'} className={lang === 'zh' ? 'font-semibold text-slate-900' : 'text-slate-400'}>中文</button><span className="text-slate-200">/</span><button type="button" onClick={() => setLang('en')} aria-pressed={lang === 'en'} className={lang === 'en' ? 'font-semibold text-slate-900' : 'text-slate-400'}>English</button></div></div></section>
    <section className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm"><SettingRow icon={<LogOut className="h-5 w-5" />} title={isZh ? '退出登录' : 'Log out'} onClick={handleLogout} /><div className="border-t border-red-50" /><SettingRow danger icon={<UserX className="h-5 w-5" />} title={isZh ? '注销账号' : 'Deactivate account'} onClick={handleDeactivate} disabled={deactivating} /></section>
  </div></div>;
}

function SettingRow({ icon, title, onClick, danger = false, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`flex w-full items-center justify-between px-4 py-4 text-left disabled:opacity-50 ${danger ? 'text-red-600' : 'text-slate-900'}`}><span className="flex items-center gap-3 text-[14px] font-semibold">{icon}{title}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>;
}
