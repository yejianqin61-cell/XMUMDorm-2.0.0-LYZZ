import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getApiErrorMessage } from '@shared/utils/apiError';
import AuthPageShell from '../components/auth/AuthPageShell';
import AuthCardBrandHeader from '../components/auth/AuthCardBrandHeader';
import MascotHero from '../components/auth/MascotHero';
import LoginCard from '../components/auth/LoginCard';
import InputField from '../components/auth/InputField';
import Button from '../components/auth/Button';

/** 登录页：手稿风格（渐变 + 玻璃卡片 + 组件化） */
function Login() {
  const [studentIdOrEmail, setStudentIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, skipLogin } = useAuth();
  const { isZh } = useLanguage();
  const { handleExpResponse } = useExpFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sid = studentIdOrEmail.trim();
    if (!sid || !password) {
      Toast.error(isZh ? '请填写邮箱或用户名和密码' : 'Enter your email or username and password');
      return;
    }
    setLoading(true);
    try {
      const result = await login(sid, password);
      if (result.success) {
        if (result.exp) handleExpResponse({ __exp: result.exp });
        Toast.success(isZh ? '登录成功，正在跳转…' : 'Login successful. Redirecting…');
        setTimeout(() => navigate(from, { replace: true }), 500);
      } else {
        Toast.error(result.message);
      }
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    skipLogin();
    navigate('/', { replace: true });
  };

  return (
    <AuthPageShell>
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-md flex-col items-center gap-3"
      >
        <MascotHero />
        <LoginCard>
          <AuthCardBrandHeader title="XMUMDorm" />
          <form className="mt-0 space-y-4" onSubmit={handleSubmit}>
          <InputField
            id="login-account"
            label={isZh ? '学校邮箱或用户名' : 'School email or username'}
            type="text"
            placeholder={isZh ? '输入邮箱或用户名' : 'Enter your email or username'}
            value={studentIdOrEmail}
            onChange={(e) => setStudentIdOrEmail(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
          <InputField
            id="login-pwd"
            label={isZh ? '密码' : 'Password'}
            type="password"
            placeholder={isZh ? '输入密码' : 'Enter your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          <div className="space-y-3 pt-1">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (isZh ? '登录中…' : 'Logging in…') : (isZh ? '登录' : 'Log in')}
            </Button>
            <div className="flex items-center justify-between pt-1 text-[13px] font-medium text-slate-500">
              <Link to="/register" className="hover:text-slate-900">
                {isZh ? '注册' : 'Register'}
              </Link>
              <Link to="/reset-password" className="hover:text-slate-900">
                {isZh ? '重置密码' : 'Reset password'}
              </Link>
              <button type="button" onClick={handleSkip} className="hover:text-slate-900" disabled={loading}>
                {isZh ? '暂不登录' : 'Skip'}
              </button>
            </div>
          </div>
        </form>
        </LoginCard>
      </Motion.div>
    </AuthPageShell>
  );
}

export default Login;
