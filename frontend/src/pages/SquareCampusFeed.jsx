import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { getCampusFeed } from '../api/square';
import { getUploadUrl } from '../api/config';
import ErrorState from '../components/ui/ErrorState';
import PageSkeleton from '../components/ui/PageSkeleton';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '../query/queryKeys';
import { formatPostTime } from '../utils/formatTime';
import './SquareHome.css';

const FEED_TABS = [
  {
    key: 'school',
    label: '学校公告',
    eyebrow: 'School Bulletin',
    description: '集中查看学校官方、部门与全校层面的最新通知。',
  },
  {
    key: 'college',
    label: '学院通知',
    eyebrow: 'College Updates',
    description: '按学院查看更贴近专业与班级日常的通知动态。',
  },
];

function normalizeFeedResponse(page) {
  const data = page?.data || page;
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    hasMore: !!data?.hasMore,
    page: data?.page || 1,
  };
}

export default function SquareCampusFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'college' ? 'college' : 'school';
  const currentMeta = FEED_TABS.find((tab) => tab.key === currentTab) || FEED_TABS[0];

  const feedQuery = useInfiniteQuery({
    queryKey: QK.campusFeed(currentTab, 'infinite'),
    queryFn: ({ pageParam = 1 }) => getCampusFeed({ tab: currentTab, page: pageParam, pageSize: 8 }),
    initialPageParam: 1,
    staleTime: 30 * 1000,
    getNextPageParam: (lastPage) => {
      const data = normalizeFeedResponse(lastPage);
      return data.hasMore ? data.page + 1 : undefined;
    },
  });

  const feedItems = (feedQuery.data?.pages || []).flatMap((page) => normalizeFeedResponse(page).list);

  return (
    <RouteTransition className="square-home-page">
      <div className="square-home-inner square-campus-feed-page">
        <section className="square-campus-feed-hero">
          <span className="square-campus-feed-hero__eyebrow">{currentMeta.eyebrow}</span>
          <h1 className="square-campus-feed-hero__title">{currentMeta.label}</h1>
          <p className="square-campus-feed-hero__subtitle">{currentMeta.description}</p>
          <div className="square-campus-feed-tabs" role="tablist" aria-label="校园公告分类">
            {FEED_TABS.map((tab) => {
              const isActive = tab.key === currentTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`square-campus-feed-tab${isActive ? ' square-campus-feed-tab--active' : ''}`}
                  onClick={() => setSearchParams({ tab: tab.key })}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {feedQuery.isLoading ? (
          <PageSkeleton hero items={3} className="square-home-skeleton" />
        ) : feedQuery.isError ? (
          <ErrorState
            className="square-home-state"
            title="校园公告加载失败"
            description="请稍后刷新重试。"
            onActionClick={() => feedQuery.refetch()}
          />
        ) : feedItems.length === 0 ? (
          <div className="square-home-state square-campus-feed-empty">
            <h2>暂时还没有内容</h2>
            <p>{currentTab === 'college' ? '学院通知更新后会优先出现在这里。' : '学校公告更新后会优先出现在这里。'}</p>
          </div>
        ) : (
          <div className="square-campus-feed-list" aria-label={currentMeta.label}>
            {feedItems.map((item) => {
              const firstImage = item.images?.[0]?.url ? getUploadUrl(item.images[0].url) : null;
              return (
                <Link key={item.id} to={`/about/campus/${item.id}`} className="square-campus-feed-card">
                  <div className="square-campus-feed-card__meta">
                    <span className="square-campus-feed-card__org">{item.organization?.name || currentMeta.label}</span>
                    <span className="square-campus-feed-card__time">{formatPostTime(item.created_at, true)}</span>
                  </div>
                  <div className="square-campus-feed-card__body">
                    <div className="square-campus-feed-card__content">
                      <h2 className="square-campus-feed-card__title">{item.title}</h2>
                      <p className="square-campus-feed-card__excerpt">{item.content}</p>
                    </div>
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt=""
                        className="square-campus-feed-card__image"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })}

            {feedQuery.hasNextPage ? (
              <button
                type="button"
                className="square-campus-feed-more"
                onClick={() => feedQuery.fetchNextPage()}
                disabled={feedQuery.isFetchingNextPage}
              >
                {feedQuery.isFetchingNextPage ? '加载中...' : '查看更多公告'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </RouteTransition>
  );
}
