import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Star } from 'lucide-react';
import { getProfile } from '../api/users';
import { getMyProductReviews, getMyFavorites } from '../api/canteen';
import { API_BASE_URL, productImageUrl } from '../api/config';
import { formatRatingLabel } from '../constants/rating';
import { getApiErrorMessage } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageSkeleton from '../components/ui/PageSkeleton';
import RouteTransition from '../components/ui/RouteTransition';
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

const cardAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

// in-memory image warm cache to avoid "scroll -> one by one reload"
const IMG_CACHE = new Map(); // url -> HTMLImageElement
function warmImage(url) {
  if (!url) return;
  if (IMG_CACHE.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  IMG_CACHE.set(url, img);
}

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

function timeBadge(ts, locale) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(locale || 'en-US', { month: 'short', day: '2-digit' });
  } catch {
    return '';
  }
}

function postImageUrl(raw) {
  if (!raw) return null;
  const s = typeof raw === 'string' ? raw : raw?.url;
  if (!s) return null;
  return s.startsWith('http') ? s : `${API_BASE_URL}${s}`;
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

  const showTabs = isOwnProfile;
  const tabs = [
    { key: TAB_POSTS, label: t.tabPosts, enabled: true },
    { key: TAB_REVIEWS, label: t.tabReviews, enabled: showTabs },
    { key: TAB_FAVORITES, label: t.tabFavorites, enabled: showTabs },
  ];

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

  // Pre-warm images to avoid "row-by-row refresh" while scrolling
  useEffect(() => {
    const urls = [];
    for (const p of posts || []) {
      const imgs = Array.isArray(p.images) ? p.images : [];
      for (const it of imgs.slice(0, 9)) {
        const u = postImageUrl(it?.url ?? it);
        if (u) urls.push(u);
      }
    }
    for (const u of urls) warmImage(u);
  }, [posts]);

  useEffect(() => {
    const urls = [];
    for (const r of reviews || []) {
      const raw = r.product_image ?? (r.images?.length ? (r.images[0]?.url ?? r.images[0]) : null);
      const pathStr = typeof raw === 'string' ? raw : raw?.url ?? null;
      const u = productImageUrl(pathStr);
      if (u) urls.push(u);
    }
    for (const u of urls) warmImage(u);
  }, [reviews]);

  useEffect(() => {
    const urls = [];
    for (const f of favorites || []) {
      const u = productImageUrl(typeof f.product_image === 'string' ? f.product_image : null);
      if (u) urls.push(u);
    }
    for (const u of urls) warmImage(u);
  }, [favorites]);

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
      <RouteTransition className="min-h-[100svh] bg-[#F9FAFB] px-4 pb-8 pt-6">
        <EmptyState title={t.userNotFound} description={t.userNotFound} actionLabel={t.backHome} actionTo="/" icon="👤" />
      </RouteTransition>
    );
  }

  if (loading && !profileUser) {
    return (
      <RouteTransition className="min-h-[100svh] bg-[#F9FAFB] px-4 pb-8 pt-6">
        <PageSkeleton hero items={2} />
      </RouteTransition>
    );
  }

  if (error && !profileUser) {
    return (
      <RouteTransition className="min-h-[100svh] bg-[#F9FAFB] px-4 pb-8 pt-6">
        <ErrorState title={t.userNotFound} description={error} />
      </RouteTransition>
    );
  }

  const avatarBg = profileUser?.avatar ? prefixAvatar(profileUser.avatar) : '';
  const displayName = profileUser?.nickname ?? profileUser?.username ?? (isZh ? '未设置' : 'Not set');
  const reviewsCount = reviews.length;
  const favoritesCount = favorites.length;
  const locale = isZh ? 'zh-CN' : 'en-US';

  return (
    <RouteTransition className="min-h-[100svh] w-full bg-[#F9FAFB]">
      <div className="px-4 pb-[calc(var(--tabbar-height)+var(--safe-bottom)+24px)] pt-6">
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
            <ErrorState className="mt-3" title="资料加载失败" description={error} />
          )}

          {/* Tabs */}
          {showTabs && (
            <div className="sticky top-0 z-20 -mx-4 mt-4 bg-[#F9FAFB]/85 px-4 pb-2 pt-2 backdrop-blur">
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
                            className="absolute left-1/2 top-full mt-0.5 h-[2px] w-10 -translate-x-1/2 rounded-full bg-emerald-500"
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
                    <EmptyIllustration
                      title={t.postsEmptyTitle}
                      description={isOwnProfile ? t.postsEmptyOwn : t.postsEmptyDesc}
                      actionLabel={isOwnProfile ? t.postNow : (isZh ? '去逛逛' : 'Start exploring')}
                      actionTo={isOwnProfile ? '/post/new' : '/'}
                    />
                  ) : (
                    <Timeline
                      items={posts}
                      locale={locale}
                      renderItem={(post) => (
                        <TimelinePostItem key={post.id} post={post} locale={locale} />
                      )}
                    />
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
                    <PageSkeleton items={2} />
                  ) : reviewsError ? (
                    <ErrorState title="点评加载失败" description={reviewsError} />
                  ) : reviews.length === 0 ? (
                    <EmptyIllustration title={t.reviewsEmptyTitle} description={t.reviewsEmptyDesc} actionLabel={t.eatNow} actionTo="/eat" />
                  ) : (
                    <Timeline
                      items={reviews}
                      locale={locale}
                      renderItem={(review) => (
                        <TimelineReviewItem key={review.id} review={review} locale={locale} />
                      )}
                    />
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
                    <PageSkeleton items={2} />
                  ) : favoritesError ? (
                    <ErrorState title="收藏加载失败" description={favoritesError} />
                  ) : favorites.length === 0 ? (
                    <EmptyIllustration title={t.favEmptyTitle} description={t.favEmptyDesc} actionLabel={t.eatNow} actionTo="/eat" />
                  ) : (
                    <div className="space-y-3">
                      {favorites.map((item) => (
                        <FavoriteListItem key={item.product_id} item={item} />
                      ))}
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </RouteTransition>
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

function Timeline({ items, locale, renderItem }) {
  return (
    <div className="relative">
      <div className="absolute left-[14px] top-0 h-full w-px bg-slate-200" aria-hidden />
      <div className="space-y-4">
        {items.map((it) => renderItem(it, locale))}
      </div>
    </div>
  );
}

function TimelineShell({ badge, children }) {
  return (
    <motion.div variants={cardAnim} whileTap={{ scale: 0.98 }}>
      <div className="relative pl-10">
        <div className="absolute left-[9px] top-4 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" aria-hidden />
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/60" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div className="mb-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {badge}
          </div>
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function TimelinePostItem({ post, locale }) {
  const created = post.created_at ?? post.createdAt ?? post.created;
  const badge = timeBadge(created, locale);
  const likeNum = post.like_count ?? post.likeCount ?? 0;
  const commentNum = post.comment_count ?? post.commentCount ?? 0;
  const imgs = Array.isArray(post.images) ? post.images : [];
  const urls = imgs.map((x) => postImageUrl(x?.url ?? x)).filter(Boolean);

  return (
    <TimelineShell badge={badge || (locale === 'zh-CN' ? '记录' : 'Entry')}>
      <Link to={`/post/${post.id}`} className="block">
        <div className="text-[14px] font-semibold leading-relaxed text-slate-900">
          {snippet(post.content) || ' '}
        </div>
        {urls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {urls.slice(0, 9).map((u, idx) => (
              <div key={idx} className="overflow-hidden rounded-xl bg-slate-100">
                <FadeImg src={u} alt="" className="aspect-square w-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-[12px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {likeNum}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {commentNum}
          </span>
        </div>
      </Link>
    </TimelineShell>
  );
}

function TimelineReviewItem({ review, locale }) {
  const created = review.created_at ?? review.createdAt ?? review.created;
  const badge = timeBadge(created, locale);
  const { product_id, product_name, rating, content, product_image, images } = review;
  const raw = product_image ?? (images?.length ? (images[0]?.url ?? images[0]) : null);
  const pathStr = typeof raw === 'string' ? raw : raw?.url ?? null;
  const imgUrl = productImageUrl(pathStr);
  const rateLabel = formatRatingLabel(rating);

  return (
    <TimelineShell badge={badge || (locale === 'zh-CN' ? '点评' : 'Review')}>
      <Link to={`/eat/food/${product_id}`} className="block">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-900">{product_name}</div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
              <Star className="h-3.5 w-3.5" />
              {rateLabel}
            </div>
          </div>
          {imgUrl ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <FadeImg src={imgUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>
        <div className="mt-3 text-[13px] font-medium leading-relaxed text-slate-700">
          {snippet(content) || ' '}
        </div>
      </Link>
    </TimelineShell>
  );
}

function FavoriteListItem({ item }) {
  const { product_id, product_name, shop_name, product_image } = item;
  const imgUrl = productImageUrl(typeof product_image === 'string' ? product_image : null);
  return (
    <motion.div variants={cardAnim} whileTap={{ scale: 0.98 }}>
      <Link
        to={`/eat/food/${product_id}`}
        className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200/60"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
      >
        <div className="min-w-0">
          <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">
            {product_name}
          </div>
          <div className="mt-1 truncate text-[12px] font-medium text-slate-400">
            {shop_name || ' '}
          </div>
        </div>
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {imgUrl ? <FadeImg src={imgUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
      </Link>
    </motion.div>
  );
}

function FadeImg({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);
  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true); // 避免一直 opacity-0 导致“空白”
        }}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-[11px] font-semibold text-slate-400">
          image error
        </div>
      ) : null}
    </div>
  );
}

function EmptyIllustration({ title, description, actionLabel, actionTo }) {
  return (
    <EmptyState title={title} description={description} actionLabel={actionLabel} actionTo={actionTo} icon="🗂" />
  );
}

export default UserZone;
