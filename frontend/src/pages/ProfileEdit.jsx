import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProfileEdit.css';

/** 修改个人信息：头像、用户名（登录后可见） */
function ProfileEdit() {
  const { user, isLoggedIn, displayName, displayAvatar, updateProfile } = useAuth();
  const [username, setUsername] = useState(() => displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(() => displayAvatar || '');
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/myzone/profile' } }} />;
  }

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    updateProfile({ avatar: url });
    showMsg('头像已更新 Avatar updated');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setMessage({ text: '请输入用户名 Please enter username', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    updateProfile({ username: name });
    showMsg('已保存 Saved');
  };

  return (
    <div className="profile-edit-page">
      <form className="profile-edit-form" onSubmit={handleSave}>
        <div className="profile-edit-field">
          <label>头像</label>
          <div className="profile-edit-avatar-row">
            <label className="profile-edit-avatar-wrap">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="profile-edit-avatar-input"
              />
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="profile-edit-avatar" />
              ) : (
                <img
                  src="/default-avatar.svg"
                  alt=""
                  className="profile-edit-avatar profile-edit-avatar-default"
                />
              )}
            </label>
            <span className="profile-edit-avatar-hint">点击更换头像 Tap to change avatar</span>
          </div>
        </div>

        <div className="profile-edit-field">
          <label htmlFor="profile-username">用户名 Username</label>
          <input
            id="profile-username"
            type="text"
            placeholder="请输入用户名 Enter username"
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
          保存 Save
        </button>
      </form>
    </div>
  );
}

export default ProfileEdit;
