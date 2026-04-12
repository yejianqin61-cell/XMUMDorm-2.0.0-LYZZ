import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProfile } from '../api/users';
import { getMyProductReviews, getMyFavorites } from '../api/canteen';
import { API_BASE_URL, productImageUrl } from '../api/config';
import { formatRatingLabel } from '../constants/rating';
import { getApiErrorMessage } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/EmptyState';
import './MyZone.css';

const TAB_POSTS = 'posts';
const TAB_REVIEWS = 'reviews';
const TAB_FAVORITES = 'favorites';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function UserZoneStrings(isZh) {
  return {
    loading: isZh ? '加载中…' : 'Loading…',
    userNotFound: isZh ? '用户不存在' : 'User not found',
    backHome: isZh ? '返回首页' : 'Home',
    postsStat: isZh ? '帖子' : 'Posts',
    tabPosts: isZh ? '帖子' : 'Posts',
    tabReviews: isZh ? '点评' : 'Reviews',
    tabFavorites: isZh ? '收藏' : 'Favorites',
    postsEmptyTitle: isZh ? '暂无帖子' : 'No posts yet',
    postsEmptyDesc: isZh ? '还没有发布内容。' : 'No posts yet.',
    postsEmptyOwn: isZh ? '发第一条吧。' : 'Post your first one.',
    postNow: isZh ? '去发布' : 'Post now',
    reviewsEmptyTitle: isZh ? '暂无点评' : 'No reviews yet',
    reviewsEmptyDesc: isZh ? '去给喜欢的菜品写点评。' : 'Go review your favorite dishes.',
    eatNow: isZh ? '去食堂' : 'Eat now',
    favEmptyTitle: isZh ? '暂无收藏' : 'No favorites yet',
    favEmptyDesc: isZh ? '在食堂收藏喜欢的菜品。' : 'Favorite dishes in the canteen.',
    logOut: isZh ? '退出登录' : 'Log out',
  };
}

/** 个人空间 /user/:id：帖子（公开）；点评与收藏仅本人登录后可见（接口为 my-*） */
function UserZone() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = UserZoneStrings(isZh);
  const { user, isLoggedIn, logout } = useAuth();

  const userId = id ? parseInt(id, 10) : 0;
  const isOwnProfile = Boolean(isLoggedIn && user && Number(user.id) === userId);

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState(TAB_POSTS);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState(null);

  useEffect(() => {
    if (!isOwnProfile && (activeTab === TAB_REVIEWS || activeTab === TAB_FAVORITES)) {
      setActiveTab(TAB_POSTS);
    }
  }, [isOwnProfile, activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError(isZh ? '用户不存在' : 'User not found');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfile(userId, { page: 1, pageSize: 50 })
      .then((profileData) => {
        if (cancelled) return;
        const u = profileData?.user || null;
        setProfileUser(u ? { ...u, avatar: u.avatar ? prefixAvatar(u.avatar) : null } : null);
        const rawPosts = profileData?.posts ?? profileData?.postList ?? [];
        const postList = rawPosts.map((p) => ({
          ...p,
          author: u
            ? {
                ...u,
                avatar: u.avatar && !u.avatar.startsWith('http') ? `${API_BASE_URL}${u.avatar}` : u.avatar,
              }
            : null,
        }));
        setPosts(postList);
        const cnt = profileData?.stats?.post_count;
        setPostCount(Number.isFinite(Number(cnt)) ? Number(cnt) : postList.length);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, isZh]);

  useEffect(() => {
    if (!isOwnProfile) return;
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
  }, [isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile) return;
    let cancelled = false;
    setFavoritesLoading(true);
    setFavoritesError(null);
    getMyFavorites({ page: 1, pageSize: 50 })
      .then((data) => {
        if (cancelled) return;
        setFavorites(data?.list ?? []);
      })
      .catch((err) => {
        if (!cancelled) setFavoritesError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setFavoritesLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOwnProfile]);

  if (!userId) {
    return (
      <div className="myzone-page">
        <EmptyState
          title={t.userNotFound}
          description={t.userNotFound}
          actionLabel={t.backHome}
          actionTo="/"
        />
      </div>
    );
  }

  if (loading && !profileUser) {
    return (
      <div className="myzone-page">
        <p className="myzone-loading">{t.loading}</p>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="myzone-page">
        <p className="myzone-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  const avatarBg = profileUser?.avatar ? prefixAvatar(profileUser.avatar) : '';
  const displayName = profileUser?.nickname ?? profileUser?.username ?? (isZh ? '未设置' : 'Not set');
  const showTabs = isOwnProfile;

  return (
    <div className="myzone-page">
      <header
        className="myzone-header"
        style={avatarBg ? { backgroundImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 100%), url(${avatarBg})` } : undefined}
      >
        <div className="myzone-header-inner">
          <div className="myzone-header-top" aria-hidden />
          <div className="myzone-header-body">
            <div className="myzone-header-avatar-wrap" onClick={() => {}}>
              {profileUser?.avatar ? (
                <img src={profileUser.avatar} alt="" className="myzone-header-avatar" />
              ) : (
                <img src="/default-avatar.svg" alt="" className="myzone-header-avatar myzone-header-avatar-default" />
              )}
            </div>
            <div className="myzone-header-card">
              <p className="myzone-header-name">
                {displayName}
              </p>
              <div className="myzone-header-stats">
                <span className="myzone-header-stat">
                  <strong>{postCount}</strong>
                  {' '}
                  {t.postsStat}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p className="myzone-error" role="alert">
          {error}
        </p>
      )}

      {showTabs && (
        <div className="myzone-tabs" role="tablist" aria-label={isZh ? '内容' : 'Content'}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_POSTS}
            className={`myzone-tab ${activeTab === TAB_POSTS ? 'active' : ''}`}
            onClick={() => setActiveTab(TAB_POSTS)}
          >
            {t.tabPosts}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_REVIEWS}
            className={`myzone-tab ${activeTab === TAB_REVIEWS ? 'active' : ''}`}
            onClick={() => setActiveTab(TAB_REVIEWS)}
          >
            {t.tabReviews}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_FAVORITES}
            className={`myzone-tab ${activeTab === TAB_FAVORITES ? 'active' : ''}`}
            onClick={() => setActiveTab(TAB_FAVORITES)}
          >
            {t.tabFavorites}
          </button>
        </div>
      )}

      <section className="myzone-content" role="tabpanel">
        {(!showTabs || activeTab === TAB_POSTS) && (
          <div className="myzone-grid-wrap">
            {posts.length === 0 ? (
              <EmptyState
                title={t.postsEmptyTitle}
                description={isOwnProfile ? t.postsEmptyOwn : t.postsEmptyDesc}
                actionLabel={isOwnProfile ? t.postNow : undefined}
                actionTo={isOwnProfile ? '/post/new' : undefined}
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

        {showTabs && activeTab === TAB_REVIEWS && (
          <div className="myzone-grid-wrap">
            {reviewsLoading ? (
              <p className="myzone-loading">{t.loading}</p>
            ) : reviewsError ? (
              <p className="myzone-error-inline">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <EmptyState
                title={t.reviewsEmptyTitle}
                description={t.reviewsEmptyDesc}
                actionLabel={t.eatNow}
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

        {showTabs && activeTab === TAB_FAVORITES && (
          <div className="myzone-grid-wrap">
            {favoritesLoading ? (
              <p className="myzone-loading">{t.loading}</p>
            ) : favoritesError ? (
              <p className="myzone-error-inline">{favoritesError}</p>
            ) : favorites.length === 0 ? (
              <EmptyState
                title={t.favEmptyTitle}
                description={t.favEmptyDesc}
                actionLabel={t.eatNow}
                actionTo="/eat"
              />
            ) : (
              <div className="myzone-grid myzone-grid-reviews">
                {favorites.map((item) => (
                  <FavoriteGridItem key={item.product_id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {isOwnProfile && (
        <div className="myzone-footer-actions">
          <button type="button" className="myzone-logout" onClick={handleLogout}>
            {t.logOut}
          </button>
        </div>
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
          ♥
          {likeNum}
          {' '}
          💬
          {commentNum}
        </span>
      </div>
    </Link>
  );
}

function ReviewGridItem({ review }) {
  const { product_id, product_name, rating, product_image, images } = review;
  const raw = product_image ?? (images?.length ? (images[0]?.url ?? images[0]) : null);
  const pathStr = typeof raw === 'string' ? raw : raw?.url ?? null;
  const imgUrl = productImageUrl(pathStr);

  return (
    <Link to={`/eat/food/${product_id}`} className="myzone-grid-item myzone-grid-item-review">
      <div className="myzone-grid-item-media">
        <img src={imgUrl} alt="" />
        <span className="myzone-grid-item-title">{product_name}</span>
        <span className="myzone-grid-item-rating">{formatRatingLabel(rating)}</span>
      </div>
    </Link>
  );
}

function FavoriteGridItem({ item }) {
  const { product_id, product_name, shop_name, product_image } = item;
  const imgUrl = productImageUrl(typeof product_image === 'string' ? product_image : null);

  return (
    <Link to={`/eat/food/${product_id}`} className="myzone-grid-item myzone-grid-item-review">
      <div className="myzone-grid-item-media">
        <img src={imgUrl} alt="" />
        <span className="myzone-grid-item-title">{product_name}</span>
        {shop_name && <span className="myzone-grid-item-shop">{shop_name}</span>}
      </div>
    </Link>
  );
}

export default UserZone;
