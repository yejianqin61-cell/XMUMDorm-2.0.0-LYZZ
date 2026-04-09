import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { formatRatingLabel } from '../constants/rating';
import { productImageUrl } from '../api/config';
import { QK } from '../query/queryKeys';
import './FoodDetail.css';

const STALE_PRODUCT_MS = 3 * 60 * 1000;
const STALE_COMMENTS_MS = 2 * 60 * 1000;

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
  const queryClient = useQueryClient();
  const { isLoggedIn, user, isAdmin } = useAuth();
  const [replyingTo, setReplyingTo] = useState(null); // { id, userName }
  const [newReply, setNewReply] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [likedReviewIds, setLikedReviewIds] = useState(new Set());
  const [reviewLikeCounts, setReviewLikeCounts] = useState({});
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const likeBurstRef = useRef(null);

  const productId = useMemo(() => {
    const n = id ? parseInt(id, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [id]);

  const productQuery = useQuery({
    queryKey: QK.canteenProduct(productId),
    queryFn: () => getProduct(productId),
    enabled: productId > 0,
    staleTime: STALE_PRODUCT_MS,
    select: (d) => {
      if (!d) return null;
      const imgs = d?.images ?? [];
      const firstImg = productImageUrl(imgs[0]?.url);
      return {
        id: d.id,
        shop_id: d.shop_id,
        name: d.name,
        description: d.description ?? undefined,
        price: d.price,
        image: firstImg,
        comprehensiveScore: d.comprehensive_score != null ? Number(d.comprehensive_score) : null,
      };
    },
  });

  const commentsQuery = useQuery({
    queryKey: QK.canteenProductComments(productId),
    queryFn: () => getProductComments(productId),
    enabled: productId > 0,
    staleTime: STALE_COMMENTS_MS,
    select: (list) => mapCommentsToReviews(list || []),
  });

  const favoriteQuery = useQuery({
    queryKey: QK.canteenProductFavorite(productId),
    queryFn: async () => {
      const data = await getProductFavoriteStatus(productId);
      return !!data?.favorited;
    },
    enabled: productId > 0 && isLoggedIn,
    staleTime: STALE_PRODUCT_MS,
  });

  const foodLoading = productId > 0 && productQuery.isPending;
  const foodError = productQuery.error ? getApiErrorMessage(productQuery.error) : null;
  const food = productQuery.data ?? null;

  const reviews = commentsQuery.data ?? [];
  const reviewsLoading = productId > 0 && commentsQuery.isPending;
  const reviewError = commentsQuery.error ? getApiErrorMessage(commentsQuery.error) : null;

  const favorited = !isLoggedIn ? false : (favoriteQuery.data ?? false);

  const requireLogin = () => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: { pathname: `/eat/food/${id}` } } });
      return true;
    }
    return false;
  };

  if (productId === 0 && !foodLoading) {
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
    if (!productId) return;
    setSubmitLoading(true);
    postProductComment(productId, { content: newReply.trim(), parent_id: replyingTo.id })
      .then(() => {
        setNewReply('');
        setReplyingTo(null);
        queryClient.invalidateQueries({ queryKey: QK.canteenProductComments(productId) });
      })
      .catch((err) => {
        Toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  const handleDeleteReview = async (commentId) => {
    if (requireLogin()) return;
    if (!productId) return;
    if (!window.confirm('确定要删除这条点评/回复吗？删除后不可恢复。')) return;
    try {
      await deleteProductComment(productId, commentId);
      Toast.success('已删除');
      queryClient.invalidateQueries({ queryKey: QK.canteenProductComments(productId) });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const totalReviews = reviews.length;

  return (
    <div className="food-detail-page">
      <FoodDetailView
        food={food}
        onImageClick={food ? () => setImagePreviewOpen(true) : undefined}
        canDelete={isAdmin}
        onDelete={async () => {
          if (!isAdmin) return;
          if (!food || !window.confirm(`确定删除 "${food.name}" 吗？删除后不可恢复。`)) return;
          try {
            await deleteProduct(food.id);
            if (food.shop_id != null) {
              queryClient.invalidateQueries({ queryKey: QK.canteenShop(food.shop_id) });
              queryClient.invalidateQueries({ queryKey: QK.canteenShopCategories(food.shop_id) });
              queryClient.invalidateQueries({ queryKey: QK.canteenShopProducts(food.shop_id) });
              queryClient.invalidateQueries({ queryKey: QK.canteenShopHotProducts(food.shop_id) });
            } else {
              queryClient.invalidateQueries({ queryKey: ['canteen', 'shop'] });
            }
            queryClient.removeQueries({ queryKey: QK.canteenProduct(food.id) });
            Toast.success('商品已删除');
            navigate(-1);
          } catch (err) {
            Toast.error(getApiErrorMessage(err));
          }
        }}
      />
      {imagePreviewOpen && food && (
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
            const pid = food?.id;
            if (!pid) return;
            try {
              if (favorited) {
                await removeFavoriteProduct(pid);
                queryClient.setQueryData(QK.canteenProductFavorite(pid), false);
                Toast.success('已取消收藏');
              } else {
                await addFavoriteProduct(pid);
                queryClient.setQueryData(QK.canteenProductFavorite(pid), true);
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
                  <span className="food-detail-review-rating">{formatRatingLabel(r.rating)}</span>
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
