import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getProfile } from '../api/users';
import { getMyProductReviews, getMyFavorites } from '../api/canteen';
import { API_BASE_URL, productImageUrl } from '../api/config';
import { formatRatingLabel } from '../constants/rating';
import { getApiErrorMessage } from '../utils/apiError';
import EmptyState from '../components/EmptyState';
import './MyZone.css';

const TAB_POSTS = 'posts';
const TAB_REVIEWS = 'reviews';
const TAB_FAVORITES = 'favorites';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function MyZoneStrings(isZh) {
  return {
    space: isZh ? '空间' : 'Space',
    tools: isZh ? '工具' : 'Tools',
    about: isZh ? '关于' : 'About',
    toolCanteen: isZh ? '食堂' : 'Canteen',
    toolSchedule: isZh ? '课程表' : 'Schedule',
    toolDiary: isZh ? '多年日记本' : 'Diary',
    toolTodo: isZh ? '待办事项' : 'To-do',
    todoSoon: isZh ? '待开发' : 'Coming soon',
    aboutProfile: isZh ? '关于我们' : 'About us',
    aboutThanks: isZh ? '特别鸣谢' : 'Thanks',
    aboutDisclaimer: isZh ? '免责声明' : 'Disclaimer',
    aboutContact: isZh ? '联系我们' : 'Contact',
    loginHint: isZh ? '登录后显示' : 'After login',
    tapLogin: isZh ? '点击登录' : 'Tap to log in',
    loading: isZh ? '加载中…' : 'Loading…',
    admin: 'Admin',
    tabPosts: isZh ? '帖子' : 'Posts',
    tabReviews: isZh ? '点评' : 'Reviews',
    tabFavorites: isZh ? '收藏' : 'Favorites',
    logOut: isZh ? '退出登录' : 'Log out',
    editProfile: isZh ? '编辑资料' : 'Edit profile',
    logIn: isZh ? '登录' : 'Log in',
  };
}

/** 个人中心：信息栏 + 工具/关于宫格 + 内容 Tab */
function MyZone() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = MyZoneStrings(isZh);

  const {
    isLoggedIn,
    isMerchant,
    isAdmin,
    displayName,
    displayAvatar,
    user,
    userLoading,
    userError,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState(TAB_POSTS);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [reviewsError, setReviewsError] = useState(null);
  const [favoritesError, setFavoritesError] = useState(null);

  const campusEmail = user?.email?.trim() || '';

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

  useEffect(() => {
    if (!isLoggedIn) return;
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
  }, [isLoggedIn]);

  const goLogin = () => navigate('/login', { state: { from: { pathname: '/myzone' } } } });
  const goProfile = () => {
    if (!isLoggedIn) return goLogin();
    navigate('/myzone/profile');
  };
  const goSpace = () => {
    if (!isLoggedIn || !user?.id) {
      goLogin();
      return;
    }
    navigate(`/user/${user.id}`);
  };
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleTodoClick = () => {
    Toast.success(t.todoSoon);
  };

  return (
    <div className="myzone-page">
      {/* 个人信息栏 */}
      <section className="myzone-profile" aria-label={isZh ? '个人信息' : 'Profile'}>
        <button type="button" className="myzone-profile-avatar-wrap" onClick={isLoggedIn ? goProfile : goLogin}>
          {userLoading && !displayAvatar ? (
            <div className="myzone-profile-avatar myzone-profile-avatar-loading">{t.loading}</div>
          ) : displayAvatar ? (
            <img src={prefixAvatar(displayAvatar)} alt="" className="myzone-profile-avatar" />
          ) : (
            <img src="/default-avatar.svg" alt="" className="myzone-profile-avatar myzone-profile-avatar-default" />
          )}
        </button>
        <div className="myzone-profile-text">
          <p className="myzone-profile-name">
            {isLoggedIn ? (userLoading && !displayName ? t.loading : displayName) : t.tapLogin}
            {isLoggedIn && isAdmin && <span className="myzone-admin-badge">{t.admin}</span>}
          </p>
          <p className="myzone-profile-email">
            {isLoggedIn ? (campusEmail || '—') : t.loginHint}
          </p>
        </div>
        <button type="button" className="myzone-profile-space" onClick={goSpace}>
          <span>{t.space}</span>
          <span className="myzone-profile-space-chevron" aria-hidden>›</span>
        </button>
      </section>
      <div className="myzone-profile-divider" role="separator" />

      {userError && (
        <p className="myzone-error" role="alert">
          {userError}
        </p>
      )}

      {/* 工具 */}
      <section className="myzone-block" aria-labelledby="myzone-tools-heading">
        <h2 id="myzone-tools-heading" className="myzone-block-title">
          {t.tools}
        </h2>
        <div className="myzone-tile-grid">
          <Link to="/eat" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconCanteen />
            </span>
            <span className="myzone-tile-label">{t.toolCanteen}</span>
          </Link>
          <Link to="/about/schedule" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconSchedule />
            </span>
            <span className="myzone-tile-label">{t.toolSchedule}</span>
          </Link>
          <Link to="/about/diary" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconDiary />
            </span>
            <span className="myzone-tile-label">{t.toolDiary}</span>
          </Link>
          <button type="button" className="myzone-tile myzone-tile--disabled" onClick={handleTodoClick}>
            <span className="myzone-tile-icon" aria-hidden>
              <IconTodo />
            </span>
            <span className="myzone-tile-label">{t.toolTodo}</span>
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="myzone-block" aria-labelledby="myzone-about-heading">
        <h2 id="myzone-about-heading" className="myzone-block-title">
          {t.about}
        </h2>
        <div className="myzone-tile-grid">
          <Link to="/about/profile" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconAbout />
            </span>
            <span className="myzone-tile-label">{t.aboutProfile}</span>
          </Link>
          <Link to="/about/thanks" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconThanks />
            </span>
            <span className="myzone-tile-label">{t.aboutThanks}</span>
          </Link>
          <Link to="/about/disclaimer" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconDisclaimer />
            </span>
            <span className="myzone-tile-label">{t.aboutDisclaimer}</span>
          </Link>
          <Link to="/about/contact" className="myzone-tile">
            <span className="myzone-tile-icon" aria-hidden>
              <IconContact />
            </span>
            <span className="myzone-tile-label">{t.aboutContact}</span>
          </Link>
        </div>
      </section>

      {/* 商家入口（保留） */}
      {isLoggedIn && isMerchant && (
        <div className="myzone-merchant-link-wrap">
          <Link to="/merchant/manage" className="myzone-merchant-link">
            {isZh ? '店铺管理' : 'Store'}
          </Link>
        </div>
      )}

      {/* 内容 Tab */}
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

      <section className="myzone-content" role="tabpanel">
        {activeTab === TAB_POSTS && (
          <div className="myzone-grid-wrap">
            {!isLoggedIn ? (
              <EmptyState
                title={isZh ? '请先登录' : 'Please log in'}
                description={isZh ? '登录后查看帖子。' : 'Log in to view your posts.'}
                actionLabel={t.logIn}
                actionTo="/login"
              />
            ) : postsLoading ? (
              <p className="myzone-loading">{t.loading}</p>
            ) : postsError ? (
              <p className="myzone-error-inline">{postsError}</p>
            ) : posts.length === 0 ? (
              <EmptyState
                title={isZh ? '暂无帖子' : 'No posts yet'}
                description={isZh ? '发第一条吧。' : 'Post your first one.'}
                actionLabel={isZh ? '去发布' : 'Post now'}
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
                title={isZh ? '请先登录' : 'Please log in'}
                description={isZh ? '登录后查看点评。' : 'Log in to view your reviews.'}
                actionLabel={t.logIn}
                actionTo="/login"
              />
            ) : reviewsLoading ? (
              <p className="myzone-loading">{t.loading}</p>
            ) : reviewsError ? (
              <p className="myzone-error-inline">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <EmptyState
                title={isZh ? '暂无点评' : 'No reviews yet'}
                description={isZh ? '去给喜欢的菜品写点评。' : 'Go review your favorite dishes.'}
                actionLabel={isZh ? '去食堂' : 'Eat now'}
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
            {!isLoggedIn ? (
              <EmptyState
                title={isZh ? '请先登录' : 'Please log in'}
                description={isZh ? '登录后查看收藏。' : 'Log in to view your favorites.'}
                actionLabel={t.logIn}
                actionTo="/login"
              />
            ) : favoritesLoading ? (
              <p className="myzone-loading">{t.loading}</p>
            ) : favoritesError ? (
              <p className="myzone-error-inline">{favoritesError}</p>
            ) : favorites.length === 0 ? (
              <EmptyState
                title={isZh ? '暂无收藏' : 'No favorites yet'}
                description={isZh ? '在食堂收藏喜欢的菜品。' : 'Favorite dishes in the canteen.'}
                actionLabel={isZh ? '去食堂' : 'Eat now'}
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

      {isLoggedIn && (
        <div className="myzone-footer-actions">
          <button type="button" className="myzone-profile-edit" onClick={goProfile}>
            {t.editProfile}
          </button>
          <button type="button" className="myzone-logout" onClick={handleLogout}>
            {t.logOut}
          </button>
        </div>
      )}
    </div>
  );
}

function IconCanteen() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z" strokeLinejoin="round" />
      <path d="M8 10V6M12 10V5M16 10V6" strokeLinecap="round" />
    </svg>
  );
}

function IconSchedule() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
      <path d="M8 13h2M12 13h2M16 13h2M8 17h2M12 17h2" strokeLinecap="round" />
    </svg>
  );
}

function IconDiary() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 3h12a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h6" strokeLinecap="round" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" strokeLinecap="round" />
    </svg>
  );
}

function IconAbout() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" strokeLinecap="round" />
    </svg>
  );
}

function IconThanks() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9.5-2.5A5 5 0 0 1 19 11c0 5.5-7 10-7 10z" strokeLinejoin="round" />
    </svg>
  );
}

function IconDisclaimer() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h6" strokeLinecap="round" />
    </svg>
  );
}

function IconContact() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16v12H4V6z" strokeLinejoin="round" />
      <path d="M4 7l8 6 8-6" strokeLinejoin="round" />
    </svg>
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

export default MyZone;
