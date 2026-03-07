import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFoodById } from '../data/mockCanteen';
import './FoodReviewPublish.css';

/** 评级选项：从高到低 */
const RATING_OPTIONS = [
  { value: 5, label: '夯爆了' },
  { value: 4, label: '人上人' },
  { value: 3, label: '顶尖' },
  { value: 2, label: 'NPC' },
  { value: 1, label: '拉完了' },
];

/** 菜品点评发布页：评级 + 评论 + 买家秀，提交后返回菜品详情或我的点评 */
function FoodReviewPublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const food = getFoodById(id);

  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - images.length);
    if (files.length === 0) return;
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...newUrls].slice(0, 3));
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating == null) {
      setMessage({ text: '请选择评级 Please select a rating', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    if (!comment.trim()) {
      setMessage({ text: '请填写评论 Please write a review', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    // TODO: 调用发布点评 API
    console.log('发布点评', { foodId: id, rating, comment: comment.trim(), imageCount: images.length });
    showMsg('点评已发布 Review published');
    setTimeout(() => navigate(`/eat/food/${id}`, { replace: true }), 600);
  };

  if (!food) {
    return (
      <div className="food-review-publish-page">
        <p className="food-review-publish-empty">菜品不存在 Food not found</p>
        <button type="button" className="food-review-publish-back" onClick={() => navigate(-1)}>
          返回 Back
        </button>
      </div>
    );
  }

  return (
    <div className="food-review-publish-page">
      <p className="food-review-publish-hint">
        正在点评：{food.name} · Reviewing: {food.name}
      </p>

      <form className="food-review-publish-form" onSubmit={handleSubmit}>
        <div className="food-review-publish-section">
          <label className="food-review-publish-label">评级 Rating *</label>
          <div className="food-review-publish-rating-row" role="group" aria-label="选择评级">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`food-review-publish-rating-btn ${rating === opt.value ? 'active' : ''}`}
                onClick={() => setRating(opt.value)}
                aria-pressed={rating === opt.value}
                aria-label={opt.label}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="food-review-publish-section">
          <label className="food-review-publish-label" htmlFor="food-review-comment">
            评论 Comment *
          </label>
          <textarea
            id="food-review-comment"
            className="food-review-publish-textarea"
            placeholder="说说你的用餐体验… Share your experience…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
          />
        </div>

        <div className="food-review-publish-section">
          <label className="food-review-publish-label">买家秀 Buyer show（选填 optional，最多 3 张）</label>
          <div className="food-review-publish-images">
            {images.map((url, i) => (
              <div key={url} className="food-review-publish-image-wrap">
                <img src={url} alt="" className="food-review-publish-image" />
                <button
                  type="button"
                  className="food-review-publish-image-remove"
                  onClick={() => removeImage(i)}
                  aria-label="移除 Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <label className="food-review-publish-image-add">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="food-review-publish-file-input"
                />
                <span className="food-review-publish-image-add-inner">+</span>
              </label>
            )}
          </div>
        </div>

        {message.text && (
          <p className={`food-review-publish-message food-review-publish-message-${message.type}`}>
            {message.text}
          </p>
        )}

        <button type="submit" className="food-review-publish-submit">
          发布点评 Publish Review
        </button>
      </form>
    </div>
  );
}

export default FoodReviewPublish;
