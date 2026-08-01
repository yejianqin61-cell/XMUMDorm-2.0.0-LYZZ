import { useState } from 'react';
import { Toast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import './FoodForm.css';

/**
 * 菜品创建/编辑表单：名称、价格（可选）、分类、图片、描述
 * @param {Array<{ id: string|number, name: string }>} [props.categories] 可选，有则显示分类下拉
 * @param {boolean} [props.skipPrice] 为 true 时不显示/不校验价格（后端无 price 时用）
 * @param {Object} [props.initialValues] 编辑时预填 { name, price, categoryId?, image, description }
 * @param {Function} props.onSubmit(values) values: { name, price?, categoryId?, imageUrl?, imageFile?, description }
 * @param {Function} props.onCancel
 * @param {boolean} [props.loading] 提交中时为 true，按钮禁用并显示「发布中…」/「保存中…」
 */
function FoodForm({ categories = [], skipPrice = false, initialValues, onSubmit, onCancel, loading = false }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [name, setName] = useState(initialValues?.name ?? '');
  const [price, setPrice] = useState(
    initialValues?.price != null ? String(initialValues.price) : ''
  );
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId != null ? String(initialValues.categoryId) : (categories[0] ? String(categories[0].id) : '')
  );
  const [imageUrl, setImageUrl] = useState(initialValues?.image ?? '');
  const [imageFile, setImageFile] = useState(null);
  const [description, setDescription] = useState(initialValues?.description ?? '');

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nameTrim = name.trim();
    if (!nameTrim) {
      Toast.error(isEn ? 'Please enter a dish name' : '请输入菜品名称');
      return;
    }
    const out = {
      name: nameTrim,
      imageUrl: imageUrl || undefined,
      imageFile: imageFile || undefined,
      description: description.trim() || undefined,
    };
    if (!skipPrice) {
      const priceTrim = price.trim();
      if (priceTrim === '') {
        out.price = initialValues ? undefined : null;
      } else {
        const priceNum = parseFloat(price);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          Toast.error(isEn ? 'Please enter a valid price' : '请输入有效价格');
          return;
        }
        out.price = priceNum;
      }
      if (out.price === null && !initialValues) {
        Toast.error(isEn ? 'Please enter a valid price' : '请输入有效价格');
        return;
      }
    }
    if (categories.length > 0 && categoryId) out.categoryId = Number(categoryId) || categoryId;
    onSubmit(out);
  };

  return (
    <form className="food-form" onSubmit={handleSubmit}>
      <div className="food-form-field">
        <label htmlFor="food-form-name">{isEn ? 'Dish name *' : '菜品名称 *'}</label>
        <input
          id="food-form-name"
          type="text"
          placeholder={isEn ? 'Enter dish name' : '请输入菜品名称'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="food-form-input"
        />
      </div>

      {!skipPrice && (
        <div className="food-form-field">
          <label htmlFor="food-form-price">{isEn ? 'Price (RM) *' : '价格（RM）*'}</label>
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
      )}

      {(categories.length > 0 || categories) && (
        <div className="food-form-field">
          <label htmlFor="food-form-category">{isEn ? 'Category *' : '菜品分类 *'}</label>
          {categories.length > 0 ? (
            <select
              id="food-form-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="food-form-input food-form-select"
            >
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          ) : (
            <p className="food-form-category-hint">{isEn ? 'No category yet. Create one from the shop management page.' : '暂无分类，请先在「店铺管理」页创建分类。'}</p>
          )}
        </div>
      )}

      <div className="food-form-field">
        <label>{isEn ? 'Image (optional)' : '图片（可选）'}</label>
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
          <span className="food-form-image-hint">{isEn ? 'Tap to upload' : '点击上传'}</span>
        </div>
      </div>

      <div className="food-form-field">
        <label htmlFor="food-form-desc">{isEn ? 'Description (optional)' : '描述（可选）'}</label>
        <textarea
          id="food-form-desc"
          placeholder={isEn ? 'Brief description' : '简要描述菜品'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="food-form-textarea"
        />
      </div>

      <div className="food-form-actions">
        <button type="submit" className="food-form-btn food-form-btn-primary" disabled={loading}>
          {loading ? (initialValues ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Publishing…' : '发布中…')) : (initialValues ? (isEn ? 'Save' : '保存') : (isEn ? 'Publish' : '发布'))}
        </button>
        <button type="button" className="food-form-btn food-form-btn-secondary" onClick={onCancel} disabled={loading}>
          {isEn ? 'Cancel' : '取消'}
        </button>
      </div>
    </form>
  );
}

export default FoodForm;
