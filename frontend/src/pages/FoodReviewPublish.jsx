import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, postProductComment } from '../api/canteen';
import './FoodReviewPublish.css';

/** 评级选项：与后端 RATING_ENUM 一致 */
const RATING_OPTIONS = [
  { value: '夯爆了', label: '夯爆了' },
  { value: '人上人', label: '人上人' },
  { value: '顶级', label: '顶级' },
  { value: 'NPC', label: 'NPC' },
  { value: '拉完了', label: '拉完了' },
];

/** 菜品点评发布页：评级 + 评论 + 买家秀，提交走 API */
function FoodReviewPublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) {
      setFood(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(productId)
      .then((data) => {
        if (cancelled) return;
        setFood({ id: data.id, name: data.name });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - imageFiles.length);
    if (files.length === 0) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
    setPreviewUrls((prev) => [...prev, ...urls].slice(0, 3));
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating == null || rating === '') {
      setMessage({ text: '请选择评级 Please select a rating', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    if (!comment.trim()) {
      setMessage({ text: '请填写评论 Please write a review', type: 'error' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) return;
    setSubmitLoading(true);
    setMessage({ type: '', text: '' });
    postProductComment(productId, { rating, content: comment.trim(), imageFiles })
      .then(() => {
        showMsg('点评已发布 Review published');
        setTimeout(() => navigate(`/eat/food/${id}`, { replace: true }), 600);
      })
      .catch((err) => {
        setMessage({ text: err.message || '发布失败', type: 'error' });
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="food-review-publish-page">
        <p className="food-review-publish-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="food-review-publish-page">
        <p className="food-review-publish-error state-error">{error}</p>
        <button type="button" className="food-review-publish-back" onClick={() => navigate(-1)}>
          返回 Back
        </button>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="food-review-publish-page">
        <p className="food-review-publish-empty state-empty">菜品不存在 Food not found</p>
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
            {previewUrls.map((url, i) => (
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
            {previewUrls.length < 3 && (
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

        <button type="submit" className="food-review-publish-submit" disabled={submitLoading}>
          {submitLoading ? '发布中…' : '发布点评 Publish Review'}
        </button>
      </form>
    </div>
  );
}

export default FoodReviewPublish;
