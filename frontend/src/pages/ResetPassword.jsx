import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendResetCode, resetPassword } from '../api/auth';
import { getApiErrorMessage } from '../utils/apiError';
import './ResetPassword.css';

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
    <div className="reset-page">
      <div className="reset-box">
        <h1 className="reset-title">XMUMDorm 厦马小筑</h1>
        <p className="reset-subtitle">重置密码 Reset password</p>

        <form className="reset-form" onSubmit={handleSubmit}>
          <div className="reset-field">
            <label htmlFor="reset-email">邮箱 Email（@xmu.edu.my）</label>
            <input
              id="reset-email"
              type="email"
              placeholder="请输入学校邮箱 Enter school email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="reset-field">
            <label htmlFor="reset-code">验证码 Verification code</label>
            <div className="reset-code-row">
              <input
                id="reset-code"
                type="text"
                placeholder="请输入验证码 Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="reset-btn-code"
                disabled={loading || sendingCode || codeCountdown > 0 || !email.trim().endsWith('@xmu.edu.my')}
                onClick={handleSendCode}
              >
                {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? '发送中…' : '发送验证码'}
              </button>
            </div>
          </div>
          <div className="reset-field">
            <label htmlFor="reset-pwd">新密码 New password（至少 6 位）</label>
            <input
              id="reset-pwd"
              type="password"
              placeholder="请输入新密码 Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {message.text && (
            <p className={`reset-message reset-message-${message.type}`}>{message.text}</p>
          )}

          <button type="submit" className="reset-btn reset-btn-primary" disabled={loading}>
            {loading ? '提交中… Submitting…' : '确认重置 Confirm'}
          </button>
        </form>

        <p className="reset-footer">
          想起密码了？Remembered your password? <Link to="/login">返回登录 Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;

