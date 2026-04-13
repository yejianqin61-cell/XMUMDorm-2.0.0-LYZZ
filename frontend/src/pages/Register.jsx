import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../utils/apiError';
import { sendVerificationCode, register as apiRegister } from '../api/auth';
import AuthPageShell from '../components/auth/AuthPageShell';
import AuthCardBrandHeader from '../components/auth/AuthCardBrandHeader';
import MascotHero from '../components/auth/MascotHero';
import LoginCard from '../components/auth/LoginCard';
import InputField from '../components/auth/InputField';
import Button from '../components/auth/Button';

const ROLE_STUDENT = 'student';
const ROLE_MERCHANT = 'merchant';

/** 注册页：与登录页同一套视觉（渐变 + 玻璃卡片 + 组件化） */
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
        showMsg(result.message || getApiErrorMessage({}), 'error');
      }
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabBase =
    'flex-1 rounded-full py-2.5 text-sm font-semibold transition border-0 cursor-pointer';
  const tabIdle = 'bg-transparent text-zinc-600';
  const tabActive = 'bg-white text-teal-700 shadow-md shadow-teal-900/10';

  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center gap-1 sm:gap-2">
        <MascotHero />
        <LoginCard>
          <AuthCardBrandHeader title="XMUMDorm" />
          <p className="mb-3 mt-0 text-center text-sm font-semibold text-zinc-800">Register</p>

        <div
          className="mb-5 flex gap-1 rounded-full border border-white/50 bg-white/25 p-1 backdrop-blur-sm"
          role="tablist"
          aria-label="选择注册类型"
        >
          <button
            type="button"
            role="tab"
            aria-selected={role === ROLE_STUDENT}
            className={`${tabBase} ${role === ROLE_STUDENT ? tabActive : tabIdle}`}
            onClick={() => setRole(ROLE_STUDENT)}
          >
            学生 Student
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === ROLE_MERCHANT}
            className={`${tabBase} ${role === ROLE_MERCHANT ? tabActive : tabIdle}`}
            onClick={() => setRole(ROLE_MERCHANT)}
          >
            商家 Merchant
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {role === ROLE_STUDENT ? (
            <>
              <InputField
                id="reg-email"
                label="邮箱 Email (@xmu.edu.my)"
                type="email"
                placeholder="学校邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
              <InputField
                id="reg-username"
                label="用户名 Username"
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
              <InputField
                id="reg-pwd"
                label="密码 Password（≥6）"
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <div className="space-y-1.5">
                <label htmlFor="reg-code" className="block pl-1 text-xs font-semibold text-zinc-800/80">
                  验证码 Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="reg-code"
                    type="text"
                    placeholder="邮箱验证码"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={loading}
                    className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-3 text-[15px] text-zinc-900 shadow-inner outline-none ring-2 ring-transparent focus:ring-sky-500/50 disabled:opacity-60"
                  />
                  <button
                    type="button"
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
                          showMsg(res.message || '验证码已发送 Code sent', 'success');
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
                          showMsg(res.message || '发送失败 Send failed', 'error');
                        }
                      } catch (err) {
                        showMsg(getApiErrorMessage(err), 'error');
                      } finally {
                        setSendingCode(false);
                      }
                    }}
                    className="shrink-0 rounded-full border border-white/50 bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-2 text-xs font-bold text-zinc-900 shadow-md disabled:opacity-45"
                  >
                    {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '…' : '发送'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-3 py-2 text-xs leading-relaxed text-zinc-700">
                商家账号需邀请码。Merchant sign-up requires an invite code.
              </p>
              <InputField
                id="reg-merchant-username"
                label="用户名 Username"
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
              <InputField
                id="reg-merchant-pwd"
                label="密码 Password（≥6）"
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <InputField
                id="reg-invite"
                label="邀请码 Invite code"
                type="text"
                placeholder="商家邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                autoComplete="off"
                disabled={loading}
              />
            </>
          )}

          {message.text ? (
            <p
              className={`rounded-xl px-3 py-2 text-center text-xs font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-100/90 text-emerald-900'
                  : 'bg-red-50/95 text-red-800'
              }`}
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <div className="pt-1">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '注册中…' : 'register'}
            </Button>
          </div>
        </form>
        </LoginCard>
      </div>

      <nav className="flex w-full max-w-md flex-col gap-2.5 px-1" aria-label="返回登录">
        <Button as={Link} variant="ghost" to="/login">
          已有账号 · Login
        </Button>
      </nav>
    </AuthPageShell>
  );
}

export default Register;
