import { productImageUrl } from '@shared/api/config';
import { useLanguage } from '../context/LanguageContext';
import './FoodDetailView.css';

function FoodDetailView({ food, onImageClick, canDelete, onDelete, showSummary = true }) {
  const { isZh } = useLanguage();
  if (!food) return null;

  const { name, price, image, description, comprehensiveScore } = food;
  const priceStr = typeof price === 'number' ? price.toFixed(2) : String(price ?? '-');
  const ratingDisplay = comprehensiveScore != null ? ((Number(comprehensiveScore) / 10) * 5).toFixed(1) : null;
  const displayImage = productImageUrl(image);

  return (
    <article className="food-detail-view" aria-label={isZh ? `菜品 ${name}` : `Dish ${name}`}>
      <div className="food-detail-hero">
        <div
          className={`food-detail-hero-image-wrap ${onImageClick ? 'food-detail-hero-image-wrap-clickable' : ''}`}
          role={onImageClick ? 'button' : undefined}
          tabIndex={onImageClick ? 0 : undefined}
          onClick={onImageClick || undefined}
          onKeyDown={
            onImageClick
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
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

      {showSummary ? (
        <div className="food-detail-view-body food-detail-view-body--overlay">
          <div className="food-detail-view-name-row">
            <h1 className="food-detail-view-name food-detail-view-name--zen">{name}</h1>
            {canDelete && onDelete ? (
              <button
                type="button"
                className="food-detail-view-delete"
                onClick={onDelete}
                title={isZh ? '删除菜品' : 'Delete dish'}
                aria-label={isZh ? '删除菜品' : 'Delete dish'}
              >
                🗑
              </button>
            ) : null}
          </div>
          {ratingDisplay != null ? (
            <p className="food-detail-view-rating-row">
              <span className="food-detail-view-rating" aria-label={isZh ? `评分 ${ratingDisplay}` : `Rating ${ratingDisplay}`}>
                ⭐ {ratingDisplay}
              </span>
            </p>
          ) : null}
          {description ? <p className="food-detail-view-desc">{description}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export default FoodDetailView;
