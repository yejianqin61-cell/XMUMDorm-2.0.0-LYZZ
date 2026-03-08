import './FoodDetailView.css';

/**
 * 菜品详情展示：大图、名称、价格、描述（用户端/商家端查看模式共用）
 * @param {Object} food
 * @param {string} food.name
 * @param {string|number} food.price
 * @param {string} [food.image]
 * @param {string} [food.description]
 * @param {Function} [onImageClick] 点击大图时回调，用于打开全屏预览
 */
function FoodDetailView({ food, onImageClick }) {
  if (!food) return null;

  const { name, price, image, description, comprehensiveScore } = food;
  const priceStr = typeof price === 'number' ? price.toFixed(2) : String(price ?? '—');
  /** 后端 0–10 分制转 5 星展示 */
  const ratingDisplay = comprehensiveScore != null ? (Number(comprehensiveScore) / 10 * 5).toFixed(1) : null;

  return (
    <article className="food-detail-view" aria-label={`菜品 ${name}`}>
      <div
        className={`food-detail-view-image-wrap ${onImageClick && image ? 'food-detail-view-image-wrap-clickable' : ''}`}
        role={onImageClick && image ? 'button' : undefined}
        tabIndex={onImageClick && image ? 0 : undefined}
        onClick={onImageClick && image ? onImageClick : undefined}
        onKeyDown={onImageClick && image ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(); } } : undefined}
      >
        {image ? (
          <img src={image} alt="" className="food-detail-view-image" />
        ) : (
          <div className="food-detail-view-image food-detail-view-image-default" aria-hidden>
            Food
          </div>
        )}
      </div>
      <div className="food-detail-view-body">
        <h1 className="food-detail-view-name">{name}</h1>
        <p className="food-detail-view-price-row">
          <span className="food-detail-view-price">RM {priceStr}</span>
          {ratingDisplay != null && (
            <span className="food-detail-view-rating" aria-label={`评分 ${ratingDisplay}`}>⭐ {ratingDisplay}</span>
          )}
        </p>
        {description && (
          <p className="food-detail-view-desc">{description}</p>
        )}
      </div>
    </article>
  );
}

export default FoodDetailView;
