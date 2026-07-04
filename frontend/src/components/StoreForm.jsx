import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { Toast } from '../context/ToastContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import './StoreForm.css';

const REGIONS_STALE_MS = 5 * 60 * 1000;

/**
 * 店铺创建/编辑表单：名称、分区（API regions）、简介、logo
 * @param {Object} [props.initialValues] 编辑时预填 { name, region_id, description, logo }
 * @param {Function} props.onSubmit(values) values: { name, region_id, description?, logoUrl? }
 * @param {Function} props.onCancel
 * @param {boolean} [props.loading] 提交中时为 true，按钮禁用并显示“提交中…”
 */
function StoreForm({ initialValues, onSubmit, onCancel, loading = false }) {
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

  useEffect(() => {
    if (!regionId && regions.length > 0) {
      setRegionId(String(regions[0].id));
    }
  }, [regions, regionId]);

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
      Toast.error('请输入店铺名称 Please enter store name');
      return;
    }
    if (!regionId) {
      Toast.error('请选择分区 Please select area');
      return;
    }
    onSubmit({
      name: nameTrim,
      region_id: parseInt(regionId, 10),
      description: description.trim() || undefined,
      logoUrl: logoUrl || undefined,
    });
    Toast.success(initialValues ? '已保存 Saved' : '创建成功 Created');
  };

  return (
    <form className="store-form" onSubmit={handleSubmit}>
      <Input
        id="store-form-name"
        type="text"
        label="店铺名称 Store Name"
        required
        placeholder="请输入店铺名称 Enter store name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Select
        id="store-form-area"
        label="分区 Area"
        required
        value={regionId}
        onChange={(e) => setRegionId(e.target.value)}
      >
        {regions.map((r) => (
          <option key={r.id} value={String(r.id)}>{r.name || r.code}</option>
        ))}
      </Select>

      <div className="store-form-field">
        <label className="store-form-upload-label">店铺 Logo（可选 optional）</label>
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

      <Textarea
        id="store-form-desc"
        label="简介 Description（可选 optional）"
        placeholder="店铺简介 Store description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <div className="store-form-actions">
        <Button type="submit" variant="accent" size="lg" block disabled={loading} loading={loading}>
          {loading ? (initialValues ? '保存中…' : '提交中…') : (initialValues ? '保存 Save' : '创建 Create')}
        </Button>
        <Button type="button" variant="secondary" size="lg" block onClick={onCancel} disabled={loading}>
          取消 Cancel
        </Button>
      </div>
    </form>
  );
}

export default StoreForm;
