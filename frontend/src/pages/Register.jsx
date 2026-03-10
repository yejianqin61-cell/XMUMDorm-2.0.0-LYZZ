import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import { sendVerificationCode, register as apiRegister } from '../api/auth';
import './Register.css';

const ROLE_STUDENT = 'student';
const ROLE_MERCHANT = 'merchant';

/** 注册页：学生 / 商家角色选择，学生用邮箱+用户名+密码，商家用用户名+密码+邀请码 */
function Register() {
  const [role, setRole] = useState(ROLE_STUDENT);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);

  const navigate = useNavigate();

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === ROLE_STUDENT) {
      const em = email.trim();
      const un = username.trim();
      if (!em || !un || !password) {
        showMsg('请填写邮箱、用户名和密码 Please fill in email, username and password', 'error');
        return;
      }
      if (!em.endsWith('@xmu.edu.my')) {
        showMsg('邮箱必须是 @xmu.edu.my 格式 Email must be @xmu.edu.my', 'error');
        return;
      }
      if (password.length < 6) {
        showMsg('密码长度至少 6 个字符 Password at least 6 characters', 'error');
        return;
      }
    } else {
      const un = username.trim();
      const code = inviteCode.trim();
      if (!un || !password || !code) {
        showMsg('请填写用户名、密码和邀请码 Please fill in username, password and invite code', 'error');
        return;
      }
      if (password.length < 6) {
        showMsg('密码长度至少 6 个字符 Password at least 6 characters', 'error');
        return;
      }
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const body =
        role === ROLE_STUDENT
          ? {
              role: ROLE_STUDENT,
              email: email.trim(),
              username: username.trim(),
              password,
              verification_code: verificationCode.trim(),
            }
          : {
              role: ROLE_MERCHANT,
              username: username.trim(),
              password,
              invite_code: inviteCode.trim(),
            };

      const result = await apiRegister(body);
      if (result.success) {
        if (result.token) localStorage.setItem('token', result.token);
        if (result.data) localStorage.setItem('user', JSON.stringify(result.data));
        showMsg('注册成功，正在跳转… Register success, redirecting…', 'success');
        setTimeout(() => navigate('/', { replace: true }), 500);
      } else {
        showMsg(result.message || getApiErrorMessage(), 'error');
      }
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-box">
        <h1 className="register-title">XMUMDorm 厦马小筑</h1>
        <p className="register-subtitle">注册 Register</p>

        <div className="register-role-tabs" role="tablist" aria-label="选择注册类型">
          <button
            type="button"
            role="tab"
            aria-selected={role === ROLE_STUDENT}
            className={`register-role-tab ${role === ROLE_STUDENT ? 'is-active' : ''}`}
            onClick={() => setRole(ROLE_STUDENT)}
          >
            学生 Student
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === ROLE_MERCHANT}
            className={`register-role-tab ${role === ROLE_MERCHANT ? 'is-active' : ''}`}
            onClick={() => setRole(ROLE_MERCHANT)}
          >
            商家 Merchant
          </button>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {role === ROLE_STUDENT ? (
            <>
              <div className="register-field">
                <label htmlFor="reg-email">邮箱 Email（@xmu.edu.my）</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="请输入学校邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-username">用户名 Username</label>
                <input
                  id="reg-username"
                  type="text"
                  placeholder="请输入用户名 Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-pwd">密码 Password（至少 6 位 at least 6）</label>
                <input
                  id="reg-pwd"
                  type="password"
                  placeholder="请输入密码 Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-code">验证码 Verification code</label>
                <div className="register-code-row">
                  <input
                    id="reg-code"
                    type="text"
                    placeholder="请输入邮箱验证码 Enter email code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="register-btn-code"
                    disabled={loading || sendingCode || codeCountdown > 0 || !email.trim().endsWith('@xmu.edu.my')}
                    onClick={async () => {
                      const em = email.trim();
                      if (!em) {
                        showMsg('请先填写邮箱 Please fill in email first', 'error');
                        return;
                      }
                      if (!em.endsWith('@xmu.edu.my')) {
                        showMsg('邮箱必须是 @xmu.edu.my 格式 Email must be @xmu.edu.my', 'error');
                        return;
                      }
                      try {
                        setSendingCode(true);
                        const res = await sendVerificationCode(em);
                        if (res.success) {
                          showMsg(res.message || '验证码已发送，请查收邮箱 Code sent', 'success');
                          setCodeCountdown(60);
                          const timer = setInterval(() => {
                            setCodeCountdown((prev) => {
                              if (prev <= 1) {
                                clearInterval(timer);
                                return 0;
                              }
                              return prev - 1;
                            });
                          }, 1000);
                        } else {
                          showMsg(res.message || '验证码发送失败 Code send failed', 'error');
                        }
                      } catch (err) {
                        showMsg(getApiErrorMessage(err), 'error');
                      } finally {
                        setSendingCode(false);
                      }
                    }}
                  >
                    {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '发送中…' : '发送验证码'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="register-role-hint">商家账号需使用邀请码注册。Merchant sign-up requires an invite code.</p>
              <div className="register-field">
                <label htmlFor="reg-merchant-username">用户名 Username</label>
                <input
                  id="reg-merchant-username"
                  type="text"
                  placeholder="请输入用户名 Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-merchant-pwd">密码 Password（至少 6 位 at least 6）</label>
                <input
                  id="reg-merchant-pwd"
                  type="password"
                  placeholder="请输入密码 Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-invite">邀请码 Invite code</label>
                <input
                  id="reg-invite"
                  type="text"
                  placeholder="请输入商家邀请码 Enter invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {message.text && (
            <p className={`register-message register-message-${message.type}`}>{message.text}</p>
          )}

          <button type="submit" className="register-btn register-btn-primary" disabled={loading}>
            {loading ? '注册中… Registering…' : '注册 Register'}
          </button>
        </form>

        <p className="register-footer">
          已有账号？Already have an account? <Link to="/login">立即登录 Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
