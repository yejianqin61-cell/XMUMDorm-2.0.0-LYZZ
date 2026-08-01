import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from './Card';
import ImagePreview from './ImagePreview';
import { productImageUrl } from '@shared/api/config';
import { useLanguage } from '../context/LanguageContext';
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
function FoodCard({ food, mode = 'user', onDelete, canDelete = true }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { id, name, price, image, description, comprehensiveScore } = food;
  const priceStr = typeof price === 'number' ? price.toFixed(2) : String(price ?? '—');
  /** 统一显示为 10 分制（与排行榜一致） */
  const ratingDisplay = comprehensiveScore != null ? Number(comprehensiveScore).toFixed(1) : null;
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const displayImage = productImageUrl(image);

  const imageBlock = (
    <button
      type="button"
      className="food-card-image-wrap food-card-image-wrap-clickable"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setImagePreviewOpen(true);
      }}
    >
      <img src={displayImage} alt="" className="food-card-image" />
    </button>
  );

  const content = (
    <>
      {imageBlock}
      <div className="food-card-body">
        <span className="food-card-name">{name}</span>
        <div className="food-card-price-row">
          <span className="food-card-price">RM {priceStr}</span>
          {ratingDisplay != null && (
            <span className="food-card-rating" aria-label={`评分 ${ratingDisplay} / 10`}>⭐ {ratingDisplay}/10</span>
          )}
        </div>
        {description && (
          <p className="food-card-desc">{description}</p>
        )}
        {mode === 'merchant' && (
          <div className="food-card-actions">
            <Link to={`/merchant/food/${id}`} className="food-card-action food-card-action-edit">
              {isEn ? 'Edit' : '编辑'}
            </Link>
            {canDelete && <button
              type="button"
              className="food-card-action food-card-action-delete"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(food);
              }}
              aria-label={`删除 ${name}`}
            >
              {isEn ? 'Delete' : '删除'}
            </button>}
          </div>
        )}
      </div>
    </>
  );

  if (mode === 'merchant') {
    return (
      <div
        className="food-card-wrap food-card-wrap-merchant"
        role="link"
        tabIndex={0}
        aria-label={isEn ? `View dish ${name}` : `查看菜品 ${name}`}
        onClick={() => navigate(`/merchant/food/${id}`)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate(`/merchant/food/${id}`);
          }
        }}
      >
        <Card as="div" className="food-card">
          {content}
        </Card>
        {imagePreviewOpen && (
          <ImagePreview urls={[displayImage]} initialIndex={0} onClose={() => setImagePreviewOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <>
      <Link
        to={`/eat/food/${id}`}
        className="food-card-wrap"
        aria-label={`查看菜品 ${name}`}
      >
        <Card as="div" className="food-card">
          {content}
        </Card>
      </Link>
      {imagePreviewOpen && (
        <ImagePreview urls={[displayImage]} initialIndex={0} onClose={() => setImagePreviewOpen(false)} />
      )}
    </>
  );
}

export default FoodCard;
