import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import Card from '../components/Card';
import FoodDetailView from '../components/FoodDetailView';
import EmptyState from '../components/EmptyState';
import ImagePreview from '../components/ImagePreview';
import LikeBurst from '../components/LikeBurst';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import DetailPageLayout from '../components/templates/DetailPageLayout';
import { useAuth } from '../context/AuthContext';
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
} from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { formatRatingLabel } from '@shared/constants/rating';
import { DEFAULT_PRODUCT_IMAGE_PATH, productImageUrl } from '@shared/api/config';
import { QK } from '@shared/query/queryKeys';
import './FoodDetail.css';

const STALE_PRODUCT_MS = 3 * 60 * 1000;
const STALE_COMMENTS_MS = 2 * 60 * 1000;

function mapCommentsToReviews(list) {
  return (list || []).map((review) => ({
    ...review,
    userName: review.authorName ?? '匿名 Anonymous',
    images: (review.images || []).map((item) => (typeof item === 'string' ? item : item?.url)).filter(Boolean),
    replies: (review.replies || []).map((reply) => ({
      ...reply,
      userName: reply.authorName ?? '匿名 Anonymous',
    })),
  }));
}

export default function FoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, user, isAdmin } = useAuth();
  const [replyingTo, setReplyingTo] = useState(null);
  const [newReply, setNewReply] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [likedReviewIds, setLikedReviewIds] = useState(new Set());
  const [reviewLikeCounts, setReviewLikeCounts] = useState({});
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const likeBurstRef = useRef(null);

  const productId = useMemo(() => {
    const value = id ? parseInt(id, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [id]);

  const productQuery = useQuery({
    queryKey: QK.canteenProduct(productId),
    queryFn: () => getProduct(productId),
    enabled: productId > 0,
    staleTime: STALE_PRODUCT_MS,
    select: (data) => {
      if (!data) return null;
      const images = data?.images ?? [];
      const firstImage = productImageUrl(images[0]?.url);
      return {
        id: data.id,
        shop_id: data.shop_id,
        name: data.name,
        description: data.description ?? undefined,
        price: data.price,
        image: firstImage,
        comprehensiveScore: data.comprehensive_score != null ? Number(data.comprehensive_score) : null,
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
  const favorited = !isLoggedIn ? false : favoriteQuery.data ?? false;

  const heroImage = useMemo(() => {
    const productImage = food?.image ? productImageUrl(food.image) : DEFAULT_PRODUCT_IMAGE_PATH;
    if (productImage && productImage !== DEFAULT_PRODUCT_IMAGE_PATH) return productImage;
    for (const review of reviews || []) {
      const images = Array.isArray(review?.images) ? review.images : [];
      const first = images.find((item) => typeof item === 'string' && item.trim() !== '');
      if (first) return first;
    }
    return DEFAULT_PRODUCT_IMAGE_PATH;
  }, [food?.image, reviews]);

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
    if (requireLogin()) return;
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
  const cancelReply = () => {
    setReplyingTo(null);
    setNewReply('');
  };

  const handleSubmitReply = (event) => {
    event.preventDefault();
    if (requireLogin()) return;
    if (!replyingTo || !newReply.trim() || !productId) return;
    setSubmitLoading(true);
    postProductComment(productId, { content: newReply.trim(), parent_id: replyingTo.id })
      .then(() => {
        setNewReply('');
        setReplyingTo(null);
        queryClient.invalidateQueries({ queryKey: QK.canteenProductComments(productId) });
      })
      .catch((error) => {
        Toast.error(getApiErrorMessage(error));
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  const handleDeleteReview = async (commentId) => {
    if (requireLogin() || !productId) return;
    if (!window.confirm('确定要删除这条点评/回复吗？删除后不可恢复。')) return;
    try {
      await deleteProductComment(productId, commentId);
      Toast.success('已删除');
      queryClient.invalidateQueries({ queryKey: QK.canteenProductComments(productId) });
    } catch (error) {
      Toast.error(getApiErrorMessage(error));
    }
  };

  const totalReviews = reviews.length;
  const ratingDisplay = food.comprehensiveScore != null ? ((Number(food.comprehensiveScore) / 10) * 5).toFixed(1) : null;
  const metaItems = [
    { key: 'price', label: `RM ${typeof food.price === 'number' ? food.price.toFixed(2) : String(food.price ?? '-')}` },
    { key: 'rating', label: ratingDisplay != null ? `⭐ ${ratingDisplay}` : '暂无评分' },
    { key: 'reviews', label: `${totalReviews} Reviews` },
  ];

  return (
    <div className="food-detail-page">
      <DetailPageLayout
        className="food-detail-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow="Campus Canteen"
            title={food.name}
            description={food.description || 'See the dish first, then decide from price, score and recent student reviews.'}
            backTo={food.shop_id ? `/eat/merchant/${food.shop_id}` : '/eat'}
            backLabel="Back"
            meta={metaItems}
            actions={(
              <>
                <Button variant="secondary" size="sm" onClick={handleReview}>
                  去点评
                </Button>
                {isAdmin ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
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
                      } catch (error) {
                        Toast.error(getApiErrorMessage(error));
                      }
                    }}
                  >
                    删除商品
                  </Button>
                ) : null}
              </>
            )}
          />
        )}
        hero={(
          <>
            <FoodDetailView
              food={{ ...food, image: heroImage }}
              onImageClick={() => setImagePreviewOpen(true)}
              canDelete={false}
              showSummary={false}
            />
            {imagePreviewOpen ? (
              <ImagePreview
                urls={[heroImage]}
                initialIndex={0}
                onClose={() => setImagePreviewOpen(false)}
              />
            ) : null}
          </>
        )}
        content={(
          <Card className="food-detail-summary-card">
            <div className="food-detail-summary-card__header">
              <Tag tone="canteen" variant="soft">Dish Snapshot</Tag>
              {favorited ? <Tag tone="default" variant="outline">Favorited</Tag> : null}
            </div>
            <div className="food-detail-summary-card__body">
              <p className="food-detail-summary-card__price">
                RM {typeof food.price === 'number' ? food.price.toFixed(2) : String(food.price ?? '-')}
              </p>
              <p className="food-detail-summary-card__rating">
                {ratingDisplay != null ? `综合展示 ${ratingDisplay} / 5` : '还没有足够评分'}
              </p>
              {food.description ? <p className="food-detail-summary-card__desc">{food.description}</p> : null}
            </div>
          </Card>
        )}
        meta={(
          <Card className="food-detail-action-card">
            <SectionHeader
              title="Quick Actions"
              description="把最常用操作固定在正文下方，桌面浏览时更顺手。"
            />
            <div className="food-detail-action-card__actions">
              <button
                type="button"
                className="food-detail-floatbtn"
                onClick={handleReview}
                aria-label="去点评 Review"
              >
                去点评 <span className="food-detail-floatbtn-sub">Review</span>
              </button>
              <button
                type="button"
                className={`food-detail-floatbtn food-detail-floatbtn--fav ${favorited ? 'is-favorited' : ''}`}
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
                  } catch (error) {
                    Toast.error(getApiErrorMessage(error));
                  }
                }}
                aria-label={favorited ? '取消收藏 Favorite' : '收藏 Favorite'}
                aria-pressed={favorited}
              >
                <span className="food-detail-fav-heart" aria-hidden>
                  {favorited ? '♥' : '♡'}
                </span>
                收藏 <span className="food-detail-floatbtn-sub">Favorite</span>
              </button>
            </div>
          </Card>
        )}
        comments={(
          <section className="food-detail-reviews" aria-label="点评列表">
            <SectionHeader
              title={`Reviews (${totalReviews})`}
              description="保留点评、回复、点赞和删除逻辑，只把详情页结构整理成统一模板。"
            />
            <div className="food-detail-wave" aria-hidden />
            {reviewError ? <p className="food-detail-reviews-error state-error">{reviewError}</p> : null}
            {reviewsLoading ? (
              <p className="food-detail-reviews-loading state-loading">加载点评中…</p>
            ) : totalReviews === 0 ? (
              <div className="food-detail-empty-reviews" aria-label="暂无点评">
                <svg className="food-detail-empty-illus" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M16 34c0 10 8 18 16 18s16-8 16-18" fill="none" stroke="rgba(100,116,139,0.45)" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M14 34h36" fill="none" stroke="rgba(100,116,139,0.25)" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M26 20c-2 3-2 6 0 9M34 18c-2 3-2 6 0 9M42 20c-2 3-2 6 0 9" fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <div className="food-detail-empty-title">暂无点评</div>
                <div className="food-detail-empty-sub">No reviews yet</div>
                <button type="button" className="food-detail-empty-cta pressable" onClick={handleReview}>
                  写下第一条点评 Write the first review
                </button>
              </div>
            ) : (
              <ul className="food-detail-review-list">
                {reviews.map((review) => (
                  <li key={review.id} className="food-detail-review">
                    <div className="food-detail-review-head">
                      <span className="food-detail-review-user">{review.userName}</span>
                      <span className="food-detail-review-rating">{formatRatingLabel(review.rating)}</span>
                    </div>
                    <p className="food-detail-review-content">{review.content}</p>
                    {review.images && review.images.length > 0 ? (
                      <div className="food-detail-review-images">
                        {review.images.map((url, index) => (
                          <span key={index} className="food-detail-review-image-wrap">
                            {url ? <img src={url} alt="" className="food-detail-review-image" /> : <span className="food-detail-review-image-placeholder">图</span>}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="food-detail-review-meta">
                      <button
                        type="button"
                        className={`food-detail-review-like ${likedReviewIds.has(review.id) ? 'is-liked' : ''}`}
                        onClick={(event) => {
                          likeBurstRef.current?.trigger(event);
                          handleLikeReview(review.id);
                        }}
                        aria-pressed={likedReviewIds.has(review.id)}
                      >
                        ♥ {reviewLikeCounts[review.id] ?? review.likeCount ?? 0}
                      </button>
                      <button
                        type="button"
                        className="food-detail-review-reply-btn"
                        onClick={() => startReply(review)}
                      >
                        回复 Reply
                      </button>
                      {review.userId === user?.id || isAdmin ? (
                        <button
                          type="button"
                          className="food-detail-review-delete"
                          onClick={() => handleDeleteReview(review.id)}
                          aria-label="删除点评"
                          title="删除点评"
                        >
                          <span aria-hidden>🗑</span>
                        </button>
                      ) : null}
                    </div>
                    {review.replies && review.replies.length > 0 ? (
                      <ul className="food-detail-reply-list">
                        {review.replies.map((reply) => (
                          <li key={reply.id} className="food-detail-reply">
                            <p className="food-detail-reply-content">
                              <span className="food-detail-reply-user">{reply.userName}</span>：{reply.content}
                            </p>
                            {reply.userId === user?.id || isAdmin ? (
                              <button
                                type="button"
                                className="food-detail-reply-delete"
                                onClick={() => handleDeleteReview(reply.id)}
                              >
                                删除
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        aside={(
          <>
            <Card className="food-detail-aside-card">
              <SectionHeader
                title="Snapshot"
                description="把价格、评分、点评量集中到右侧，方便桌面浏览快速扫描。"
              />
              <div className="food-detail-aside-card__stats">
                <div className="food-detail-aside-card__stat">
                  <span className="food-detail-aside-card__label">Price</span>
                  <strong>RM {typeof food.price === 'number' ? food.price.toFixed(2) : String(food.price ?? '-')}</strong>
                </div>
                <div className="food-detail-aside-card__stat">
                  <span className="food-detail-aside-card__label">Score</span>
                  <strong>{ratingDisplay != null ? `${ratingDisplay} / 5` : 'N/A'}</strong>
                </div>
                <div className="food-detail-aside-card__stat">
                  <span className="food-detail-aside-card__label">Reviews</span>
                  <strong>{totalReviews}</strong>
                </div>
              </div>
            </Card>
            <Card className="food-detail-aside-card">
              <SectionHeader
                title="Next Step"
                description="引导用户从详情继续走向点评或回到商家页。"
              />
              <div className="food-detail-aside-card__links">
                {food.shop_id ? (
                  <Button as={Link} to={`/eat/merchant/${food.shop_id}`} variant="secondary" size="sm" block>
                    返回商家页
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" block onClick={handleReview}>
                  写点评
                </Button>
              </div>
            </Card>
          </>
        )}
      />

      {replyingTo ? (
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
              onChange={(event) => setNewReply(event.target.value)}
              maxLength={500}
            />
            <button type="submit" className="food-detail-send" disabled={!newReply.trim() || submitLoading}>
              {submitLoading ? '发送中…' : '发送 Send'}
            </button>
          </div>
        </form>
      ) : null}

      <LikeBurst ref={likeBurstRef} />
    </div>
  );
}
