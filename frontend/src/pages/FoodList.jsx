import { useParams } from 'react-router-dom';
import MerchantHeader from '../components/MerchantHeader';
import FoodCard from '../components/FoodCard';
import { getFoodsByMerchantId, getMerchantById } from '../data/mockCanteen';
import './FoodList.css';

/** 商家菜品列表页：MerchantHeader + FoodCard 列表 */
function FoodList() {
  const { id } = useParams();
  const merchant = getMerchantById(id);
  const foods = getFoodsByMerchantId(id ?? '');

  return (
    <div className="food-list-page">
      {merchant && <MerchantHeader merchant={merchant} />}
      {foods.length === 0 ? (
        <p className="food-list-empty">
          暂无菜品 No dishes yet.
        </p>
      ) : (
        <ul className="food-list-list" aria-label="菜品列表">
          {foods.map((food) => (
            <li key={food.id}>
              <FoodCard food={food} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FoodList;
