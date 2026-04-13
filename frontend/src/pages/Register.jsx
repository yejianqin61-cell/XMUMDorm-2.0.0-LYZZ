import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../utils/apiError';
import { sendVerificationCode, register as apiRegister } from '../api/auth';
import AuthPageShell from '../components/auth/AuthPageShell';
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
        showMsg('Please fill in email, username and password', 'error');
        return;
      }
      if (!em.endsWith('@xmu.edu.my')) {
        showMsg('Email must be @xmu.edu.my', 'error');
        return;
      }
      if (password.length < 6) {
        showMsg('Password must be at least 6 characters', 'error');
        return;
      }
    } else {
      const un = username.trim();
      const code = inviteCode.trim();
      if (!un || !password || !code) {
        showMsg('Please fill in username, password and invite code', 'error');
        return;
      }
      if (password.length < 6) {
        showMsg('Password must be at least 6 characters', 'error');
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
        showMsg('Register success, redirecting…', 'success');
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
    'flex-1 rounded-full py-1 text-[11px] font-semibold leading-tight transition border-0 cursor-pointer sm:py-1.5 sm:text-xs';
  const tabIdle = 'bg-transparent text-zinc-600';
  const tabActive = 'bg-white text-teal-700 shadow-sm shadow-teal-900/10';

  return (
    <AuthPageShell dense>
      <div className="flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center">
        <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-1">
          <MascotHero compact />
          <LoginCard className="!border-0 flex w-full max-w-none flex-1 flex-col rounded-[1.25rem] px-6 pb-5 pt-5 sm:px-12 sm:pb-7 sm:pt-7 min-h-[28rem] sm:min-h-[30rem]">
            <div
              className="mb-3 flex w-full gap-0.5 rounded-full border border-white/50 bg-white/25 p-0.5 backdrop-blur-sm"
              role="tablist"
              aria-label="Select account type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={role === ROLE_STUDENT}
                className={`${tabBase} ${role === ROLE_STUDENT ? tabActive : tabIdle}`}
                onClick={() => setRole(ROLE_STUDENT)}
              >
                Student
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === ROLE_MERCHANT}
                className={`${tabBase} ${role === ROLE_MERCHANT ? tabActive : tabIdle}`}
                onClick={() => setRole(ROLE_MERCHANT)}
              >
                Merchant
              </button>
            </div>

          <form className="flex flex-1 flex-col space-y-3" onSubmit={handleSubmit}>
          {role === ROLE_STUDENT ? (
            <>
              <InputField
                id="reg-email"
                label="School email (@xmu.edu.my)"
                type="email"
                placeholder="Enter your school email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
              <InputField
                id="reg-username"
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
              <InputField
                id="reg-pwd"
                label="Password (≥ 6)"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <div className="space-y-1">
                <label
                  htmlFor="reg-code"
                  className="block pl-0.5 text-[10px] font-semibold leading-tight text-zinc-800/80"
                >
                  Verification code
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="reg-code"
                    type="text"
                    placeholder="Enter the code"
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
                        showMsg('Please fill in email first', 'error');
                        return;
                      }
                      if (!em.endsWith('@xmu.edu.my')) {
                        showMsg('Email must be @xmu.edu.my', 'error');
                        return;
                      }
                      try {
                        setSendingCode(true);
                        const res = await sendVerificationCode(em);
                        if (res.success) {
                          showMsg(res.message || 'Code sent', 'success');
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
                          showMsg(res.message || 'Failed to send code', 'error');
                        }
                      } catch (err) {
                        showMsg(getApiErrorMessage(err), 'error');
                      } finally {
                        setSendingCode(false);
                      }
                    }}
                    className="shrink-0 rounded-full border border-white/50 bg-gradient-to-r from-sky-500 to-cyan-400 px-2 py-1.5 text-[10px] font-bold text-zinc-900 shadow-md disabled:opacity-45 sm:px-2.5 sm:text-xs"
                  >
                    {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="rounded-lg border border-emerald-200/60 bg-emerald-50/80 px-2 py-1 text-[10px] leading-snug text-zinc-700 sm:text-[11px]">
                Merchant sign-up requires an invite code.
              </p>
              <InputField
                id="reg-merchant-username"
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
              <InputField
                id="reg-merchant-pwd"
                label="Password (≥ 6)"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <InputField
                id="reg-invite"
                label="Invite code"
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                autoComplete="off"
                disabled={loading}
              />
            </>
          )}

          {message.text ? (
            <p
              className={`rounded-lg px-2 py-1 text-center text-[10px] font-medium leading-snug sm:text-[11px] ${
                message.type === 'success'
                  ? 'bg-emerald-100/90 text-emerald-900'
                  : 'bg-red-50/95 text-red-800'
              }`}
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <div className="mt-auto mb-2 pt-2 sm:mb-3">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="!py-2 !text-sm font-bold sm:!py-2.5"
            >
              {loading ? 'Registering…' : 'Register'}
            </Button>
          </div>
        </form>
          </LoginCard>
        </div>
      </div>

      <nav className="mt-1 flex w-full max-w-4xl flex-col px-0.5 pb-1" aria-label="Back to login">
        <Button as={Link} variant="ghost" to="/login" className="!py-2 !text-xs">
          Back to Login
        </Button>
      </nav>
    </AuthPageShell>
  );
}

export default Register;
