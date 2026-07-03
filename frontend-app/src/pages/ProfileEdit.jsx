import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateAvatar, updateProfileInfo } from '@shared/api/users';
import { getApiErrorMessage } from '../utils/apiError';
import './ProfileEdit.css';

function ProfileEdit() {
  const { user, isLoggedIn, displayAvatar, updateProfile, refreshUser, isAdmin } = useAuth();
  const [form, setForm] = useState({
    nickname: '',
    college: '',
    grade: '',
    major: '',
    show_college: true,
    show_grade: true,
    show_major: false,
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      nickname: user?.nickname ?? user?.username ?? '',
      college: user?.college ?? '',
      grade: user?.grade ?? '',
      major: user?.major ?? '',
      show_college: user?.show_college !== false,
      show_grade: user?.show_grade !== false,
      show_major: !!user?.show_major,
    });
    setAvatarUrl(displayAvatar ?? '');
  }, [user, displayAvatar]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/myzone/profile' } }} />;
  }

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2200);
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

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.nickname.trim();
    if (!name) {
      showMsg('Please enter username', 'error');
      return;
    }
    const lower = name.toLowerCase();
    const forbidden = ['admin', 'xmumdorm_official'];
    if (!isAdmin && forbidden.includes(lower)) {
      showMsg('This nickname is reserved.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateProfileInfo({
        nickname: name,
        college: form.college.trim(),
        grade: form.grade.trim(),
        major: form.major.trim(),
        show_college: form.show_college,
        show_grade: form.show_grade,
        show_major: form.show_major,
      });
      await refreshUser();
      updateProfile({ username: name });
      showMsg('Saved');
    } catch (err) {
      showMsg(getApiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
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
                <div className="profile-edit-avatar profile-edit-avatar-loading">Uploading...</div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="" className="profile-edit-avatar" />
              ) : (
                <img src="/default-avatar.svg" alt="" className="profile-edit-avatar profile-edit-avatar-default" />
              )}
            </label>
            <span className="profile-edit-avatar-hint">{avatarLoading ? 'Uploading...' : 'Tap to change avatar'}</span>
          </div>
        </div>

        <div className="profile-edit-grid">
          <div className="profile-edit-field">
            <label htmlFor="profile-username">Nickname</label>
            <input
              id="profile-username"
              type="text"
              placeholder="Enter nickname"
              value={form.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
            />
          </div>

          <div className="profile-edit-field">
            <label htmlFor="profile-college">College</label>
            <input
              id="profile-college"
              type="text"
              placeholder="e.g. School of Computing"
              value={form.college}
              onChange={(e) => handleChange('college', e.target.value)}
            />
          </div>

          <div className="profile-edit-field">
            <label htmlFor="profile-grade">Grade</label>
            <input
              id="profile-grade"
              type="text"
              placeholder="e.g. 2024"
              value={form.grade}
              onChange={(e) => handleChange('grade', e.target.value)}
            />
          </div>

          <div className="profile-edit-field">
            <label htmlFor="profile-major">Major</label>
            <input
              id="profile-major"
              type="text"
              placeholder="e.g. Computer Science"
              value={form.major}
              onChange={(e) => handleChange('major', e.target.value)}
            />
          </div>
        </div>

        <div className="profile-edit-privacy">
          <div className="profile-edit-privacy__header">
            <h3>Visibility</h3>
            <p>Choose which campus identity fields can be shown on your public page.</p>
          </div>
          <label className="profile-edit-toggle">
            <input
              type="checkbox"
              checked={form.show_college}
              onChange={(e) => handleChange('show_college', e.target.checked)}
            />
            <span>Show college</span>
          </label>
          <label className="profile-edit-toggle">
            <input
              type="checkbox"
              checked={form.show_grade}
              onChange={(e) => handleChange('show_grade', e.target.checked)}
            />
            <span>Show grade</span>
          </label>
          <label className="profile-edit-toggle">
            <input
              type="checkbox"
              checked={form.show_major}
              onChange={(e) => handleChange('show_major', e.target.checked)}
            />
            <span>Show major</span>
          </label>
        </div>

        {message.text ? (
          <p className={`profile-edit-message profile-edit-message-${message.type}`}>
            {message.text}
          </p>
        ) : null}

        <button type="submit" className="profile-edit-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default ProfileEdit;
