import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import { getProfile } from '../api/users';
import { getMyProductReviews, getMyFavorites } from '../api/canteen';
import { API_BASE_URL, productImageUrl } from '../api/config';
import { formatRatingLabel } from '../constants/rating';
import { getApiErrorMessage } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/EmptyState';
// 注意：此页使用 Tailwind 现代样式，不再复用旧的 MyZone.css（会带来深色遮罩等旧样式干扰）

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

const pageWrap = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const gridWrap = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const cardAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

function pastelFromString(str) {
  const s = String(str || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 80% 92%)`;
}

function snippet(text) {
  const s = String(text || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
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
      <div className="min-h-[100svh] bg-[#F9FAFB] px-4 pb-8 pt-6">
        <EmptyState title={t.userNotFound} description={t.userNotFound} actionLabel={t.backHome} actionTo="/" />
      </div>
    );
  }

  if (loading && !profileUser) {
    return (
      <div className="min-h-[100svh] bg-[#F9FAFB] px-4 pb-8 pt-6">
        <div className="rounded-3xl bg-white px-4 py-4 text-[13px] font-medium text-slate-400 ring-1 ring-slate-100">
          {t.loading}
        </div>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="min-h-[100svh] bg-[#F9FAFB] px-4 pb-8 pt-6">
        <div className="rounded-3xl bg-white px-4 py-4 text-[13px] font-medium text-rose-600 ring-1 ring-rose-100" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const avatarBg = profileUser?.avatar ? prefixAvatar(profileUser.avatar) : '';
  const displayName = profileUser?.nickname ?? profileUser?.username ?? (isZh ? '未设置' : 'Not set');
  const showTabs = isOwnProfile;
  const reviewsCount = reviews.length;
  const favoritesCount = favorites.length;

  const tabs = useMemo(() => {
    const base = [
      { key: TAB_POSTS, label: t.tabPosts, enabled: true },
      { key: TAB_REVIEWS, label: t.tabReviews, enabled: showTabs },
      { key: TAB_FAVORITES, label: t.tabFavorites, enabled: showTabs },
    ];
    return base;
  }, [showTabs, t.tabFavorites, t.tabPosts, t.tabReviews]);

  return (
    <div className="h-full w-full bg-[#F9FAFB]">
      <div className="h-full overflow-y-auto px-4 pb-[calc(var(--tabbar-height)+var(--safe-bottom)+24px)] pt-6">
        <motion.div variants={pageWrap} initial="hidden" animate="show">
          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900">
            {avatarBg ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${avatarBg})` }}
                aria-hidden
              />
            ) : null}
            {/* readability: dark gradient + optional blur */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/65" aria-hidden />
            <div className="absolute inset-0 backdrop-blur-[8px]" aria-hidden />

            <div className="relative px-5 pb-5 pt-20">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-4">
                    <div className="truncate text-[20px] font-semibold tracking-tight text-white">{displayName}</div>
                    <div className="flex items-center gap-4 text-white/90">
                      <StatMini value={postCount} label={t.tabPosts} />
                      <StatMini value={showTabs ? reviewsCount : 0} label={t.tabReviews} dim={!showTabs} />
                      <StatMini value={showTabs ? favoritesCount : 0} label={t.tabFavorites} dim={!showTabs} />
                    </div>
                  </div>
                </div>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full bg-white/12 px-4 py-2 text-[12px] font-semibold text-white ring-1 ring-white/15"
                  >
                    {t.logOut}
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-rose-600 ring-1 ring-rose-100" role="alert">
              {error}
            </p>
          )}

          {/* Tabs */}
          {showTabs && (
            <div className="mt-4">
              <div className="relative rounded-2xl bg-white p-1 ring-1 ring-slate-100">
                <div className="grid grid-cols-3">
                  {tabs.map((tab) => {
                    const selected = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => tab.enabled && setActiveTab(tab.key)}
                        disabled={!tab.enabled}
                        className={`relative py-2 text-[13px] font-semibold transition ${
                          selected ? 'text-slate-900' : 'text-slate-400'
                        } ${tab.enabled ? '' : 'opacity-50'}`}
                      >
                        {tab.label}
                        {selected && (
                          <motion.div
                            layoutId="userzone-activebar"
                            className="absolute left-1/2 top-full mt-0.5 h-[2px] w-12 -translate-x-1/2 rounded-full bg-slate-900"
                            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              {(!showTabs || activeTab === TAB_POSTS) && (
                <motion.section
                  key="posts"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.22 }}
                >
                  {posts.length === 0 ? (
                    <EmptyState
                      title={t.postsEmptyTitle}
                      description={isOwnProfile ? t.postsEmptyOwn : t.postsEmptyDesc}
                      actionLabel={isOwnProfile ? t.postNow : undefined}
                      actionTo={isOwnProfile ? '/post/new' : undefined}
                    />
                  ) : (
                    <motion.div variants={gridWrap} initial="hidden" animate="show" className="columns-2 gap-3">
                      {posts.map((post) => (
                        <PostMasonryCard key={post.id} post={post} />
                      ))}
                    </motion.div>
                  )}
                </motion.section>
              )}

              {showTabs && activeTab === TAB_REVIEWS && (
                <motion.section
                  key="reviews"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.22 }}
                >
                  {reviewsLoading ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-slate-400 ring-1 ring-slate-100">
                      {t.loading}
                    </p>
                  ) : reviewsError ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-rose-600 ring-1 ring-rose-100">
                      {reviewsError}
                    </p>
                  ) : reviews.length === 0 ? (
                    <EmptyState title={t.reviewsEmptyTitle} description={t.reviewsEmptyDesc} actionLabel={t.eatNow} actionTo="/eat" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {reviews.map((r) => (
                        <ReviewGridItem key={r.id} review={r} />
                      ))}
                    </div>
                  )}
                </motion.section>
              )}

              {showTabs && activeTab === TAB_FAVORITES && (
                <motion.section
                  key="favorites"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.22 }}
                >
                  {favoritesLoading ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-slate-400 ring-1 ring-slate-100">
                      {t.loading}
                    </p>
                  ) : favoritesError ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-rose-600 ring-1 ring-rose-100">
                      {favoritesError}
                    </p>
                  ) : favorites.length === 0 ? (
                    <EmptyState title={t.favEmptyTitle} description={t.favEmptyDesc} actionLabel={t.eatNow} actionTo="/eat" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {favorites.map((item) => (
                        <FavoriteGridItem key={item.product_id} item={item} />
                      ))}
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatMini({ value, label, dim = false }) {
  return (
    <div className={`flex flex-col leading-none ${dim ? 'opacity-70' : ''}`}>
      <div className="text-[14px] font-semibold tabular-nums">{Number(value) || 0}</div>
      <div className="mt-1 text-[11px] font-medium text-white/70">{label}</div>
    </div>
  );
}

function PostMasonryCard({ post }) {
  const firstImg = post.images?.[0]?.url;
  const imgUrl = firstImg && !firstImg.startsWith('http') ? `${API_BASE_URL}${firstImg}` : firstImg;
  const likeNum = post.like_count ?? post.likeCount ?? 0;
  const commentNum = post.comment_count ?? post.commentCount ?? 0;
  const text = snippet(post.content);
  const pastel = useMemo(() => pastelFromString(`${post.id}-${post.content || ''}`), [post.content, post.id]);

  return (
    <motion.div
      variants={cardAnim}
      className="mb-3 break-inside-avoid"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <Link to={`/post/${post.id}`} className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="relative">
          {imgUrl ? (
            <img src={imgUrl} alt="" className="w-full object-cover" />
          ) : (
            <div
              className="flex min-h-[160px] w-full items-center justify-center px-4 py-10 text-center"
              style={{ backgroundColor: pastel }}
            >
              <div className="text-[14px] font-semibold leading-relaxed text-slate-800/90">
                {text || ' '}
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[12px] font-semibold text-white">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {likeNum}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {commentNum}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ReviewGridItem({ review }) {
  const { product_id, product_name, rating, product_image, images } = review;
  const raw = product_image ?? (images?.length ? (images[0]?.url ?? images[0]) : null);
  const pathStr = typeof raw === 'string' ? raw : raw?.url ?? null;
  const imgUrl = productImageUrl(pathStr);

  return (
    <motion.div variants={cardAnim} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
      <Link to={`/eat/food/${product_id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="relative">
          <img src={imgUrl} alt="" className="aspect-[4/5] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="truncate text-[12px] font-semibold text-white">{product_name}</div>
            <div className="mt-0.5 text-[11px] font-medium text-white/85">{formatRatingLabel(rating)}</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function FavoriteGridItem({ item }) {
  const { product_id, product_name, shop_name, product_image } = item;
  const imgUrl = productImageUrl(typeof product_image === 'string' ? product_image : null);

  return (
    <motion.div variants={cardAnim} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
      <Link to={`/eat/food/${product_id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="relative">
          <img src={imgUrl} alt="" className="aspect-[4/5] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="truncate text-[12px] font-semibold text-white">{product_name}</div>
            {shop_name && <div className="mt-0.5 truncate text-[11px] font-medium text-white/85">{shop_name}</div>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default UserZone;
