import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

/** 登录页：微信风格，学号/邮箱 + 密码；暂不登录可回主页 */
function Login() {
  const [studentIdOrEmail, setStudentIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const { login, skipLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sid = studentIdOrEmail.trim();
    if (!sid || !password) {
      showMsg('请填写学号/邮箱和密码 Please fill in student ID/email and password', 'error');
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await login(sid, password);
      if (result.success) {
        showMsg('登录成功，正在跳转… Login success, redirecting…', 'success');
        setTimeout(() => navigate(from, { replace: true }), 500);
      } else {
        showMsg(result.message || '登录失败 Login failed', 'error');
      }
    } catch (err) {
      showMsg('网络错误，请稍后重试 Network error, please try again later', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    skipLogin();
    navigate('/', { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-title">XMUMDorm 厦马小筑</h1>
        <p className="login-subtitle">登录 Login</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-sid">学号 / 邮箱 Student ID / Email</label>
            <input
              id="login-sid"
              type="text"
              placeholder="请输入学号或邮箱 Enter student ID or email"
              value={studentIdOrEmail}
              onChange={(e) => setStudentIdOrEmail(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-pwd">密码 Password</label>
            <input
              id="login-pwd"
              type="password"
              placeholder="请输入密码 Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {message.text && (
            <p className={`login-message login-message-${message.type}`}>{message.text}</p>
          )}

          <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
            {loading ? '登录中… Logging in…' : '登录 Login'}
          </button>

          <button
            type="button"
            className="login-btn login-btn-skip"
            onClick={handleSkip}
            disabled={loading}
          >
            暂不登录 Skip
          </button>
        </form>

        <p className="login-footer">
          还没有账号？No account? <Link to="/register">立即注册 Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
