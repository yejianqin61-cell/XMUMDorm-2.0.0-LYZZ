import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../context/LanguageContext';
import './StoreForm.css';

const REGIONS_STALE_MS = 5 * 60 * 1000;

/**
 * 店铺创建/编辑表单：名称、分区（API regions）、简介、logo
 * @param {Object} [props.initialValues] 编辑时预填 { name, region_id, description, logo }
 * @param {Function} props.onSubmit(values) values: { name, region_id, description?, logoUrl? }
 * @param {Function} props.onCancel
 * @param {boolean} [props.loading] 提交中时为 true，按钮禁用并显示「提交中…」
 */
function StoreForm({ initialValues, onSubmit, onCancel, loading = false }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { data: regions = [] } = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    select: (d) => (Array.isArray(d) ? d : []),
    staleTime: REGIONS_STALE_MS,
  });

  const [name, setName] = useState(initialValues?.name ?? '');
  const [regionId, setRegionId] = useState(initialValues?.region_id != null ? String(initialValues.region_id) : '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [logoUrl, setLogoUrl] = useState(initialValues?.logo ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!regionId && regions.length > 0) {
      setRegionId(String(regions[0].id));
    }
  }, [regions, regionId]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nameTrim = name.trim();
    if (!nameTrim) {
      setMessage({ text: isEn ? 'Please enter a shop name' : '请输入店铺名称', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    if (!regionId) {
      setMessage({ text: isEn ? 'Please select an area' : '请选择分区', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    onSubmit({
      name: nameTrim,
      region_id: parseInt(regionId, 10),
      description: description.trim() || undefined,
      logoUrl: logoUrl || undefined,
    });
    showMsg(initialValues ? (isEn ? 'Saved' : '已保存') : (isEn ? 'Created' : '创建成功'));
  };

  return (
    <form className="store-form" onSubmit={handleSubmit}>
      <div className="store-form-field">
        <label htmlFor="store-form-name">{isEn ? 'Shop name *' : '店铺名称 *'}</label>
        <input
          id="store-form-name"
          type="text"
          placeholder={isEn ? 'Enter shop name' : '请输入店铺名称'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="store-form-input"
        />
      </div>

      <div className="store-form-field">
        <label htmlFor="store-form-area">{isEn ? 'Area *' : '分区 *'}</label>
        <select
          id="store-form-area"
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="store-form-select"
        >
          {regions.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.name || r.code}</option>
          ))}
        </select>
      </div>

      <div className="store-form-field">
        <label>{isEn ? 'Shop logo (optional)' : '店铺 Logo（可选）'}</label>
        <div className="store-form-logo-row">
          <label className="store-form-logo-wrap">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="store-form-file-input"
            />
            {logoUrl ? (
              <img src={logoUrl} alt="" className="store-form-logo" />
            ) : (
              <div className="store-form-logo store-form-logo-placeholder">Logo</div>
            )}
          </label>
          <span className="store-form-logo-hint">{isEn ? 'Tap to upload' : '点击上传'}</span>
        </div>
      </div>

      <div className="store-form-field">
        <label htmlFor="store-form-desc">{isEn ? 'Description (optional)' : '简介（可选）'}</label>
        <textarea
          id="store-form-desc"
          placeholder={isEn ? 'Shop description' : '店铺简介'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="store-form-textarea"
        />
      </div>

      {message.text && (
        <p className={`store-form-message store-form-message-${message.type}`}>
          {message.text}
        </p>
      )}

      <div className="store-form-actions">
        <button type="submit" className="store-form-btn store-form-btn-primary" disabled={loading}>
          {loading ? (initialValues ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Submitting…' : '提交中…')) : (initialValues ? (isEn ? 'Save' : '保存') : (isEn ? 'Create' : '创建'))}
        </button>
        <button type="button" className="store-form-btn store-form-btn-secondary" onClick={onCancel} disabled={loading}>
          {isEn ? 'Cancel' : '取消'}
        </button>
      </div>
    </form>
  );
}

export default StoreForm;
