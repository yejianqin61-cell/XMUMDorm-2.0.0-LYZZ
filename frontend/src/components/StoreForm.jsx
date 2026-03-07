import { useState } from 'react';
import { AREAS } from '../data/mockCanteen';
import './StoreForm.css';

/**
 * 店铺创建/编辑表单：名称、分区、简介、logo
 * @param {Object} [props.initialValues] 编辑时预填 { name, area, description, logo }
 * @param {Function} props.onSubmit(values) values: { name, area, description?, logoUrl? }
 * @param {Function} props.onCancel
 */
function StoreForm({ initialValues, onSubmit, onCancel }) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [area, setArea] = useState(initialValues?.area ?? AREAS[0]);
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [logoUrl, setLogoUrl] = useState(initialValues?.logo ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });

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
      setMessage({ text: '请输入店铺名称 Please enter store name', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    if (!area) {
      setMessage({ text: '请选择分区 Please select area', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    onSubmit({
      name: nameTrim,
      area,
      description: description.trim() || undefined,
      logoUrl: logoUrl || undefined,
    });
    showMsg(initialValues ? '已保存 Saved' : '创建成功 Created');
  };

  return (
    <form className="store-form" onSubmit={handleSubmit}>
      <div className="store-form-field">
        <label htmlFor="store-form-name">店铺名称 Store Name *</label>
        <input
          id="store-form-name"
          type="text"
          placeholder="请输入店铺名称 Enter store name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="store-form-input"
        />
      </div>

      <div className="store-form-field">
        <label htmlFor="store-form-area">分区 Area *</label>
        <select
          id="store-form-area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="store-form-select"
        >
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a === 'others' ? 'Others' : a}
            </option>
          ))}
        </select>
      </div>

      <div className="store-form-field">
        <label>店铺 Logo（可选 optional）</label>
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
          <span className="store-form-logo-hint">点击上传 Tap to upload</span>
        </div>
      </div>

      <div className="store-form-field">
        <label htmlFor="store-form-desc">简介 Description（可选 optional）</label>
        <textarea
          id="store-form-desc"
          placeholder="店铺简介 Store description"
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
        <button type="submit" className="store-form-btn store-form-btn-primary">
          {initialValues ? '保存 Save' : '创建 Create'}
        </button>
        <button type="button" className="store-form-btn store-form-btn-secondary" onClick={onCancel}>
          取消 Cancel
        </button>
      </div>
    </form>
  );
}

export default StoreForm;
