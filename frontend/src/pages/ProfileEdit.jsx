import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import FormPageLayout from '../components/templates/FormPageLayout';
import { useAuth } from '../context/AuthContext';
import { updateAvatar, updateProfileInfo } from '@shared/api/users';
import { getApiErrorMessage } from '@shared/utils/apiError';
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

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAvatarLoading(true);
    try {
      await updateAvatar(file);
      await refreshUser();
      setAvatarUrl(URL.createObjectURL(file));
      showMsg('Avatar updated');
    } catch (error) {
      showMsg(getApiErrorMessage(error), 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
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
    } catch (error) {
      showMsg(getApiErrorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const profileMeta = [
    { key: 'visibility', label: `${Number(form.show_college) + Number(form.show_grade) + Number(form.show_major)} fields visible` },
    { key: 'avatar', label: avatarUrl ? 'Avatar ready' : 'Avatar default' },
    { key: 'mode', label: 'Profile settings' },
  ];

  return (
    <div className="profile-edit-page">
      <FormPageLayout
        className="profile-edit-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow="Personal Profile"
            title="Edit your campus profile"
            description="Keep the editable fields, avatar upload and visibility choices intact, but organize the page into a clearer settings-style form layout."
            backTo="/myzone"
            backLabel="Back"
            meta={profileMeta}
          />
        )}
        notice={(
          <Card className="profile-edit-notice-card" padding="lg">
            <SectionHeader
              title="Before you save"
              description="Profile changes update your public campus identity card. Visibility toggles only affect whether those fields are shown to others."
            />
          </Card>
        )}
        sections={(
          <form className="profile-edit-form" onSubmit={handleSave}>
            <Card className="profile-edit-section-card" padding="lg">
              <SectionHeader
                title="Avatar"
                description="Upload a cleaner portrait or illustration to make your profile easier to recognize."
              />
              <div className="profile-edit-field profile-edit-field--compact">
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
                  <div className="profile-edit-avatar-copy">
                    <span className="profile-edit-avatar-hint">{avatarLoading ? 'Uploading...' : 'Tap to change avatar'}</span>
                    <span className="profile-edit-avatar-subhint">Square images or clear portraits work best for profile cards.</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="profile-edit-section-card" padding="lg">
              <SectionHeader
                title="Basic information"
                description="These fields shape the core identity block shown across your profile and related community surfaces."
              />
              <div className="profile-edit-grid">
                <div className="profile-edit-field">
                  <label htmlFor="profile-username">Nickname</label>
                  <input
                    id="profile-username"
                    type="text"
                    placeholder="Enter nickname"
                    value={form.nickname}
                    onChange={(event) => handleChange('nickname', event.target.value)}
                  />
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-college">College</label>
                  <input
                    id="profile-college"
                    type="text"
                    placeholder="e.g. School of Computing"
                    value={form.college}
                    onChange={(event) => handleChange('college', event.target.value)}
                  />
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-grade">Grade</label>
                  <input
                    id="profile-grade"
                    type="text"
                    placeholder="e.g. 2024"
                    value={form.grade}
                    onChange={(event) => handleChange('grade', event.target.value)}
                  />
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-major">Major</label>
                  <input
                    id="profile-major"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={form.major}
                    onChange={(event) => handleChange('major', event.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="profile-edit-section-card" padding="lg">
              <SectionHeader
                title="Visibility"
                description="Choose which campus identity fields appear on your public page."
              />
              <div className="profile-edit-privacy">
                <label className="profile-edit-toggle">
                  <input
                    type="checkbox"
                    checked={form.show_college}
                    onChange={(event) => handleChange('show_college', event.target.checked)}
                  />
                  <span>Show college</span>
                </label>
                <label className="profile-edit-toggle">
                  <input
                    type="checkbox"
                    checked={form.show_grade}
                    onChange={(event) => handleChange('show_grade', event.target.checked)}
                  />
                  <span>Show grade</span>
                </label>
                <label className="profile-edit-toggle">
                  <input
                    type="checkbox"
                    checked={form.show_major}
                    onChange={(event) => handleChange('show_major', event.target.checked)}
                  />
                  <span>Show major</span>
                </label>
              </div>
            </Card>

            {message.text ? (
              <p className={`profile-edit-message profile-edit-message-${message.type}`}>
                {message.text}
              </p>
            ) : null}
          </form>
        )}
        aside={(
          <>
            <Card className="profile-edit-aside-card" padding="lg">
              <SectionHeader
                title="Quick check"
                description="Use the right rail to quickly confirm whether the profile is ready to publish."
              />
              <div className="profile-edit-aside-list">
                <div className="profile-edit-aside-item">
                  <span>Nickname</span>
                  <strong>{form.nickname.trim() ? 'Ready' : 'Missing'}</strong>
                </div>
                <div className="profile-edit-aside-item">
                  <span>Avatar</span>
                  <strong>{avatarUrl ? 'Set' : 'Default'}</strong>
                </div>
                <div className="profile-edit-aside-item">
                  <span>Visible fields</span>
                  <strong>{Number(form.show_college) + Number(form.show_grade) + Number(form.show_major)}</strong>
                </div>
              </div>
            </Card>

            <Card className="profile-edit-aside-card" padding="lg">
              <SectionHeader
                title="What changes"
                description="These edits affect how your identity appears in profile surfaces and other campus-facing views."
              />
              <div className="profile-edit-aside-copy">
                <p>Your nickname updates the profile name shown to other users.</p>
                <p>Visibility settings only hide or reveal specific identity fields on the public page.</p>
              </div>
            </Card>
          </>
        )}
        actions={(
          <div className="profile-edit-actionbar">
            <div className="profile-edit-actionbar__inner">
              <Button variant="secondary" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default ProfileEdit;
