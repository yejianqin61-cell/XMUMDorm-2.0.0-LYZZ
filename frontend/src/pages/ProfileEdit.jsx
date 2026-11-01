import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { updateAvatar, updateProfileInfo, getAcademicColleges, getAcademicProgrammes } from '@shared/api/users';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './ProfileEdit.css';

function ProfileEdit() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { user, isLoggedIn, displayAvatar, updateProfile, refreshUser, isAdmin } = useAuth();
  const [form, setForm] = useState({ nickname: '', college: '', grade: '', major: '', collegeId: '', programmeId: '', show_college: true, show_grade: true, show_major: false });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [directoryState, setDirectoryState] = useState('loading');
  const [programmeState, setProgrammeState] = useState('idle');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setDirectoryState('loading');
    getAcademicColleges().then(rows => { if (!cancelled) { setColleges(rows); setDirectoryState('ready'); } })
      .catch(() => { if (!cancelled) setDirectoryState('error'); });
    return () => { cancelled = true; };
  }, [isLoggedIn, retry]);
  useEffect(() => {
    let cancelled = false;
    setProgrammes([]);
    if (!form.collegeId) { setProgrammeState('idle'); return; }
    setProgrammeState('loading');
    getAcademicProgrammes(form.collegeId).then(rows => { if (!cancelled) { setProgrammes(rows); setProgrammeState('ready'); } })
      .catch(() => { if (!cancelled) setProgrammeState('error'); });
    return () => { cancelled = true; };
  }, [form.collegeId, retry]);

  useEffect(() => {
    setForm({
      nickname: user?.nickname ?? user?.username ?? '',
      collegeId: user?.collegeId ?? '', programmeId: user?.programmeId ?? '',
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
    if (directoryState !== 'ready' || programmeState === 'loading' || programmeState === 'error') return showMsg(isZh ? '请先加载学院目录' : 'Load the academic directory first', 'error');
    setSaving(true);
    try {
      await updateProfileInfo({ nickname: name, collegeId: form.collegeId || null, programmeId: form.programmeId || null, grade: form.grade.trim(), show_college: form.show_college, show_grade: form.show_grade, show_major: form.show_major });
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
              <div className="profile-edit-field"><label htmlFor="profile-college">{isZh ? '学院' : 'College'}</label>
                <select id="profile-college" value={form.collegeId} disabled={saving || directoryState !== 'ready'} onChange={e => setForm(prev => ({ ...prev, collegeId: e.target.value, programmeId: '' }))}>
                  <option value="">{isZh ? '暂不设置 / 请选择学院' : 'Not set / Select a college'}</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{isZh ? c.name : c.nameEn}</option>)}
                </select>
                {directoryState === 'loading' && <small role="status">{isZh ? '正在加载学院…' : 'Loading colleges…'}</small>}
                {directoryState === 'ready' && !colleges.length && <small>{isZh ? '暂无可选学院' : 'No colleges available'}</small>}
              </div>
              <Field label={isZh ? '年级' : 'Grade'} id="profile-grade" placeholder="e.g. 2024" value={form.grade} onChange={(value) => change('grade', value)} />
              <div className="profile-edit-field"><label htmlFor="profile-major">{form.collegeId === 'xmum-sfs' ? (isZh ? '预科课程（选填）' : 'Foundation course (optional)') : (isZh ? '专业（选填）' : 'Programme (optional)')}</label>
                <select id="profile-major" value={form.programmeId} disabled={saving || !form.collegeId || programmeState !== 'ready'} onChange={e => change('programmeId', e.target.value)}>
                  <option value="">{isZh ? '暂不选择专业' : 'No programme selected'}</option>
                  {programmes.map(p => <option key={p.id} value={p.id}>{isZh ? p.name : p.nameEn}</option>)}
                </select>
                <small>{programmeState === 'loading' ? (isZh ? '正在加载专业…' : 'Loading programmes…') : !form.collegeId ? (isZh ? '请先选择学院' : 'Select a college first') : programmes.length === 0 && programmeState === 'ready' ? (isZh ? '该学院暂无可选专业，可仅保存学院' : 'No programmes available; you may save the college only') : ''}</small>
              </div>
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
          {(directoryState === 'error' || programmeState === 'error') && <p role="alert" className="profile-edit-message profile-edit-message-error">{isZh ? '学院或专业目录加载失败。' : 'Unable to load academic directory.'} <button type="button" onClick={() => setRetry(n => n + 1)}>{isZh ? '重试' : 'Retry'}</button></p>}
          {!form.collegeId && <p className="profile-edit-academic-hint">{isZh ? '尚未选择有效学院，请重新选择。原有资料保留，不会自动猜测映射：' : 'Select a valid college. Existing text is preserved: '}{user?.college || '—'} / {user?.major || '—'}</p>}
          {message.text && <p className={`profile-edit-message profile-edit-message-${message.type}`}>{message.text}</p>}
          <div className="profile-edit-actionbar">
            <button type="button" className="profile-edit-cancel" onClick={() => navigate('/myzone')}>{isZh ? '取消' : 'Cancel'}</button>
            <button type="submit" className="profile-edit-save" disabled={saving || directoryState !== 'ready' || programmeState === 'loading' || programmeState === 'error'}>{saving ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存' : 'Save changes')}</button>
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
