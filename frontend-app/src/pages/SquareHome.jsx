import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenText, HandHelping, Heart, Megaphone, MessageCircle, MoreHorizontal, RefreshCw, Shapes, Store } from 'lucide-react';
import { getCampusFeed, getSquareBanners, getTrendingTopics, likeCampusPost } from '@shared/api/square';
import { getUploadUrl } from '@shared/api/config';
import { formatPostTime } from '@shared/utils/formatTime';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ErrorState from '../components/ui/ErrorState';
import PageSkeleton from '../components/ui/PageSkeleton';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
import { QK } from '@shared/query/queryKeys';
import './SquareHome.css';

const TAB_STORAGE_KEY = 'square-home-tab';
const NOTICE_TAB_STORAGE_KEY = 'square-notice-tab';
const MAIN_TABS = ['campus', 'trending'];
const NOTICE_TABS = ['school', 'college'];

const PRIMARY_ACTIONS = [
  { label: '社团广场', labelEn: 'Clubs', to: '/about/club', icon: <Shapes size={19} strokeWidth={2} /> },
  { label: '马校一站通', labelEn: 'XMUM Guide', to: '/about/freshman-guide', icon: <BookOpenText size={19} strokeWidth={2} /> },
  { label: '帮帮我', labelEn: 'Help Me', to: '/about/errands', icon: <HandHelping size={19} strokeWidth={2} /> },
  { label: '出物', labelEn: 'Marketplace', to: '/about/second-hand', icon: <Store size={19} strokeWidth={2} /> },
];

function readStoredTab() {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return MAIN_TABS.includes(stored) ? stored : 'campus';
  } catch {
    return 'campus';
  }
}

function readStoredNoticeTab() {
  try {
    const stored = localStorage.getItem(NOTICE_TAB_STORAGE_KEY);
    return NOTICE_TABS.includes(stored) ? stored : 'school';
  } catch {
    return 'school';
  }
}

function normalizeFeed(data) {
  const payload = data?.data || data;
  return Array.isArray(payload?.list) ? payload.list : [];
}

function normalizeTopics(data) {
  return Array.isArray(data) ? data : data?.data || [];
}

export default function SquareHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const { isLoggedIn } = useAuth();
  const isEn = lang === 'en';
  const [tab, setTab] = useState(readStoredTab);
  const [noticeTab, setNoticeTab] = useState(readStoredNoticeTab);
  const [likedCampus, setLikedCampus] = useState({});
  const [campusLikeCounts, setCampusLikeCounts] = useState({});

  const campusQuery = useQuery({
    queryKey: QK.campusFeed(noticeTab, 1),
    queryFn: () => getCampusFeed({ tab: noticeTab, page: 1, pageSize: 8 }),
    enabled: tab === 'campus',
    staleTime: 30 * 1000,
  });
  const trendingQuery = useQuery({
    queryKey: QK.trendingTopics(),
    queryFn: getTrendingTopics,
    enabled: tab === 'trending',
    staleTime: 30 * 1000,
  });

  const activeQuery = tab === 'trending' ? trendingQuery : campusQuery;
  const items = tab === 'trending' ? normalizeTopics(trendingQuery.data) : normalizeFeed(campusQuery.data);

  const selectTab = (nextTab) => {
    setTab(nextTab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, nextTab);
    } catch {
      // Persisting the selected feed is a convenience, never a render blocker.
    }
  };

  const selectNoticeTab = (nextTab) => {
    setNoticeTab(nextTab);
    try {
      localStorage.setItem(NOTICE_TAB_STORAGE_KEY, nextTab);
    } catch {
      // Persisting the selected notice source is a convenience, never a render blocker.
    }
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = MAIN_TABS.indexOf(tab);
    const nextTab = MAIN_TABS[(currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + MAIN_TABS.length) % MAIN_TABS.length];
    selectTab(nextTab);
    document.getElementById(`square-tab-${nextTab}`)?.focus();
  };

  const handleNoticeTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = NOTICE_TABS.indexOf(noticeTab);
    const nextTab = NOTICE_TABS[(currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + NOTICE_TABS.length) % NOTICE_TABS.length];
    selectNoticeTab(nextTab);
    document.getElementById(`square-notice-tab-${nextTab}`)?.focus();
  };

  const refresh = () => {
    activeQuery.refetch();
    queryClient.invalidateQueries({ queryKey: QK.squareBanners() });
  };

  const handleNoticePublish = () => {
    const targetTab = noticeTab;
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/about/campus/new?tab=${targetTab}` } } });
      return;
    }
    navigate(`/about/campus/new?tab=${targetTab}`);
  };

  const handleCampusLike = async (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: { pathname: `/about/campus/${item.id}` } } });
      return;
    }
    try {
      const result = await likeCampusPost(item.id);
      const currentLiked = likedCampus[item.id] ?? item.user_liked ?? false;
      const liked = result?.liked ?? !currentLiked;
      setLikedCampus((current) => ({ ...current, [item.id]: liked }));
      setCampusLikeCounts((current) => ({
        ...current,
        [item.id]: Math.max(0, (current[item.id] ?? item.like_count ?? 0) + (liked ? 1 : -1)),
      }));
    } catch {
      // Like failure should not interrupt feed browsing.
    }
  };

  return (
    <section className="square-home-page square-home-page--timeline" aria-label={isEn ? 'Square' : '广场'}>
      <header className="square-timeline-header">
        <h1>{isEn ? 'Square' : '广场'}</h1>
        <div className="square-timeline-header__actions">
          <button type="button" className="square-icon-button" onClick={refresh} aria-label={isEn ? 'Refresh current feed' : '刷新当前信息流'} title={isEn ? 'Refresh current feed' : '刷新当前信息流'}>
            <RefreshCw size={19} aria-hidden="true" />
          </button>
          <button type="button" className="square-icon-button" onClick={handleNoticePublish} aria-label={isEn ? 'Publish notice' : '发布通知'} title={isEn ? 'Publish notice' : '发布通知'}>
            <Megaphone size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="square-timeline-tabs" role="tablist" aria-label={isEn ? 'Square feeds' : '广场内容'}>
        <button id="square-tab-campus" type="button" role="tab" aria-selected={tab === 'campus'} aria-controls="square-tabpanel" tabIndex={tab === 'campus' ? 0 : -1} className={tab === 'campus' ? 'is-active' : ''} onClick={() => selectTab('campus')} onKeyDown={handleTabKeyDown}>
          {isEn ? 'Campus today' : '校园今日'}
        </button>
        <button id="square-tab-trending" type="button" role="tab" aria-selected={tab === 'trending'} aria-controls="square-tabpanel" tabIndex={tab === 'trending' ? 0 : -1} className={tab === 'trending' ? 'is-active' : ''} onClick={() => selectTab('trending')} onKeyDown={handleTabKeyDown}>
          {isEn ? 'Trending' : '热搜'}
        </button>
      </div>

      <TodayCampusQuickActions actions={PRIMARY_ACTIONS} />

      {tab === 'campus' ? (
        <CanteenBannerCarousel
          fetchFn={getSquareBanners}
          queryKey={QK.squareBanners()}
          adminTo="/about/admin/orgs?tab=banners"
        />
      ) : null}

      {tab === 'campus' ? (
        <div className="square-notice-tabs" role="tablist" aria-label={isEn ? 'Notice sources' : '通知来源'}>
          <button id="square-notice-tab-school" type="button" role="tab" aria-selected={noticeTab === 'school'} aria-controls="square-tabpanel" tabIndex={noticeTab === 'school' ? 0 : -1} className={noticeTab === 'school' ? 'is-active' : ''} onClick={() => selectNoticeTab('school')} onKeyDown={handleNoticeTabKeyDown}>
            {isEn ? 'School notices' : '学校通知'}
          </button>
          <button id="square-notice-tab-college" type="button" role="tab" aria-selected={noticeTab === 'college'} aria-controls="square-tabpanel" tabIndex={noticeTab === 'college' ? 0 : -1} className={noticeTab === 'college' ? 'is-active' : ''} onClick={() => selectNoticeTab('college')} onKeyDown={handleNoticeTabKeyDown}>
            {isEn ? 'College notices' : '学院通知'}
          </button>
        </div>
      ) : null}

      <div id="square-tabpanel" className="square-timeline-content" role="tabpanel" aria-labelledby={tab === 'campus' ? `square-notice-tab-${noticeTab}` : 'square-tab-trending'}>
        {activeQuery.isLoading ? (
          <PageSkeleton items={4} className="square-home-skeleton" />
        ) : activeQuery.isError ? (
          <ErrorState
            className="square-home-state"
            title={isEn ? 'Could not load content' : '加载失败'}
            description={isEn ? 'Try again.' : '请重试。'}
            onActionClick={refresh}
          />
        ) : items.length === 0 ? (
          <div className="square-home-state square-home-state--empty">
            {isEn ? 'Nothing here yet' : '暂无内容'}
          </div>
        ) : tab === 'campus' ? (
          <div className="square-campus-preview-list">
            {items.map((item) => {
              const image = item.images?.[0]?.url ? getUploadUrl(item.images[0].url) : null;
              return (
                <article key={item.id} className="square-feed-row square-feed-row--campus square-campus-preview-row">
                  <Link to={`/about/campus/${item.id}`} className="square-feed-row__main">
                    <div>
                      <p className="square-content-meta">
                        {item.author?.nickname || item.author?.username || item.author?.name || item.organization?.name || (isEn ? 'Campus' : '校园')} · {formatPostTime(item.created_at, true)}
                      </p>
                      <h2>{item.title}</h2>
                      {item.content ? <p className="square-content-excerpt">{item.content}</p> : null}
                    </div>
                    {image ? <img src={image} alt="" loading="lazy" /> : null}
                  </Link>
                  <div className="square-feed-row__actions" aria-label={isEn ? 'Post actions' : '内容操作'}>
                    <button type="button" className={`square-feed-action${(likedCampus[item.id] ?? item.user_liked) ? ' is-active' : ''}`} onClick={(event) => handleCampusLike(event, item)} aria-label={(likedCampus[item.id] ?? item.user_liked) ? (isEn ? 'Unlike' : '取消点赞') : (isEn ? 'Like' : '点赞')} aria-pressed={(likedCampus[item.id] ?? item.user_liked) || false}>
                      <Heart size={17} aria-hidden="true" fill={(likedCampus[item.id] ?? item.user_liked) ? 'currentColor' : 'none'} />
                      <span>{campusLikeCounts[item.id] ?? item.like_count ?? 0}</span>
                    </button>
                    <Link to={`/about/campus/${item.id}`} className="square-feed-action" aria-label={isEn ? 'Open comments' : '查看评论'}>
                      <MessageCircle size={17} aria-hidden="true" />
                      <span>{item.comment_count ?? 0}</span>
                    </Link>
                    <button type="button" className="square-feed-action" onClick={() => navigate(`/about/campus/${item.id}`)} aria-label={isEn ? 'Open post' : '打开内容'}>
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="square-trending-preview-list">
            {items.map((topic, index) => (
              <Link key={topic.id} to={`/about/trending/${topic.id}`} className="square-feed-row square-feed-row--trending square-trending-preview-row">
                <span className="square-feed-row__rank">{index + 1}</span>
                <div>
                  <h2>{topic.title}</h2>
                  <p className="square-content-meta">{topic.post_count || 0} {isEn ? 'discussions' : '条讨论'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
