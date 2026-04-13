import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../context/ToastContext';
import { getApiErrorMessage } from '../utils/apiError';
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
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sid = studentIdOrEmail.trim();
    if (!sid || !password) {
      Toast.error('请填写邮箱/用户名和密码 Please fill in email / username and password');
      return;
    }
    setLoading(true);
    try {
      const result = await login(sid, password);
      if (result.success) {
        Toast.success('登录成功，正在跳转… Login success, redirecting…');
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
      <div className="flex w-full max-w-md flex-col items-center gap-1 sm:gap-2">
        <MascotHero />
        <LoginCard>
          <AuthCardBrandHeader title="XMUMDorm" />
          <form className="mt-0 space-y-4" onSubmit={handleSubmit}>
          <InputField
            id="login-account"
            label="School email"
            type="text"
            placeholder="enter your email"
            value={studentIdOrEmail}
            onChange={(e) => setStudentIdOrEmail(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
          <InputField
            id="login-pwd"
            label="Password"
            type="password"
            placeholder="enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          <div className="space-y-3 pt-1">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '登录中…' : 'login'}
            </Button>
            <div className="flex justify-end pr-0.5">
              <Button type="button" variant="skip" disabled={loading} onClick={handleSkip}>
                skip
              </Button>
            </div>
          </div>
        </form>
        </LoginCard>
      </div>

      <nav className="flex w-full max-w-md flex-col gap-2.5 px-1" aria-label="其他入口">
        <Button as={Link} variant="ghost" to="/register">
          Register
        </Button>
        <Button as={Link} variant="ghost" to="/reset-password">
          Reset password
        </Button>
      </nav>
    </AuthPageShell>
  );
}

export default Login;
