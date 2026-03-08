import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/users';
import { getMyProductReviews } from '../api/canteen';
import { API_BASE_URL } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import EmptyState from '../components/EmptyState';
import './MyZone.css';

const TAB_POSTS = 'posts';
const TAB_REVIEWS = 'reviews';
const TAB_FAVORITES = 'favorites';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

/** 个人中心：小红书风格 - 沉浸式头部(头像作背景)、功能卡片、Tab、内容网格 */
function MyZone() {
  const navigate = useNavigate();
  const {
    isLoggedIn,
    isMerchant,
    displayName,
    displayAvatar,
    user,
    userLoading,
    userError,
    refreshUser,
    logout,
  } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_POSTS);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [reviewsError, setReviewsError] = useState(null);

  const avatarBg = displayAvatar ? prefixAvatar(displayAvatar) : '';

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    let cancelled = false;
    setPostsLoading(true);
    setPostsError(null);
    getProfile(user.id, { page: 1, pageSize: 50 })
      .then((data) => {
        if (cancelled) return;
        const raw = data?.posts ?? data?.postList ?? [];
        const list = raw.map((p) => ({
          ...p,
          author: data.user
            ? {
                ...data.user,
                avatar: data.user.avatar && !data.user.avatar.startsWith('http')
                  ? `${API_BASE_URL}${data.user.avatar}`
                  : data.user.avatar,
              }
            : null,
        }));
        setPosts(list);
      })
      .catch((err) => {
        if (!cancelled) setPostsError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setPostsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setReviewsLoading(true);
    setReviewsError(null);
    getMyProductReviews({ page: 1, pageSize: 50 })
      .then((data) => {
        if (cancelled) return;
        setReviews(data?.list ?? []);
      })
      .catch((err) => {
        if (!cancelled) setReviewsError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const goLogin = () => navigate('/login', { state: { from: { pathname: '/myzone' } } });
  const goProfile = () => {
    if (!isLoggedIn) return goLogin();
    navigate('/myzone/profile');
  };
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const postCount = posts.length;
  const reviewCount = reviews.length;

  return (
    <div className="myzone-page">
      {/* 1. 沉浸式头部：头像作背景 + 渐变，头像+昵称+数据+编辑按钮 */}
      <header
        className="myzone-header"
        style={avatarBg ? { backgroundImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 100%), url(${avatarBg})` } : undefined}
      >
        <div className="myzone-header-inner">
          <div className="myzone-header-top" aria-hidden />
          <div className="myzone-header-body">
            <div className="myzone-header-avatar-wrap" onClick={isLoggedIn ? goProfile : goLogin}>
              {userLoading && !displayAvatar ? (
                <div className="myzone-header-avatar myzone-header-avatar-loading">…</div>
              ) : displayAvatar ? (
                <img src={prefixAvatar(displayAvatar)} alt="" className="myzone-header-avatar" />
              ) : (
                <img src="/default-avatar.svg" alt="" className="myzone-header-avatar myzone-header-avatar-default" />
              )}
            </div>
            <div className="myzone-header-card">
              <p className="myzone-header-name">
                {isLoggedIn ? (userLoading && !displayName ? '加载中…' : displayName) : '点击登录'}
              </p>
              <div className="myzone-header-stats">
                <span className="myzone-header-stat">
                  <strong>{postCount}</strong> 帖子
                </span>
                <span className="myzone-header-stat">
                  <strong>{reviewCount}</strong> 点评
                </span>
                {isMerchant && (
                  <Link to="/merchant/manage" className="myzone-header-stat myzone-header-stat-link">
                    <strong>店铺</strong>
                  </Link>
                )}
              </div>
            </div>
            <button type="button" className="myzone-header-edit" onClick={goProfile}>
              {isLoggedIn ? '编辑资料' : '去登录'}
            </button>
          </div>
        </div>
      </header>

      {userError && (
        <p className="myzone-error" role="alert">
          {userError}
        </p>
      )}

      {/* 2. 功能入口：3 个卡片（前两个切换 Tab，收藏占位） */}
      <section className="myzone-entries" aria-label="功能入口">
        <button type="button" className="myzone-entry myzone-entry-btn" onClick={() => setActiveTab(TAB_POSTS)}>
          <span className="myzone-entry-icon" aria-hidden>📝</span>
          <span className="myzone-entry-label">我的帖子</span>
        </button>
        <button type="button" className="myzone-entry myzone-entry-btn" onClick={() => setActiveTab(TAB_REVIEWS)}>
          <span className="myzone-entry-icon" aria-hidden>⭐</span>
          <span className="myzone-entry-label">我的点评</span>
        </button>
        <div className="myzone-entry myzone-entry-disabled" aria-disabled="true">
          <span className="myzone-entry-icon" aria-hidden>❤️</span>
          <span className="myzone-entry-label">我的收藏</span>
          <span className="myzone-entry-hint">敬请期待</span>
        </div>
      </section>

      {/* 3. 内容 Tab 栏 */}
      <div className="myzone-tabs" role="tablist" aria-label="内容切换">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_POSTS}
          className={`myzone-tab ${activeTab === TAB_POSTS ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_POSTS)}
        >
          帖子
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_REVIEWS}
          className={`myzone-tab ${activeTab === TAB_REVIEWS ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_REVIEWS)}
        >
          点评
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_FAVORITES}
          className={`myzone-tab ${activeTab === TAB_FAVORITES ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_FAVORITES)}
        >
          收藏
        </button>
      </div>

      {/* 4. 内容展示区：网格 2px gap */}
      <section className="myzone-content" role="tabpanel">
        {activeTab === TAB_POSTS && (
          <div className="myzone-grid-wrap">
            {!isLoggedIn ? (
              <EmptyState
                title="请先登录"
                description="登录后查看我的帖子。"
                actionLabel="去登录"
                actionTo="/login"
              />
            ) : postsLoading ? (
              <p className="myzone-loading">加载中…</p>
            ) : postsError ? (
              <p className="myzone-error-inline">{postsError}</p>
            ) : posts.length === 0 ? (
              <EmptyState
                title="暂无帖子"
                description="去发布第一条吧"
                actionLabel="去发布"
                actionTo="/post/new"
              />
            ) : (
              <div className="myzone-grid">
                {posts.map((post) => (
                  <PostGridItem key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === TAB_REVIEWS && (
          <div className="myzone-grid-wrap">
            {!isLoggedIn ? (
              <EmptyState
                title="请先登录"
                description="登录后查看我的点评。"
                actionLabel="去登录"
                actionTo="/login"
              />
            ) : reviewsLoading ? (
              <p className="myzone-loading">加载中…</p>
            ) : reviewsError ? (
              <p className="myzone-error-inline">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <EmptyState
                title="暂无点评"
                description="去食堂给喜欢的菜品写一条吧。"
                actionLabel="去食堂"
                actionTo="/eat"
              />
            ) : (
              <div className="myzone-grid myzone-grid-reviews">
                {reviews.map((r) => (
                  <ReviewGridItem key={r.id} review={r} />
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === TAB_FAVORITES && (
          <div className="myzone-grid-wrap">
            <EmptyState title="暂无收藏" description="收藏功能敬请期待。" />
          </div>
        )}
      </section>

      {isLoggedIn && (
        <button type="button" className="myzone-logout" onClick={handleLogout}>
          退出登录
        </button>
      )}
    </div>
  );
}

function PostGridItem({ post }) {
  const firstImg = post.images?.[0]?.url;
  const imgUrl = firstImg && !firstImg.startsWith('http') ? `${API_BASE_URL}${firstImg}` : firstImg;
  const likeNum = post.like_count ?? post.likeCount ?? 0;
  const commentNum = post.comment_count ?? post.commentCount ?? 0;

  return (
    <Link to={`/post/${post.id}`} className="myzone-grid-item myzone-grid-item-post">
      <div className="myzone-grid-item-media">
        {imgUrl ? (
          <img src={imgUrl} alt="" />
        ) : (
          <div className="myzone-grid-item-placeholder">📝</div>
        )}
        <span className="myzone-grid-item-meta">
          ♥ {likeNum} 💬 {commentNum}
        </span>
      </div>
    </Link>
  );
}

function ReviewGridItem({ review }) {
  const { product_id, product_name, shop_name, rating, product_image, images } = review;
  // 优先用商品卖家秀，其次用点评附图
  const raw = product_image ?? (images?.length ? (images[0]?.url ?? images[0]) : null);
  const imgUrl = raw && typeof raw === 'string'
    ? (raw.startsWith('http') ? raw : `${API_BASE_URL}${raw}`)
    : raw?.url ? (raw.url.startsWith('http') ? raw.url : `${API_BASE_URL}${raw.url}`) : null;

  return (
    <Link to={`/eat/food/${product_id}`} className="myzone-grid-item myzone-grid-item-review">
      <div className="myzone-grid-item-media">
        {imgUrl ? (
          <img src={imgUrl} alt="" />
        ) : (
          <div className="myzone-grid-item-placeholder myzone-grid-item-placeholder-review">无图</div>
        )}
        <span className="myzone-grid-item-title">{product_name}</span>
        <span className="myzone-grid-item-rating">{rating}</span>
      </div>
    </Link>
  );
}

export default MyZone;
