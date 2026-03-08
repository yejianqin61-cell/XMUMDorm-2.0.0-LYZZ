import { useNavigate } from 'react-router-dom';
import FoodForm from '../components/FoodForm';
import { getCategoriesByMerchantId, MOCK_CURRENT_MERCHANT_ID } from '../data/mockCanteen';
import './FoodCreate.css';

/** 菜品发布页：商家端，使用 FoodForm（含分类），提交后跳转菜品管理 */
function FoodCreate() {
  const navigate = useNavigate();
  const categories = getCategoriesByMerchantId(MOCK_CURRENT_MERCHANT_ID);

  const handleSubmit = (values) => {
    // TODO: 调用发布菜品 API
    console.log('发布菜品 Publish food', values);
    setTimeout(() => navigate('/merchant/manage', { replace: true }), 600);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="food-create-page">
      <FoodForm categories={categories} onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}

export default FoodCreate;
