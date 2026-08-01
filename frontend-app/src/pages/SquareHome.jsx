import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { getCampusFeed, getSquareBanners, getTrendingTopics } from '@shared/api/square';
import { getUploadUrl } from '@shared/api/config';
import { formatPostTime } from '@shared/utils/formatTime';
import { useLanguage } from '../context/LanguageContext';
import ErrorState from '../components/ui/ErrorState';
import PageSkeleton from '../components/ui/PageSkeleton';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import { QK } from '@shared/query/queryKeys';
import './SquareHome.css';

const TAB_STORAGE_KEY = 'square-home-tab';

function readStoredTab() {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) === 'trending' ? 'trending' : 'campus';
  } catch {
    return 'campus';
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
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [tab, setTab] = useState(readStoredTab);

  const campusQuery = useQuery({
    queryKey: QK.campusFeed('school', 'square-home'),
    queryFn: () => getCampusFeed({ tab: 'school', page: 1, pageSize: 8 }),
    enabled: tab === 'campus',
    staleTime: 30 * 1000,
  });
  const trendingQuery = useQuery({
    queryKey: QK.trendingTopics(),
    queryFn: getTrendingTopics,
    enabled: tab === 'trending',
    staleTime: 30 * 1000,
  });

  const activeQuery = tab === 'campus' ? campusQuery : trendingQuery;
  const items = tab === 'campus' ? normalizeFeed(campusQuery.data) : normalizeTopics(trendingQuery.data);

  const selectTab = (nextTab) => {
    setTab(nextTab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, nextTab);
    } catch {
      // Persisting the selected feed is a convenience, never a render blocker.
    }
  };

  const refresh = () => activeQuery.refetch();

  return (
    <section className="square-home-page square-home-page--timeline" aria-label={isEn ? 'Square' : '广场'}>
      <header className="square-timeline-header">
        <h1>{isEn ? 'Square' : '广场'}</h1>
        <div className="square-timeline-header__actions">
          <button type="button" className="square-icon-button" onClick={refresh} aria-label={isEn ? 'Refresh feed' : '刷新内容'}>
            <RefreshCw size={19} aria-hidden="true" />
          </button>
          <button type="button" className="square-icon-button" onClick={() => navigate('/post/new')} aria-label={isEn ? 'Create post' : '发布内容'}>
            <Plus size={21} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="square-timeline-tabs" role="tablist" aria-label={isEn ? 'Square feeds' : '广场内容'}>
        <button type="button" role="tab" aria-selected={tab === 'campus'} className={tab === 'campus' ? 'is-active' : ''} onClick={() => selectTab('campus')}>
          {isEn ? 'Campus' : '校园'}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'trending'} className={tab === 'trending' ? 'is-active' : ''} onClick={() => selectTab('trending')}>
          {isEn ? 'Trending' : '热搜'}
        </button>
      </div>

      <CanteenBannerCarousel
        fetchFn={getSquareBanners}
        queryKey={QK.squareBanners()}
        adminTo="/about/admin/orgs?tab=banners"
      />

      <div className="square-timeline-content" role="tabpanel">
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
                <Link key={item.id} to={`/about/campus/${item.id}`} className="square-campus-preview-row">
                  <div>
                    <p className="square-content-meta">{item.organization?.name || (isEn ? 'Campus' : '校园')} · {formatPostTime(item.created_at, true)}</p>
                    <h2>{item.title}</h2>
                    {item.content ? <p className="square-content-excerpt">{item.content}</p> : null}
                  </div>
                  {image ? <img src={image} alt="" loading="lazy" /> : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="square-trending-preview-list">
            {items.map((topic, index) => (
              <Link key={topic.id} to={`/about/trending/${topic.id}`} className="square-trending-preview-row">
                <span>{index + 1}</span>
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
