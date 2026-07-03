import { productImageUrl } from '@shared/api/config';
import './FoodDetailView.css';

/**
 * 菜品详情展示：大图、名称、价格、描述（用户端/商家端查看模式共用）
 * @param {Object} food
 * @param {string} food.name
 * @param {string|number} food.price
 * @param {string} [food.image]
 * @param {string} [food.description]
 * @param {Function} [onImageClick] 点击大图时回调，用于打开全屏预览
 * @param {boolean} [canDelete] 是否显示删除按钮（仅管理员或店主）
 * @param {Function} [onDelete] 点击删除按钮时的回调
 */
function FoodDetailView({ food, onImageClick, canDelete, onDelete }) {
  if (!food) return null;

  const { name, price, image, description, comprehensiveScore } = food;
  const priceStr = typeof price === 'number' ? price.toFixed(2) : String(price ?? '—');
  /** 后端 0–10 分制转 5 星展示 */
  const ratingDisplay = comprehensiveScore != null ? (Number(comprehensiveScore) / 10 * 5).toFixed(1) : null;
  const displayImage = productImageUrl(image);

  return (
    <article className="food-detail-view" aria-label={`菜品 ${name}`}>
      <div className="food-detail-hero">
        <div
          className={`food-detail-hero-image-wrap ${onImageClick ? 'food-detail-hero-image-wrap-clickable' : ''}`}
          role={onImageClick ? 'button' : undefined}
          tabIndex={onImageClick ? 0 : undefined}
          onClick={onImageClick || undefined}
          onKeyDown={
            onImageClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onImageClick();
                  }
                }
              : undefined
          }
        >
          <img src={displayImage} alt="" className="food-detail-hero-image" />
        </div>

        <div className="food-detail-price-badge" aria-label={`价格 RM ${priceStr}`}>
          <span className="food-detail-price-badge-currency">RM</span>
          <span className="food-detail-price-badge-num">{priceStr}</span>
        </div>
      </div>

      <div className="food-detail-view-body food-detail-view-body--overlay">
        <div className="food-detail-view-name-row">
          <h1 className="food-detail-view-name food-detail-view-name--zen">{name}</h1>
          {canDelete && onDelete && (
            <button
              type="button"
              className="food-detail-view-delete"
              onClick={onDelete}
              title="删除商品"
              aria-label="删除商品"
            >
              🗑
            </button>
          )}
        </div>
        {ratingDisplay != null && (
          <p className="food-detail-view-rating-row">
            <span className="food-detail-view-rating" aria-label={`评分 ${ratingDisplay}`}>
              ⭐ {ratingDisplay}
            </span>
          </p>
        )}
        {description && <p className="food-detail-view-desc">{description}</p>}
      </div>
    </article>
  );
}

export default FoodDetailView;
