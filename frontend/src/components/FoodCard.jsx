import { Link } from 'react-router-dom';
import Card from './Card';
import './Card.css';
import './FoodCard.css';

/**
 * 菜品卡片：展示图片、名称、价格，可选描述
 * - 用户端：整卡 Link 到 /eat/food/:id
 * - 商家端：mode="merchant" 时显示编辑/删除按钮，不整卡跳转
 * @param {Object} food
 * @param {string} [mode] 'user' | 'merchant'
 * @param {Function} [onDelete] 商家端删除回调 (food) => void
 */
function FoodCard({ food, mode = 'user', onDelete }) {
  const { id, name, price, image, description } = food;
  const priceStr = typeof price === 'number' ? price.toFixed(2) : String(price ?? '—');

  const content = (
    <>
      <div className="food-card-image-wrap">
        {image ? (
          <img src={image} alt="" className="food-card-image" />
        ) : (
          <div className="food-card-image food-card-image-default" aria-hidden>
            Food
          </div>
        )}
      </div>
      <div className="food-card-body">
        <span className="food-card-name">{name}</span>
        <span className="food-card-price">RM {priceStr}</span>
        {description && (
          <p className="food-card-desc">{description}</p>
        )}
        {mode === 'merchant' && (
          <div className="food-card-actions">
            <Link to={`/merchant/food/${id}`} className="food-card-action food-card-action-edit">
              编辑 Edit
            </Link>
            <button
              type="button"
              className="food-card-action food-card-action-delete"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(food);
              }}
              aria-label={`删除 ${name}`}
            >
              删除 Delete
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (mode === 'merchant') {
    return (
      <div className="food-card-wrap food-card-wrap-merchant">
        <Card as="div" className="food-card">
          {content}
        </Card>
      </div>
    );
  }

  return (
    <Link
      to={`/eat/food/${id}`}
      className="food-card-wrap"
      aria-label={`查看菜品 ${name}`}
    >
      <Card as="div" className="food-card">
        {content}
      </Card>
    </Link>
  );
}

export default FoodCard;
