import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendResetCode, resetPassword } from '../api/auth';
import { getApiErrorMessage } from '../utils/apiError';
import AuthPageShell from '../components/auth/AuthPageShell';
import MascotHero from '../components/auth/MascotHero';
import LoginCard from '../components/auth/LoginCard';
import InputField from '../components/auth/InputField';
import Button from '../components/auth/Button';

/** 重置密码：与注册页相同的一屏紧凑布局（dense + compact，无整页滚动） */
function ResetPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);

  const navigate = useNavigate();

  const showMsg = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSendCode = async () => {
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
      const res = await sendResetCode(em);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const em = email.trim();
    if (!em || !code.trim() || !newPassword) {
      showMsg('Please fill in email, code and new password', 'error');
      return;
    }
    if (!em.endsWith('@xmu.edu.my')) {
      showMsg('Email must be @xmu.edu.my', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showMsg('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await resetPassword({
        email: em,
        verification_code: code.trim(),
        new_password: newPassword,
      });
      if (res.success) {
        showMsg(res.message || 'Password reset success', 'success');
        setTimeout(() => navigate('/login', { replace: true }), 800);
      } else {
        showMsg(res.message || 'Password reset failed', 'error');
      }
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell dense>
      <div className="flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center">
        <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-1">
          <MascotHero compact />
          <LoginCard className="!border-0 flex w-full max-w-none flex-1 flex-col rounded-[1.25rem] px-6 pb-5 pt-5 sm:px-12 sm:pb-7 sm:pt-7 min-h-[28rem] sm:min-h-[30rem]">
          <form className="flex flex-1 flex-col space-y-4" onSubmit={handleSubmit}>
            <InputField
              id="reset-email"
              label="School email (@xmu.edu.my)"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              inputClassName="py-4 text-base"
            />

            <div className="space-y-1">
              <label
                htmlFor="reset-code"
                className="block pl-0.5 text-[10px] font-semibold leading-tight text-zinc-800/80"
              >
                Verification code
              </label>
              <div className="flex gap-1.5">
                <input
                  id="reset-code"
                  type="text"
                  placeholder="Enter the code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-4 text-base text-zinc-900 shadow-inner outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:ring-sky-500/50 disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={
                    loading || sendingCode || codeCountdown > 0 || !email.trim().endsWith('@xmu.edu.my')
                  }
                  onClick={handleSendCode}
                  className="shrink-0 rounded-full border border-white/50 bg-gradient-to-r from-sky-500 to-cyan-400 px-2 py-1.5 text-[10px] font-bold text-zinc-900 shadow-md disabled:opacity-45 sm:px-2.5 sm:text-xs"
                >
                  {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '…' : 'Send'}
                </button>
              </div>
            </div>

            <InputField
              id="reset-pwd"
              label="New password (≥ 6)"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              inputClassName="py-4 text-base"
            />

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

            <div className="mt-auto mb-10 pt-2 sm:mb-12">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="!py-3 !text-sm font-bold sm:!py-3.5"
              >
                {loading ? 'Submitting…' : 'Confirm'}
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

export default ResetPassword;
