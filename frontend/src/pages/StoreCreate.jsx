import { useNavigate } from 'react-router-dom';
import StoreForm from '../components/StoreForm';
import './StoreCreate.css';

/** 店铺创建页：商家端，使用 StoreForm，提交后跳转商家管理或首页 */
function StoreCreate() {
  const navigate = useNavigate();

  const handleSubmit = (values) => {
    // TODO: 调用创建店铺 API
    console.log('创建店铺 Create store', values);
    setTimeout(() => navigate('/merchant/manage', { replace: true }), 600);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="store-create-page">
      <StoreForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}

export default StoreCreate;
