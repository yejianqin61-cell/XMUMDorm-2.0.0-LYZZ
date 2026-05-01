import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CalendarClock, MapPin, Phone, PlusCircle, Tag } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { createErrand } from '../../api/errands';
import './Errands.css';

function PublishErrand() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const nav = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('delivery');
  const [contactInfo, setContactInfo] = useState('');
  const [err, setErr] = useState('');

  const payload = useMemo(
    () => ({
      title,
      description,
      reward: reward === '' ? 0 : Number(reward),
      deadline: deadline || null,
      location,
      type,
      contactInfo,
    }),
    [title, description, reward, deadline, location, type, contactInfo]
  );

  const mut = useMutation({
    mutationFn: async () => await createErrand(payload),
    onSuccess: (r) => {
      const id = r?.id;
      if (id) nav(`/about/errands/${id}`);
      else nav('/about/errands');
    },
    onError: (e) => {
      const msg = e?.message || (isZh ? '发布失败' : 'Publish failed');
      setErr(String(msg));
    },
  });

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!title.trim()) return setErr(isZh ? '标题不能为空' : 'Title required');
    if (!contactInfo.trim()) return setErr(isZh ? '联系方式不能为空' : 'Contact required');
    mut.mutate();
  };

  return (
    <div className="err-page">
      <div className="err-topbar">
        <div className="err-title">{isZh ? '发布跑腿' : 'Publish errand'}</div>
      </div>

      <form className="err-form" onSubmit={submit}>
        {err ? <div className="state-inline-error">{err}</div> : null}

        <label className="err-field">
          <div className="err-label">{isZh ? '标题' : 'Title'}</div>
          <input className="err-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </label>

        <label className="err-field">
          <div className="err-label">{isZh ? '描述' : 'Description'}</div>
          <textarea className="err-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} />
        </label>

        <div className="err-grid2">
          <label className="err-field">
            <div className="err-label">
              <PlusCircle size={16} aria-hidden /> {isZh ? '酬劳 (RM)' : 'Reward (RM)'}
            </div>
            <input className="err-input" value={reward} onChange={(e) => setReward(e.target.value)} inputMode="decimal" />
          </label>

          <label className="err-field">
            <div className="err-label">
              <CalendarClock size={16} aria-hidden /> {isZh ? '截止时间' : 'Deadline'}
            </div>
            <input className="err-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="2026-05-01 20:30" />
          </label>
        </div>

        <label className="err-field">
          <div className="err-label">
            <MapPin size={16} aria-hidden /> {isZh ? '地点' : 'Location'}
          </div>
          <input className="err-input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
        </label>

        <label className="err-field">
          <div className="err-label">
            <Tag size={16} aria-hidden /> {isZh ? '类型' : 'Type'}
          </div>
          <select className="err-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="delivery">{isZh ? '代取' : 'Delivery'}</option>
            <option value="purchase">{isZh ? '代购' : 'Purchase'}</option>
            <option value="urgent">{isZh ? '紧急' : 'Urgent'}</option>
          </select>
        </label>

        <label className="err-field">
          <div className="err-label">
            <Phone size={16} aria-hidden /> {isZh ? '联系方式（必填）' : 'Contact (required)'}
          </div>
          <input className="err-input" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} maxLength={255} />
        </label>

        <button type="submit" className="err-submit pressable" disabled={mut.isPending}>
          {mut.isPending ? (isZh ? '发布中…' : 'Publishing…') : (isZh ? '发布' : 'Publish')}
        </button>
      </form>
    </div>
  );
}

export default PublishErrand;

