import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { useLanguage } from '../context/LanguageContext';
import { sendVerificationCode, register as apiRegister } from '@shared/api/auth';
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
  const { isZh } = useLanguage();

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
        showMsg(isZh ? '请填写邮箱、用户名和密码' : 'Enter your email, username, and password', 'error');
        return;
      }
      if (!em.endsWith('@xmu.edu.my')) {
        showMsg(isZh ? '邮箱须以 @xmu.edu.my 结尾' : 'Email must end in @xmu.edu.my', 'error');
        return;
      }
      if (password.length < 6) {
        showMsg(isZh ? '密码至少需要 6 位' : 'Password must be at least 6 characters', 'error');
        return;
      }
    } else {
      const un = username.trim();
      const code = inviteCode.trim();
      if (!un || !password || !code) {
        showMsg(isZh ? '请填写用户名、密码和邀请码' : 'Enter your username, password, and invite code', 'error');
        return;
      }
      if (password.length < 6) {
        showMsg(isZh ? '密码至少需要 6 位' : 'Password must be at least 6 characters', 'error');
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
        showMsg(isZh ? '注册成功，正在跳转…' : 'Registration successful. Redirecting…', 'success');
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
    'relative z-10 flex-1 rounded-full py-2 text-[12px] font-semibold leading-tight transition';

  return (
    <AuthPageShell dense>
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center"
      >
        <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-3">
          <MascotHero compact />
          <LoginCard className="!border-0 flex w-full max-w-none flex-1 flex-col rounded-[1.25rem] px-6 pb-5 pt-5 sm:px-12 sm:pb-7 sm:pt-7 min-h-[28rem] sm:min-h-[30rem]">
            <div
              className="relative mb-4 flex w-full gap-0 rounded-full bg-slate-100 p-1"
              role="tablist"
              aria-label={isZh ? '选择账号类型' : 'Select account type'}
            >
              <motion.div
                layoutId="register-role-pill"
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm ring-1 ring-slate-200"
                animate={{ x: role === ROLE_STUDENT ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                aria-hidden
              />
              <button
                type="button"
                role="tab"
                aria-selected={role === ROLE_STUDENT}
                className={`${tabBase} ${role === ROLE_STUDENT ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setRole(ROLE_STUDENT)}
              >
                {isZh ? '学生' : 'Student'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === ROLE_MERCHANT}
                className={`${tabBase} ${role === ROLE_MERCHANT ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setRole(ROLE_MERCHANT)}
              >
                {isZh ? '商家' : 'Merchant'}
              </button>
            </div>

          <form className="flex flex-1 flex-col space-y-3" onSubmit={handleSubmit}>
          {role === ROLE_STUDENT ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="block pl-0.5 text-xs font-medium tracking-wide text-slate-700">
                  {isZh ? '学校邮箱' : 'School email'}
                </label>
                <div className="relative">
                  <input
                    id="reg-email"
                    type="text"
                    placeholder={isZh ? '输入邮箱前缀' : 'Enter your email prefix'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-[7.5rem] text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                  {!email.includes('@') && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[14px] font-medium text-slate-300">
                      @xmu.edu.my
                    </span>
                  )}
                </div>
                <p className="pl-0.5 text-[11px] font-medium text-slate-400">{isZh ? '请使用以 @xmu.edu.my 结尾的校园邮箱' : 'Use your campus email ending with @xmu.edu.my'}</p>
              </div>
              <InputField
                id="reg-username"
                label={isZh ? '用户名' : 'Username'}
                type="text"
                placeholder={isZh ? '输入用户名' : 'Enter your username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
              <InputField
                id="reg-pwd"
                label={isZh ? '密码（至少 6 位）' : 'Password (min. 6 characters)'}
                type="password"
                placeholder={isZh ? '至少 6 位' : 'At least 6 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <div className="space-y-1">
                <label
                  htmlFor="reg-code"
                  className="block pl-0.5 text-xs font-medium tracking-wide text-slate-700"
                >
                  {isZh ? '验证码' : 'Verification code'}
                </label>
                <div className="relative">
                  <input
                    id="reg-code"
                    type="text"
                    placeholder={isZh ? '输入验证码' : 'Enter the code'}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-24 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={loading || sendingCode || codeCountdown > 0 || !email.trim().endsWith('@xmu.edu.my')}
                    onClick={async () => {
                      const em = email.trim();
                      if (!em) {
                        showMsg(isZh ? '请先填写邮箱' : 'Enter your email first', 'error');
                        return;
                      }
                      if (!em.endsWith('@xmu.edu.my')) {
                        showMsg(isZh ? '邮箱须以 @xmu.edu.my 结尾' : 'Email must end in @xmu.edu.my', 'error');
                        return;
                      }
                      try {
                        setSendingCode(true);
                        const res = await sendVerificationCode(em);
                        if (res.success) {
                          showMsg(res.message || (isZh ? '验证码已发送' : 'Code sent'), 'success');
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
                          showMsg(res.message || (isZh ? '验证码发送失败' : 'Failed to send code'), 'error');
                        }
                      } catch (err) {
                        showMsg(getApiErrorMessage(err), 'error');
                      } finally {
                        setSendingCode(false);
                      }
                    }}
                    className="absolute inset-y-0 right-2 my-2 rounded-lg px-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-45"
                  >
                    {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '…' : (isZh ? '发送' : 'Send')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600 ring-1 ring-slate-200">
                {isZh ? '商家注册需要邀请码。' : 'Merchant registration requires an invite code.'}
              </p>
              <InputField
                id="reg-merchant-username"
                label={isZh ? '用户名' : 'Username'}
                type="text"
                placeholder={isZh ? '输入用户名' : 'Enter your username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
              <InputField
                id="reg-merchant-pwd"
                label={isZh ? '密码（至少 6 位）' : 'Password (min. 6 characters)'}
                type="password"
                placeholder={isZh ? '至少 6 位' : 'At least 6 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <InputField
                id="reg-invite"
                label={isZh ? '邀请码' : 'Invite code'}
                type="text"
                placeholder={isZh ? '输入邀请码' : 'Enter invite code'}
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

          <div className="mt-auto mb-4 pt-2 sm:mb-5">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="!py-3 !text-[15px]"
            >
              {loading ? (isZh ? '注册中…' : 'Registering…') : (isZh ? '注册' : 'Register')}
            </Button>
          </div>
        </form>
          </LoginCard>
        </div>
      </Motion.div>

      <nav className="mt-3 shrink-0 flex w-full max-w-4xl flex-col px-0.5 pb-1" aria-label={isZh ? '返回登录' : 'Back to login'}>
        <Button as={Link} variant="skip" to="/login" className="!py-2 !text-[13px]">
          {isZh ? '返回登录' : 'Back to login'}
        </Button>
      </nav>
    </AuthPageShell>
  );
}

export default Register;
