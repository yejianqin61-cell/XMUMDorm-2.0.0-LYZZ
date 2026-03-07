import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FoodDetailView from '../components/FoodDetailView';
import { getFoodById, getReviewsByFoodId, RATING_LABELS } from '../data/mockCanteen';
import './FoodDetail.css';

/** 用户端菜品详情页：菜品信息 + 去点评/收藏 + 点评列表（含回复发布二级评论）；一级可点赞，二级仅展示无点赞 */
function FoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const food = getFoodById(id);
  const [favorited, setFavorited] = useState(false);
  const [reviews, setReviews] = useState(() => getReviewsByFoodId(id));
  const [replyingTo, setReplyingTo] = useState(null); // { id, userName }
  const [newReply, setNewReply] = useState('');
  const [likedReviewIds, setLikedReviewIds] = useState(new Set());
  const [reviewLikeCounts, setReviewLikeCounts] = useState(() => {
    const o = {};
    (getReviewsByFoodId(id) || []).forEach((r) => { o[r.id] = r.likeCount; });
    return o;
  });

  const requireLogin = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/eat/food/${id}` } }, replace: true });
      return true;
    }
    return false;
  };

  if (!food) {
    return (
      <div className="food-detail-page">
        <p className="food-detail-empty">菜品不存在 Food not found</p>
        <button type="button" className="food-detail-back-btn" onClick={() => navigate(-1)}>
          返回 Back
        </button>
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
    const reply = {
      id: Date.now(),
      reviewId: replyingTo.id,
      userId: 0,
      userName: '我',
      content: newReply.trim(),
    };
    setReviews((prev) =>
      prev.map((r) =>
        r.id === replyingTo.id
          ? { ...r, replies: [...(r.replies || []), reply] }
          : r
      )
    );
    setNewReply('');
    setReplyingTo(null);
  };

  const totalReviews = reviews.length;

  return (
    <div className="food-detail-page">
      <FoodDetailView food={food} />
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
          onClick={() => setFavorited((prev) => !prev)}
          aria-label={favorited ? '取消收藏' : '收藏'}
          aria-pressed={favorited}
        >
          <span className="food-detail-btn-fav-icon" aria-hidden>{favorited ? '♥' : '♡'}</span>
          收藏 Favorite
        </button>
      </div>

      <section className="food-detail-reviews" aria-label="点评列表">
        <h2 className="food-detail-reviews-title">点评 Reviews ({totalReviews})</h2>
        {totalReviews === 0 ? (
          <p className="food-detail-reviews-empty">暂无点评，快来第一条吧 No reviews yet.</p>
        ) : (
          <ul className="food-detail-review-list">
            {reviews.map((r) => (
              <li key={r.id} className="food-detail-review">
                <div className="food-detail-review-head">
                  <span className="food-detail-review-user">{r.userName}</span>
                  <span className="food-detail-review-rating">{RATING_LABELS[r.rating] ?? r.rating}</span>
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
                    onClick={() => handleLikeReview(r.id)}
                    aria-pressed={likedReviewIds.has(r.id)}
                  >
                    ♥ {reviewLikeCounts[r.id] ?? r.likeCount}
                  </button>
                  <button
                    type="button"
                    className="food-detail-review-reply-btn"
                    onClick={() => startReply(r)}
                  >
                    回复 Reply
                  </button>
                </div>
                {r.replies && r.replies.length > 0 && (
                  <ul className="food-detail-reply-list">
                    {r.replies.map((rep) => (
                      <li key={rep.id} className="food-detail-reply">
                        <p className="food-detail-reply-content">
                          <span className="food-detail-reply-user">{rep.userName}</span>：{rep.content}
                        </p>
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
          <button type="submit" className="food-detail-send" disabled={!newReply.trim()}>
            发送 Send
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

export default FoodDetail;
