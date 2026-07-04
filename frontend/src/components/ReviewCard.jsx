import { Link } from 'react-router-dom';
import Card from './ui/Card';
import { API_BASE_URL } from '@shared/api/config';
import './ReviewCard.css';

/**
 * 我的点评卡片：展示单条商品点评，点击进入该菜品详情
 * @param {Object} review - { id, product_id, product_name, shop_name, rating, content, created_at, images }
 */
function ReviewCard({ review }) {
  const { id, product_id, product_name, shop_name, rating, content, created_at, images } = review;
  const imgUrl = images?.length
    ? (images[0].url.startsWith('http') ? images[0].url : `${API_BASE_URL}${images[0].url}`)
    : null;
  const dateStr = created_at ? new Date(created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';

  return (
    <Link to={`/eat/food/${product_id}`} className="review-card-wrap" aria-label={`查看 ${product_name} 详情`}>
      <Card as="div" className="review-card">
        <div className="review-card-main">
          {imgUrl && (
            <div className="review-card-image-wrap">
              <img src={imgUrl} alt="" className="review-card-image" />
            </div>
          )}
          <div className="review-card-body">
            <p className="review-card-shop">{shop_name}</p>
            <p className="review-card-product">{product_name}</p>
            <p className="review-card-rating">{rating}</p>
            {content && <p className="review-card-content">{content}</p>}
            {dateStr && <p className="review-card-date">{dateStr}</p>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default ReviewCard;
