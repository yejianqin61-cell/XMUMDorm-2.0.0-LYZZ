import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { getProduct, postProductComment } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { useAuth } from '../context/AuthContext';
import './FoodReviewPublish.css';

/** 评级选项：与后端 RATING_ENUM 一致 */
const RATING_OPTIONS = [
  { value: '夯爆了', label: '夯爆了 amazing' },
  { value: '顶级', label: '顶级 excellent' },
  { value: '人上人', label: '人上人 great' },
  { value: 'NPC', label: 'NPC ordinary' },
  { value: '拉完了', label: '拉完了 just soso' },
];

/** 菜品点评发布页：评级 + 评论 + 买家秀，提交走 API */
function FoodReviewPublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, isMerchant, isAdmin } = useAuth();
  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    // 发布点评必须登录
    if (!isLoggedIn) {
      Toast.error('请先登录后再点评');
      navigate('/login', { replace: true, state: { from: { pathname: `/eat/food/${id}/review` } } });
      return;
    }
    // 商家账号不允许发一级点评（后端也会拦截），这里提前提示
    if (isMerchant && !isAdmin) {
      Toast.error('商家账号不能对商品发表一级点评');
      navigate(`/eat/food/${id}`, { replace: true });
    }
  }, [id, isAdmin, isLoggedIn, isMerchant, navigate]);

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
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

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
    if (!isLoggedIn) {
      Toast.error('请先登录后再点评');
      navigate('/login', { replace: true, state: { from: { pathname: `/eat/food/${id}/review` } } });
      return;
    }
    if (isMerchant && !isAdmin) {
      Toast.error('商家账号不能对商品发表一级点评');
      return;
    }
    if (rating == null || rating === '') {
      Toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      Toast.error('Please write a review');
      return;
    }
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) return;
    setSubmitLoading(true);
    postProductComment(productId, { rating, content: comment.trim(), imageFiles })
      .then(() => {
        Toast.success('Review published');
        setTimeout(() => navigate(`/eat/food/${id}`, { replace: true }), 600);
      })
      .catch((err) => {
        // 对于点评发布这种强业务场景，优先展示后端的具体报错信息
        Toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="food-review-publish-page">
        <p className="food-review-publish-loading state-loading">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="food-review-publish-page">
        <p className="food-review-publish-error state-error">{error}</p>
        <button type="button" className="food-review-publish-back" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="food-review-publish-page">
        <EmptyState
          title="Food not found"
          description="Food not found"
          actionLabel="Back"
          onActionClick={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="food-review-publish-page">
      <p className="food-review-publish-hint">
        Reviewing: {food.name}
      </p>

      <form className="food-review-publish-form" onSubmit={handleSubmit}>
        <div className="food-review-publish-section">
          <label className="food-review-publish-label">Rating *</label>
          <div className="food-review-publish-rating-row" role="group" aria-label="Select rating">
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
            Comment *
          </label>
          <textarea
            id="food-review-comment"
            className="food-review-publish-textarea"
            placeholder="Share your experience…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
          />
        </div>

        <div className="food-review-publish-section">
          <label className="food-review-publish-label">Buyer show (optional, up to 3 images)</label>
          <div className="food-review-publish-images">
            {previewUrls.map((url, i) => (
              <div key={url} className="food-review-publish-image-wrap">
                <img src={url} alt="" className="food-review-publish-image" />
                <button
                  type="button"
                  className="food-review-publish-image-remove"
                  onClick={() => removeImage(i)}
                  aria-label="Remove"
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


      </form>

      <div className="food-review-publish-submitbar-fixed" role="group" aria-label="发布点评">
        <button
          type="button"
          className="food-review-publish-submit"
          disabled={submitLoading}
          onClick={handleSubmit}
        >
          <span className="food-review-publish-submit-title">{submitLoading ? '发布中…' : '发布点评'}</span>
          <span className="food-review-publish-submit-sub">Publish review</span>
        </button>
      </div>
    </div>
  );
}

export default FoodReviewPublish;
