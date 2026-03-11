import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FoodDetailView from '../components/FoodDetailView';
import EmptyState from '../components/EmptyState';
import ImagePreview from '../components/ImagePreview';
import LikeBurst from '../components/LikeBurst';
import { Toast } from '../context/ToastContext';
import {
  getProduct,
  getProductComments,
  postProductComment,
  deleteProductComment,
  deleteProduct,
  getProductFavoriteStatus,
  addFavoriteProduct,
  removeFavoriteProduct,
} from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { RATING_LABELS } from '../constants/rating';
import { getUploadUrl } from '../api/config';
import './FoodDetail.css';

/** 将 API 点评树转为页面使用的结构（userName、images 为 url 数组） */
function mapCommentsToReviews(list) {
  return (list || []).map((r) => ({
    ...r,
    userName: r.authorName ?? '匿名 Anonymous',
    images: (r.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean),
    replies: (r.replies || []).map((rep) => ({
      ...rep,
      userName: rep.authorName ?? '匿名 Anonymous',
    })),
  }));
}

/** 用户端菜品详情页：菜品与点评均来自 API */
function FoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user, isAdmin } = useAuth();
  const [food, setFood] = useState(null);
  const [foodLoading, setFoodLoading] = useState(true);
  const [foodError, setFoodError] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewError, setReviewError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // { id, userName }
  const [newReply, setNewReply] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [likedReviewIds, setLikedReviewIds] = useState(new Set());
  const [reviewLikeCounts, setReviewLikeCounts] = useState({});
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const likeBurstRef = useRef(null);

  useEffect(() => {
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) {
      setFood(null);
      setFoodLoading(false);
      return;
    }
    let cancelled = false;
    setFoodLoading(true);
    setFoodError(null);
    getProduct(productId)
      .then((data) => {
        if (cancelled) return;
        const d = data;
        const imgs = d?.images ?? [];
        const firstImg = imgs.length ? getUploadUrl(imgs[0].url) : null;
        setFood({
          id: d.id,
          name: d.name,
          description: d.description ?? undefined,
          price: d.price,
          image: firstImg,
          comprehensiveScore: d.comprehensive_score != null ? Number(d.comprehensive_score) : null,
        });
      })
      .catch((err) => {
        if (!cancelled) setFoodError(err.message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setFoodLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId || !isLoggedIn) {
      if (!isLoggedIn) setFavorited(false);
      return;
    }
    let cancelled = false;
    getProductFavoriteStatus(productId)
      .then((data) => {
        if (!cancelled && data && typeof data.favorited === 'boolean') setFavorited(data.favorited);
      })
      .catch(() => {
        if (!cancelled) setFavorited(false);
      });
    return () => { cancelled = true; };
  }, [id, isLoggedIn]);

  const loadReviews = useCallback(() => {
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) return Promise.resolve();
    setReviewsLoading(true);
    setReviewError(null);
    return getProductComments(productId)
      .then((list) => {
        setReviews(mapCommentsToReviews(list));
      })
      .catch((err) => {
        setReviewError(getApiErrorMessage(err));
      })
      .finally(() => {
        setReviewsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const requireLogin = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/eat/food/${id}` } }, replace: true });
      return true;
    }
    return false;
  };

  if (foodLoading) {
    return (
      <div className="food-detail-page">
        <p className="food-detail-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (foodError) {
    return (
      <div className="food-detail-page">
        <p className="food-detail-error state-error">{foodError}</p>
        <button type="button" className="food-detail-back-btn" onClick={() => navigate(-1)}>
          返回 Back
        </button>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="food-detail-page">
        <EmptyState
          title="菜品不存在"
          description="Food not found"
          actionLabel="返回"
          onActionClick={() => navigate(-1)}
        />
      </div>
    );
  }

  const handleReview = () => {
    navigate(`/eat/food/${id}/review`);
  };

  const handleLikeReview = (reviewId) => {
    if (requireLogin()) return;
    setLikedReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
    setReviewLikeCounts((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] ?? 0) + (likedReviewIds.has(reviewId) ? -1 : 1),
    }));
  };

  const startReply = (review) => setReplyingTo({ id: review.id, userName: review.userName });
  const cancelReply = () => { setReplyingTo(null); setNewReply(''); };

  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (requireLogin()) return;
    if (!replyingTo || !newReply.trim()) return;
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) return;
    setSubmitLoading(true);
    setReviewError(null);
    postProductComment(productId, { content: newReply.trim(), parent_id: replyingTo.id })
      .then(() => {
        setNewReply('');
        setReplyingTo(null);
        return loadReviews();
      })
      .catch((err) => {
        setReviewError(getApiErrorMessage(err));
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  const handleDeleteReview = async (commentId) => {
    if (requireLogin()) return;
    const productId = id ? parseInt(id, 10) : 0;
    if (!productId) return;
    if (!window.confirm('确定要删除这条点评/回复吗？删除后不可恢复。')) return;
    try {
      await deleteProductComment(productId, commentId);
      Toast.success('已删除');
      await loadReviews();
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const totalReviews = reviews.length;

  return (
    <div className="food-detail-page">
      <FoodDetailView
        food={food}
        onImageClick={food?.image ? () => setImagePreviewOpen(true) : undefined}
        canDelete={isAdmin}
        onDelete={async () => {
          if (!isAdmin) return;
          if (!food || !window.confirm(`确定删除 "${food.name}" 吗？删除后不可恢复。`)) return;
          try {
            await deleteProduct(food.id);
            Toast.success('商品已删除');
            navigate(-1);
          } catch (err) {
            Toast.error(getApiErrorMessage(err));
          }
        }}
      />
      {imagePreviewOpen && food?.image && (
        <ImagePreview
          urls={[food.image]}
          initialIndex={0}
          onClose={() => setImagePreviewOpen(false)}
        />
      )}
      <div className="food-detail-actions">
        <button
          type="button"
          className="food-detail-btn food-detail-btn-review"
          onClick={handleReview}
          aria-label="去点评"
        >
          去点评 Review
        </button>
        <button
          type="button"
          className={`food-detail-btn food-detail-btn-fav ${favorited ? 'is-favorited' : ''}`}
          onClick={async () => {
            if (requireLogin()) return;
            const productId = food?.id;
            if (!productId) return;
            try {
              if (favorited) {
                await removeFavoriteProduct(productId);
                setFavorited(false);
                Toast.success('已取消收藏');
              } else {
                await addFavoriteProduct(productId);
                setFavorited(true);
                Toast.success('已收藏');
              }
            } catch (err) {
              Toast.error(getApiErrorMessage(err));
            }
          }}
          aria-label={favorited ? '取消收藏' : '收藏'}
          aria-pressed={favorited}
        >
          <span className="food-detail-btn-fav-icon" aria-hidden>{favorited ? '♥' : '♡'}</span>
          收藏 Favorite
        </button>
      </div>

      <section className="food-detail-reviews" aria-label="点评列表">
        <h2 className="food-detail-reviews-title">点评 Reviews ({totalReviews})</h2>
        {reviewError && <p className="food-detail-reviews-error state-error">{reviewError}</p>}
        {reviewsLoading ? (
          <p className="food-detail-reviews-loading state-loading">加载点评中…</p>
        ) : totalReviews === 0 ? (
          <EmptyState
            title="暂无点评"
            description="快来第一条吧 No reviews yet."
            actionLabel="去点评"
            onActionClick={handleReview}
          />
        ) : (
          <ul className="food-detail-review-list">
            {reviews.map((r) => (
              <li key={r.id} className="food-detail-review">
                <div className="food-detail-review-head">
                  <span className="food-detail-review-user">{r.userName}</span>
                  <span className="food-detail-review-rating">{typeof r.rating === 'number' ? (RATING_LABELS[r.rating] ?? r.rating) : r.rating}</span>
                </div>
                <p className="food-detail-review-content">{r.content}</p>
                {r.images && r.images.length > 0 && (
                  <div className="food-detail-review-images">
                    {r.images.map((url, i) => (
                      <span key={i} className="food-detail-review-image-wrap">
                        {url ? (
                          <img src={url} alt="" className="food-detail-review-image" />
                        ) : (
                          <span className="food-detail-review-image-placeholder">图</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <div className="food-detail-review-meta">
                  <button
                    type="button"
                    className={`food-detail-review-like ${likedReviewIds.has(r.id) ? 'is-liked' : ''}`}
                    onClick={(e) => {
                      likeBurstRef.current?.trigger(e);
                      handleLikeReview(r.id);
                    }}
                    aria-pressed={likedReviewIds.has(r.id)}
                  >
                    ♥ {reviewLikeCounts[r.id] ?? r.likeCount ?? 0}
                  </button>
                  <button
                    type="button"
                    className="food-detail-review-reply-btn"
                    onClick={() => startReply(r)}
                  >
                    回复 Reply
                  </button>
                  {(r.userId === user?.id || isAdmin) && (
                    <button
                      type="button"
                      className="food-detail-review-delete"
                      onClick={() => handleDeleteReview(r.id)}
                      aria-label="删除点评"
                      title="删除点评"
                    >
                      <span aria-hidden>🗑</span>
                    </button>
                  )}
                </div>
                {r.replies && r.replies.length > 0 && (
                  <ul className="food-detail-reply-list">
                    {r.replies.map((rep) => (
                      <li key={rep.id} className="food-detail-reply">
                        <p className="food-detail-reply-content">
                          <span className="food-detail-reply-user">{rep.userName}</span>：{rep.content}
                        </p>
                        {(rep.userId === user?.id || isAdmin) && (
                          <button
                            type="button"
                            className="food-detail-reply-delete"
                            onClick={() => handleDeleteReview(rep.id)}
                          >
                            删除
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {replyingTo && (
      <form className="food-detail-form" onSubmit={handleSubmitReply}>
        <div className="food-detail-replying">
            <span>回复 Reply：{replyingTo.userName}</span>
          <button type="button" onClick={cancelReply}>取消 Cancel</button>
        </div>
        <div className="food-detail-form-row">
          <input
            type="text"
            className="food-detail-input"
            placeholder="输入回复… Reply…"
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            maxLength={500}
          />
          <button type="submit" className="food-detail-send" disabled={!newReply.trim() || submitLoading}>
            {submitLoading ? '发送中…' : '发送 Send'}
          </button>
        </div>
      </form>
      )}
      <LikeBurst ref={likeBurstRef} />
    </div>
  );
}

export default FoodDetail;
