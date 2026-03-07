import { useState } from 'react';
import { Link } from 'react-router-dom';
import FoodCard from '../components/FoodCard';
import { getFoodsByMerchantId, getMerchantById, MOCK_CURRENT_MERCHANT_ID } from '../data/mockCanteen';
import './FoodManage.css';

/** 商家端菜品管理：当前商家的菜品列表，支持编辑/删除，入口发布新菜品 */
function FoodManage() {
  const merchantId = MOCK_CURRENT_MERCHANT_ID;
  const merchant = getMerchantById(merchantId);
  const [foods, setFoods] = useState(() => getFoodsByMerchantId(merchantId));

  const handleDelete = (food) => {
    if (!window.confirm(`确定删除 "${food.name}" 吗？ Delete this dish?`)) return;
    setFoods((prev) => prev.filter((f) => f.id !== food.id));
    // TODO: 调用删除菜品 API
  };

  return (
    <div className="food-manage-page">
      {merchant && (
        <p className="food-manage-merchant">{merchant.name}</p>
      )}
      <Link to="/merchant/food/new" className="food-manage-add">
        发布菜品 Publish Food
      </Link>

      {foods.length === 0 ? (
        <p className="food-manage-empty">
          暂无菜品，点击上方发布 No dishes yet. Publish one above.
        </p>
      ) : (
        <ul className="food-manage-list" aria-label="菜品列表">
          {foods.map((food) => (
            <li key={food.id}>
              <FoodCard food={food} mode="merchant" onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FoodManage;
