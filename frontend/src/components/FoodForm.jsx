import { useState } from 'react';
import { Toast } from '../context/ToastContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import './FoodForm.css';

/**
 * 菜品创建/编辑表单：名称、价格（可选）、分类、图片、描述
 * @param {Array<{ id: string|number, name: string }>} [props.categories] 可选，有则显示分类下拉
 * @param {boolean} [props.skipPrice] 为 true 时不显示/不校验价格（后端无 price 时用）
 * @param {Object} [props.initialValues] 编辑时预填 { name, price, categoryId?, image, description }
 * @param {Function} props.onSubmit(values) values: { name, price?, categoryId?, imageUrl?, imageFile?, description }
 * @param {Function} props.onCancel
 * @param {boolean} [props.loading] 提交中时为 true，按钮禁用并显示“发布中…”/“保存中…”
 */
function FoodForm({ categories = [], skipPrice = false, initialValues, onSubmit, onCancel, loading = false }) {
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
      Toast.error('请输入菜品名称 Please enter food name');
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
          Toast.error('请输入有效价格 Please enter a valid price');
          return;
        }
        out.price = priceNum;
      }
      if (out.price === null && !initialValues) {
        Toast.error('请输入有效价格 Please enter a valid price');
        return;
      }
    }
    if (categories.length > 0 && categoryId) out.categoryId = Number(categoryId) || categoryId;
    onSubmit(out);
  };

  return (
    <form className="food-form" onSubmit={handleSubmit}>
      <Input
        id="food-form-name"
        label="菜品名称 Name"
        required
        placeholder="请输入菜品名称 Enter food name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {!skipPrice && (
        <Input
          id="food-form-price"
          type="number"
          label="价格 Price (RM)"
          required
          step="0.01"
          min="0"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          prefix="RM"
        />
      )}

      {(categories.length > 0 || categories) && (
        <div className="food-form-field">
          {categories.length > 0 ? (
            <Select
              id="food-form-category"
              label="菜品分类 Category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="food-form-select-field"
            >
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </Select>
          ) : (
            <p className="food-form-category-hint">暂无分类，请先在“管理店铺”页点击“新建分类”创建。No category yet. Create one in Manage Store.</p>
          )}
        </div>
      )}

      <div className="food-form-field">
        <label className="food-form-upload-label">图片 Picture（可选 optional）</label>
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

      <Textarea
        id="food-form-desc"
        label="描述 Description（可选 optional）"
        placeholder="简要描述菜品 Brief description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <div className="food-form-actions">
        <Button type="submit" variant="accent" size="lg" block disabled={loading} loading={loading}>
          {loading ? (initialValues ? '保存中…' : '发布中…') : (initialValues ? '保存 Save' : '发布 Publish')}
        </Button>
        <Button type="button" variant="secondary" size="lg" block onClick={onCancel} disabled={loading}>
          取消 Cancel
        </Button>
      </div>
    </form>
  );
}

export default FoodForm;
