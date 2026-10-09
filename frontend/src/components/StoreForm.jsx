import {  useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRegions } from '@shared/api/canteen';
import { QK } from '@shared/query/queryKeys';
import { Toast } from '../context/toast';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import './StoreForm.css';

const REGIONS_STALE_MS = 5 * 60 * 1000;

/**
 * 商铺创建表单：名称 + 分区。
 * 营业时间与店铺图片由“编辑商家”页补充（创建接口不接受这两个字段）。
 * @param {Object} [props.initialValues] 预填 { name, region_id }
 * @param {string|number} [props.defaultRegionId] 当前分区，创建时默认带入
 * @param {Function} props.onSubmit(values) values: { name, region_id }
 * @param {Function} props.onCancel
 * @param {boolean} [props.loading] 提交中时为 true，按钮禁用并显示“提交中…”
 */
function StoreForm({ initialValues, defaultRegionId, onSubmit, onCancel, loading = false }) {
  const { data: regions = [] } = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    select: (d) => (Array.isArray(d) ? d : []),
    staleTime: REGIONS_STALE_MS,
  });

  const [name, setName] = useState(initialValues?.name ?? '');
  const [regionId, setRegionId] = useState(
    initialValues?.region_id != null
      ? String(initialValues.region_id)
      : (defaultRegionId != null ? String(defaultRegionId) : '')
  );

  const effectiveRegionId = regionId || (defaultRegionId != null ? String(defaultRegionId) : String(regions[0]?.id ?? ''));

  const handleSubmit = (e) => {
    e.preventDefault();
    const nameTrim = name.trim();
    if (!nameTrim) {
      Toast.error('请输入店铺名称 Please enter shop name');
      return;
    }
    if (!effectiveRegionId) {
      Toast.error('请选择分区 Please select an area');
      return;
    }
    onSubmit({
      name: nameTrim,
      region_id: parseInt(effectiveRegionId, 10),
    });
  };

  return (
    <form className="store-form" onSubmit={handleSubmit}>
      <Input
        id="store-form-name"
        type="text"
        label="店铺名称 Shop name"
        required
        placeholder="请输入店铺名称 Enter shop name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Select
        id="store-form-area"
        label="分区 Area"
        required
        value={effectiveRegionId}
        onChange={(e) => setRegionId(e.target.value)}
      >
        {regions.map((r) => (
          <option key={r.id} value={String(r.id)}>{r.name || r.code}</option>
        ))}
      </Select>

      <p className="store-form-note">
        创建后可进入商铺补充营业时间与店铺图片。
        Opening hours and shop photo can be added after creation.
      </p>

      <div className="store-form-actions">
        <Button type="submit" size="lg" block disabled={loading} loading={loading}>
          {loading ? '提交中…' : '创建 Create'}
        </Button>
        <Button type="button" variant="secondary" size="lg" block onClick={onCancel} disabled={loading}>
          取消 Cancel
        </Button>
      </div>
    </form>
  );
}

export default StoreForm;
