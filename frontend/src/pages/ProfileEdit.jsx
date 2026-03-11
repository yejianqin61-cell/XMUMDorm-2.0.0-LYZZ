import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateAvatar, updateProfileInfo } from '../api/users';
import { getApiErrorMessage } from '../utils/apiError';
import './ProfileEdit.css';

/** 修改个人信息：头像（调 API）、用户名（本地保存，后端暂无昵称接口） */
function ProfileEdit() {
  const { user, isLoggedIn, displayName, displayAvatar, updateProfile, refreshUser, isAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    setUsername(user?.nickname ?? user?.username ?? '');
    setAvatarUrl(displayAvatar ?? '');
  }, [user?.nickname, user?.username, displayAvatar]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/myzone/profile' } }} />;
  }

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAvatarLoading(true);
    try {
      await updateAvatar(file);
      await refreshUser();
      setAvatarUrl(URL.createObjectURL(file));
      showMsg('Avatar updated');
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setMessage({ text: 'Please enter username', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    const lower = name.toLowerCase();
    const forbidden = ['admin', 'xmumdorm_official'];
    if (!isAdmin && forbidden.includes(lower)) {
      setMessage({ text: 'This nickname is reserved.', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2500);
      return;
    }
    try {
      // 调后端接口更新昵称（实际写入 users.nickname）
      await updateProfileInfo({ nickname: name });
      await refreshUser();
      updateProfile({ username: name });
      showMsg('Saved');
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    }
  };

  return (
    <div className="profile-edit-page">
      <form className="profile-edit-form" onSubmit={handleSave}>
        <div className="profile-edit-field">
          <label>Avatar</label>
          <div className="profile-edit-avatar-row">
            <label className="profile-edit-avatar-wrap">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="profile-edit-avatar-input"
                disabled={avatarLoading}
              />
              {avatarLoading ? (
                <div className="profile-edit-avatar profile-edit-avatar-loading">Uploading…</div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="" className="profile-edit-avatar" />
              ) : (
                <img
                  src="/default-avatar.svg"
                  alt=""
                  className="profile-edit-avatar profile-edit-avatar-default"
                />
              )}
            </label>
            <span className="profile-edit-avatar-hint">{avatarLoading ? 'Uploading…' : 'Tap to change avatar'}</span>
          </div>
        </div>

        <div className="profile-edit-field">
          <label htmlFor="profile-username">Username</label>
          <input
            id="profile-username"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {message.text && (
          <p className={`profile-edit-message profile-edit-message-${message.type}`}>
            {message.text}
          </p>
        )}

        <button type="submit" className="profile-edit-btn">
          Save
        </button>
      </form>
    </div>
  );
}

export default ProfileEdit;
