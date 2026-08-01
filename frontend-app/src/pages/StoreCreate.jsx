import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import StoreForm from '../components/StoreForm';
import { Toast } from '../context/ToastContext';
import { createShop } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import './StoreCreate.css';

/** 店铺创建页：商家端，调用 createShop API，成功后跳转商家管理 */
function StoreCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const regionId = Number.parseInt(searchParams.get('region') || '', 10);
  const from = searchParams.get('from') || '';
  const returnTo = from.startsWith('/eat/') ? from : '/eat';

  const handleSubmit = (values) => {
    setLoading(true);
    createShop({ name: values.name, region_id: values.region_id })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: QK.canteenRegionShops(values.region_id) });
        Toast.success('店铺已创建');
        navigate(returnTo, { replace: true });
      })
      .catch((err) => {
        Toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="store-create-page">
      <StoreForm initialValues={Number.isFinite(regionId) && regionId > 0 ? { region_id: regionId } : undefined} onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
    </div>
  );
}

export default StoreCreate;
