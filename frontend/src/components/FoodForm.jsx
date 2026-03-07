import { useState } from 'react';
import './FoodForm.css';

/**
 * 菜品创建/编辑表单：名称、价格、图片、描述
 * @param {Object} [props.initialValues] 编辑时预填 { name, price, image, description }
 * @param {Function} props.onSubmit(values) values: { name, price, imageUrl?, description }
 * @param {Function} props.onCancel
 */
function FoodForm({ initialValues, onSubmit, onCancel }) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [price, setPrice] = useState(
    initialValues?.price != null ? String(initialValues.price) : ''
  );
  const [imageUrl, setImageUrl] = useState(initialValues?.image ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nameTrim = name.trim();
    if (!nameTrim) {
      setMessage({ text: '请输入菜品名称 Please enter food name', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setMessage({ text: '请输入有效价格 Please enter a valid price', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    onSubmit({
      name: nameTrim,
      price: priceNum,
      imageUrl: imageUrl || undefined,
      description: description.trim() || undefined,
    });
    showMsg(initialValues ? '已保存 Saved' : '发布成功 Published');
  };

  return (
    <form className="food-form" onSubmit={handleSubmit}>
      <div className="food-form-field">
        <label htmlFor="food-form-name">菜品名称 Name *</label>
        <input
          id="food-form-name"
          type="text"
          placeholder="请输入菜品名称 Enter food name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="food-form-input"
        />
      </div>

      <div className="food-form-field">
        <label htmlFor="food-form-price">价格 Price (RM) *</label>
        <input
          id="food-form-price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="food-form-input"
        />
      </div>

      <div className="food-form-field">
        <label>图片 Picture（可选 optional）</label>
        <div className="food-form-image-row">
          <label className="food-form-image-wrap">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="food-form-file-input"
            />
            {imageUrl ? (
              <img src={imageUrl} alt="" className="food-form-image" />
            ) : (
              <div className="food-form-image food-form-image-placeholder">+</div>
            )}
          </label>
          <span className="food-form-image-hint">点击上传 Tap to upload</span>
        </div>
      </div>

      <div className="food-form-field">
        <label htmlFor="food-form-desc">描述 Description（可选 optional）</label>
        <textarea
          id="food-form-desc"
          placeholder="简要描述菜品 Brief description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="food-form-textarea"
        />
      </div>

      {message.text && (
        <p className={`food-form-message food-form-message-${message.type}`}>
          {message.text}
        </p>
      )}

      <div className="food-form-actions">
        <button type="submit" className="food-form-btn food-form-btn-primary">
          {initialValues ? '保存 Save' : '发布 Publish'}
        </button>
        <button type="button" className="food-form-btn food-form-btn-secondary" onClick={onCancel}>
          取消 Cancel
        </button>
      </div>
    </form>
  );
}

export default FoodForm;
