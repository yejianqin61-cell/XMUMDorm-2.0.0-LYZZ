import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FoodDetailView from '../components/FoodDetailView';
import FoodForm from '../components/FoodForm';
import { getFoodById } from '../data/mockCanteen';
import './MerchantFoodDetail.css';

/** 商家端菜品详情：查看 + 编辑（FoodDetailView / FoodForm 切换） */
function MerchantFoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [food, setFood] = useState(() => getFoodById(id));

  if (!food) {
    return (
      <div className="merchant-food-detail-page">
        <p className="merchant-food-detail-empty">菜品不存在 Food not found</p>
        <button type="button" className="merchant-food-detail-back" onClick={() => navigate(-1)}>
          返回 Back
        </button>
      </div>
    );
  }

  const handleSave = (values) => {
    setFood((prev) => ({
      ...prev,
      name: values.name,
      price: values.price,
      image: values.imageUrl ?? prev.image,
      description: values.description ?? prev.description,
    }));
    setIsEditing(false);
    // TODO: 调用更新菜品 API
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div className="merchant-food-detail-page">
      {isEditing ? (
        <FoodForm
          initialValues={{
            name: food.name,
            price: food.price,
            image: food.image,
            description: food.description,
          }}
          onSubmit={handleSave}
          onCancel={handleCancelEdit}
        />
      ) : (
        <>
          <FoodDetailView food={food} />
          <div className="merchant-food-detail-actions">
            <button
              type="button"
              className="merchant-food-detail-btn merchant-food-detail-btn-edit"
              onClick={() => setIsEditing(true)}
            >
              编辑 Edit
            </button>
            <button
              type="button"
              className="merchant-food-detail-btn merchant-food-detail-btn-back"
              onClick={() => navigate(-1)}
            >
              返回管理 Back to Manage
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MerchantFoodDetail;
