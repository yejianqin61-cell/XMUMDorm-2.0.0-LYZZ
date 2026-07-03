import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { createClub } from '@shared/api/clubs';
import './Clubs.css';

const CATS = [
  { key: 'music', zh: '音乐', en: 'Music' },
  { key: 'tech', zh: '科技', en: 'Tech' },
  { key: 'culture', zh: '文化', en: 'Culture' },
  { key: 'sport', zh: '运动', en: 'Sport' },
  { key: 'art', zh: '艺术', en: 'Art' },
];

function CreateClub() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const nav = useNavigate();
  const { isAdmin } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('music');
  const [description, setDescription] = useState('');
  const [ig, setIg] = useState('');
  const [xhs, setXhs] = useState('');
  const [contactText, setContactText] = useState('');
  const [signupLink, setSignupLink] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [logo, setLogo] = useState(null);
  const [err, setErr] = useState('');

  const formData = useMemo(() => {
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('category', category);
    fd.append('description', description);
    fd.append('ig', ig);
    fd.append('xhs', xhs);
    fd.append('contactText', contactText);
    fd.append('signupLink', signupLink);
    fd.append('adminEmail', adminEmail.trim());
    if (logo) fd.append('logo', logo);
    return fd;
  }, [name, category, description, ig, xhs, contactText, signupLink, adminEmail, logo]);

  const mut = useMutation({
    mutationFn: async () => await createClub(formData),
    onSuccess: (r) => {
      const id = r?.id;
      if (id) nav(`/about/club/${id}`);
      else nav('/about/club');
    },
    onError: (e) => setErr(e?.message || (isZh ? '创建失败' : 'Failed')),
  });

  if (!isAdmin) {
    return <div className="state-error">{isZh ? '仅管理员可创建社团' : 'Admin only'}</div>;
  }

  return (
    <div className="club-page">
      <div className="club-top">
        <div className="club-title">{isZh ? '创建社团' : 'Create club'}</div>
      </div>

      <form
        className="club-admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          setErr('');
          if (!name.trim()) return setErr(isZh ? '社团名字不能为空' : 'Name required');
          mut.mutate();
        }}
      >
        {err ? <div className="state-inline-error">{err}</div> : null}

        <label className="club-field">
          <div className="club-label">{isZh ? '社团名字' : 'Name'}</div>
          <input className="club-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </label>

        <label className="club-field">
          <div className="club-label">{isZh ? '社团分类' : 'Category'}</div>
          <select className="club-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS.map((c) => (
              <option key={c.key} value={c.key}>
                {isZh ? c.zh : c.en}
              </option>
            ))}
          </select>
        </label>

        <label className="club-field">
          <div className="club-label">{isZh ? '社团简介' : 'Description'}</div>
          <textarea className="club-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>

        <div className="club-grid2">
          <label className="club-field">
            <div className="club-label">IG</div>
            <input className="club-input" value={ig} onChange={(e) => setIg(e.target.value)} maxLength={80} placeholder="@..." />
          </label>
          <label className="club-field">
            <div className="club-label">{isZh ? '小红书' : 'XHS'}</div>
            <input className="club-input" value={xhs} onChange={(e) => setXhs(e.target.value)} maxLength={120} />
          </label>
        </div>

        <label className="club-field">
          <div className="club-label">{isZh ? '联系方式（文本）' : 'Contact text'}</div>
          <input className="club-input" value={contactText} onChange={(e) => setContactText(e.target.value)} maxLength={255} />
        </label>

        <label className="club-field">
          <div className="club-label">{isZh ? '报名链接' : 'Signup link'}</div>
          <input className="club-input" value={signupLink} onChange={(e) => setSignupLink(e.target.value)} maxLength={500} placeholder="https://..." />
        </label>

        <label className="club-field">
          <div className="club-label">{isZh ? '添加负责人（邮箱，可选）' : 'Admin email (optional)'}</div>
          <input className="club-input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} maxLength={120} placeholder="xxx@xmu.edu.my" />
        </label>

        <label className="club-field">
          <div className="club-label">
            <ImagePlus size={16} aria-hidden /> {isZh ? 'Logo 图片' : 'Logo'}
          </div>
          <input className="club-input" type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
        </label>

        <button type="submit" className="club-admin-submit pressable" disabled={mut.isPending}>
          {mut.isPending ? (isZh ? '创建中…' : 'Creating…') : (isZh ? '创建' : 'Create')}
        </button>
      </form>
    </div>
  );
}

export default CreateClub;

