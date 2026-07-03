import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreForm from '../components/StoreForm';
import { Toast } from '../context/ToastContext';
import { createShop } from '@shared/api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import './StoreCreate.css';

/** 店铺创建页：商家端，调用 createShop API，成功后跳转商家管理 */
function StoreCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (values) => {
    setLoading(true);
    createShop({ name: values.name, region_id: values.region_id })
      .then(() => {
        Toast.success('店铺已创建');
        navigate('/merchant/manage', { replace: true });
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
      <StoreForm onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
    </div>
  );
}

export default StoreCreate;
