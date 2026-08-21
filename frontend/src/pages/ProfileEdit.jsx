import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { updateAvatar, updateProfileInfo } from '@shared/api/users';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './ProfileEdit.css';

function ProfileEdit() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { user, isLoggedIn, displayAvatar, updateProfile, refreshUser, isAdmin } = useAuth();
  const [form, setForm] = useState({ nickname: '', college: '', grade: '', major: '', show_college: true, show_grade: true, show_major: false });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      nickname: user?.nickname ?? user?.username ?? '',
      college: user?.college ?? '', grade: user?.grade ?? '', major: user?.major ?? '',
      show_college: user?.show_college !== false, show_grade: user?.show_grade !== false, show_major: !!user?.show_major,
    });
    setAvatarUrl(displayAvatar ?? '');
  }, [user, displayAvatar]);

  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: { pathname: '/myzone/profile' } }} />;

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2200);
  };
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAvatarLoading(true);
    try {
      await updateAvatar(file);
      await refreshUser();
      setAvatarUrl(URL.createObjectURL(file));
      showMsg(isZh ? '头像已更新' : 'Avatar updated');
    } catch (error) { showMsg(getApiErrorMessage(error), 'error'); }
    finally { setAvatarLoading(false); }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.nickname.trim();
    if (!name) return showMsg(isZh ? '请输入昵称' : 'Please enter a nickname', 'error');
    if (!isAdmin && ['admin', 'xmumdorm_official'].includes(name.toLowerCase())) return showMsg(isZh ? '该昵称不可用' : 'This nickname is reserved.', 'error');
    setSaving(true);
    try {
      await updateProfileInfo({ nickname: name, college: form.college.trim(), grade: form.grade.trim(), major: form.major.trim(), show_college: form.show_college, show_grade: form.show_grade, show_major: form.show_major });
      await refreshUser();
      updateProfile({ username: name });
      showMsg(isZh ? '已保存' : 'Saved');
    } catch (error) { showMsg(getApiErrorMessage(error), 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="profile-edit-page">
      <main className="profile-edit-content">
        <button type="button" className="profile-edit-back" onClick={() => navigate('/myzone')}>‹ {isZh ? '我的' : 'My Zone'}</button>
        <h1>{isZh ? '编辑资料' : 'Edit profile'}</h1>
        <form className="profile-edit-form" onSubmit={handleSave}>
          <section className="profile-edit-section">
            <h2>{isZh ? '头像' : 'Avatar'}</h2>
            <div className="profile-edit-field profile-edit-field--compact">
              <div className="profile-edit-avatar-row">
                <label className="profile-edit-avatar-wrap">
                  <input type="file" accept="image/*" onChange={handleAvatarFile} className="profile-edit-avatar-input" disabled={avatarLoading} />
                  {avatarLoading ? <div className="profile-edit-avatar profile-edit-avatar-loading">{isZh ? '上传中' : 'Uploading...'}</div> : avatarUrl ? <img src={avatarUrl} alt="" className="profile-edit-avatar" /> : <img src="/default-avatar.svg" alt="" className="profile-edit-avatar profile-edit-avatar-default" />}
                </label>
                <span className="profile-edit-avatar-hint">{avatarLoading ? (isZh ? '上传中' : 'Uploading...') : (isZh ? '点击更换头像' : 'Change avatar')}</span>
              </div>
            </div>
          </section>
          <section className="profile-edit-section">
            <h2>{isZh ? '基本资料' : 'Basic information'}</h2>
            <div className="profile-edit-grid">
              <Field label={isZh ? '昵称' : 'Nickname'} id="profile-nickname" placeholder={isZh ? '输入昵称' : 'Enter nickname'} value={form.nickname} onChange={(value) => change('nickname', value)} />
              <Field label={isZh ? '学院' : 'College'} id="profile-college" placeholder={isZh ? '例如：计算机学院' : 'e.g. School of Computing'} value={form.college} onChange={(value) => change('college', value)} />
              <Field label={isZh ? '年级' : 'Grade'} id="profile-grade" placeholder="e.g. 2024" value={form.grade} onChange={(value) => change('grade', value)} />
              <Field label={isZh ? '专业' : 'Major'} id="profile-major" placeholder={isZh ? '例如：计算机科学' : 'e.g. Computer Science'} value={form.major} onChange={(value) => change('major', value)} />
            </div>
          </section>
          <section className="profile-edit-section">
            <h2>{isZh ? '公开范围' : 'Visibility'}</h2>
            <div className="profile-edit-privacy">
              <Toggle checked={form.show_college} onChange={(checked) => change('show_college', checked)}>{isZh ? '显示学院' : 'Show college'}</Toggle>
              <Toggle checked={form.show_grade} onChange={(checked) => change('show_grade', checked)}>{isZh ? '显示年级' : 'Show grade'}</Toggle>
              <Toggle checked={form.show_major} onChange={(checked) => change('show_major', checked)}>{isZh ? '显示专业' : 'Show major'}</Toggle>
            </div>
          </section>
          {message.text && <p className={`profile-edit-message profile-edit-message-${message.type}`}>{message.text}</p>}
          <div className="profile-edit-actionbar">
            <button type="button" className="profile-edit-cancel" onClick={() => navigate('/myzone')}>{isZh ? '取消' : 'Cancel'}</button>
            <button type="submit" className="profile-edit-save" disabled={saving}>{saving ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存' : 'Save changes')}</button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, id, placeholder, value, onChange }) {
  return <div className="profile-edit-field"><label htmlFor={id}>{label}</label><input id={id} type="text" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Toggle({ checked, onChange, children }) {
  return <label className="profile-edit-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{children}</span></label>;
}

export default ProfileEdit;
