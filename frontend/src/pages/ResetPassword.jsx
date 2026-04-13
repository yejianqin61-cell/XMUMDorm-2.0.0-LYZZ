import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendResetCode, resetPassword } from '../api/auth';
import { getApiErrorMessage } from '../utils/apiError';
import AuthPageShell from '../components/auth/AuthPageShell';
import AuthCardBrandHeader from '../components/auth/AuthCardBrandHeader';
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
      showMsg('请先填写邮箱 Please fill in email first', 'error');
      return;
    }
    if (!em.endsWith('@xmu.edu.my')) {
      showMsg('邮箱必须是 @xmu.edu.my 格式 Email must be @xmu.edu.my', 'error');
      return;
    }
    try {
      setSendingCode(true);
      const res = await sendResetCode(em);
      if (res.success) {
        showMsg(res.message || '重置验证码已发送，请查收邮箱 Code sent', 'success');
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
        showMsg(res.message || '发送失败 Failed to send code', 'error');
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
      showMsg('请填写邮箱、验证码和新密码 Please fill in email, code and new password', 'error');
      return;
    }
    if (!em.endsWith('@xmu.edu.my')) {
      showMsg('邮箱必须是 @xmu.edu.my 格式 Email must be @xmu.edu.my', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showMsg('新密码长度至少 6 个字符 Password at least 6 characters', 'error');
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
        showMsg(res.message || '密码重置成功，请使用新密码登录 Password reset success', 'success');
        setTimeout(() => navigate('/login', { replace: true }), 800);
      } else {
        showMsg(res.message || '密码重置失败 Password reset failed', 'error');
      }
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell dense>
      <div className="flex min-h-0 w-full max-w-md flex-col items-center gap-1">
        <MascotHero compact />
        <LoginCard className="max-w-[min(100%,22rem)] rounded-[1.25rem] px-3.5 pb-3 pt-2.5 sm:max-w-md sm:px-4 sm:pb-3 sm:pt-3">
          <AuthCardBrandHeader title="XMUMDorm" compact />
          <p className="mb-1 mt-0 text-center text-[11px] font-semibold text-zinc-800 sm:text-xs">
            重置密码 Reset password
          </p>

          <form className="mt-0 space-y-2" onSubmit={handleSubmit}>
            <InputField
              id="reset-email"
              label="School email (@xmu.edu.my)"
              type="email"
              placeholder="enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              compact
            />

            <div className="space-y-1">
              <label
                htmlFor="reset-code"
                className="block pl-0.5 text-[10px] font-semibold leading-tight text-zinc-800/80"
              >
                验证码 Verification code
              </label>
              <div className="flex gap-1.5">
                <input
                  id="reset-code"
                  type="text"
                  placeholder="enter code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  className="min-w-0 flex-1 rounded-full border-0 bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-inner outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:ring-sky-500/50 disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={
                    loading || sendingCode || codeCountdown > 0 || !email.trim().endsWith('@xmu.edu.my')
                  }
                  onClick={handleSendCode}
                  className="shrink-0 rounded-full border border-white/50 bg-gradient-to-r from-sky-500 to-cyan-400 px-2 py-1.5 text-[10px] font-bold text-zinc-900 shadow-md disabled:opacity-45 sm:px-2.5 sm:text-xs"
                >
                  {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '…' : '发送'}
                </button>
              </div>
            </div>

            <InputField
              id="reset-pwd"
              label="新密码 New password（≥6）"
              type="password"
              placeholder="enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              compact
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

            <div className="pt-0.5">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="!py-2 !text-sm font-bold sm:!py-2.5"
              >
                {loading ? '提交中…' : '确认重置 Confirm'}
              </Button>
            </div>
          </form>
        </LoginCard>
      </div>

      <nav className="mt-2 flex w-full max-w-[min(100%,22rem)] flex-col px-0.5 sm:max-w-md" aria-label="返回登录">
        <Button as={Link} variant="ghost" to="/login" className="!py-2 !text-xs">
          返回登录 Back to login
        </Button>
      </nav>
    </AuthPageShell>
  );
}

export default ResetPassword;
