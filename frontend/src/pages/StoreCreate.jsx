import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreForm from '../components/StoreForm';
import { createShop } from '../api/canteen';
import './StoreCreate.css';

/** 店铺创建页：商家端，调用 createShop API，成功后跳转商家管理 */
function StoreCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (values) => {
    setError(null);
    setLoading(true);
    createShop({ name: values.name, region_id: values.region_id })
      .then(() => {
        navigate('/merchant/manage', { replace: true });
      })
      .catch((err) => {
        setError(err.message || '创建失败');
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
      {error && <p className="store-create-error state-inline-error" role="alert">{error}</p>}
      <StoreForm onSubmit={handleSubmit} onCancel={handleCancel} />
      {loading && <p className="store-create-loading">提交中…</p>}
    </div>
  );
}

export default StoreCreate;
