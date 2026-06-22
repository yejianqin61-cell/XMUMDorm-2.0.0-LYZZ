import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHotPostTags } from '../api/posts';
import { getSquareBanners, getSquareHomeSummary, getSquarePersonalizedSummary } from '../api/square';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import HotTagsStrip from '../components/square/HotTagsStrip';
import MyCampusRecommendations from '../components/square/MyCampusRecommendations';
import TodayCampusHero from '../components/square/TodayCampusHero';
import TodayCampusPreviewRail from '../components/square/TodayCampusPreviewRail';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
import AppCard from '../components/ui/AppCard';
import PageSkeleton from '../components/ui/PageSkeleton';
import ErrorState from '../components/ui/ErrorState';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '../query/queryKeys';
import './SquareHome.css';

const PRIMARY_ACTIONS = [
  { label: '社团广场', to: '/about/club', icon: '🎨', hint: '看社团、找活动、认识同好' },
  { label: '马校一站通', to: '/about/freshman-guide', icon: '📚', hint: '攻略、课程与新生信息' },
  { label: '帮帮我', to: '/about/errands', icon: '🤝', hint: '跑腿求助，解决生活小事' },
  { label: '出物', to: '/about/second-hand', icon: '🛍️', hint: '校园二手流通更快一点' },
];

const EXPLORE_LINKS = [
  { to: '/about/trending', label: '看热议' },
  { to: '/publish', label: '发内容' },
  { to: '/about/map', label: '地图模式' },
];

function buildPreviewItems(summary) {
  const topics = (summary.hot_topics || []).slice(0, 2).map((topic) => ({
    kind: 'topic',
    id: topic.id,
    to: `/about/trending/${topic.id}`,
    badge: '热议',
    title: topic.title,
    meta: `${topic.post_count || 0} 条讨论`,
  }));
  const activities = (summary.hot_activities || []).slice(0, 2).map((activity) => ({
    kind: 'activity',
    id: activity.id,
    to: `/about/club/activity/${activity.id}`,
    badge: '活动',
    title: activity.title,
    meta: activity.club_name || activity.status_label || '社团活动',
  }));

  const merged = [];
  const maxLength = Math.max(topics.length, activities.length);
  for (let index = 0; index < maxLength; index += 1) {
    if (topics[index]) merged.push(topics[index]);
    if (activities[index]) merged.push(activities[index]);
  }
  return merged.slice(0, 4);
}

export default function SquareHome() {
  const summaryQuery = useQuery({
    queryKey: QK.squareHomeSummary(),
    queryFn: getSquareHomeSummary,
    staleTime: 30 * 1000,
  });
  const personalizedQuery = useQuery({
    queryKey: QK.squarePersonalizedSummary(),
    queryFn: getSquarePersonalizedSummary,
    staleTime: 60 * 1000,
  });
  const hotTagsQuery = useQuery({
    queryKey: QK.postHotTags(8),
    queryFn: () => getHotPostTags(8),
    staleTime: 60 * 1000,
  });

  const summary = summaryQuery.data || {
    hot_topics: [],
    hot_activities: [],
    hot_treeholes: [],
    campus_highlights: [],
    quick_stats: {},
  };
  const personalizedSummary = personalizedQuery.data || {
    cards: [],
    hot_tags: [],
    is_personalized: false,
    profile: {},
  };
  const hotTags = hotTagsQuery.data || personalizedSummary.hot_tags || [];
  const previewItems = buildPreviewItems(summary);

  const latestTopicTitle = summary.hot_topics?.[0]?.title || '';
  const latestCampusTitle = summary.campus_highlights?.[0]?.title || '';

  return (
    <RouteTransition className="square-home-page">
      <div className="square-home-inner">
        <FadeInSection delay={0}>
          <CanteenBannerCarousel
            fetchFn={getSquareBanners}
            queryKey={QK.squareBanners()}
            adminTo="/about/admin/orgs?tab=banners"
          />
        </FadeInSection>

        {summaryQuery.isLoading ? (
          <PageSkeleton hero metrics={3} items={2} className="square-home-skeleton" />
        ) : summaryQuery.isError ? (
          <ErrorState
            className="square-home-state"
            title="首页摘要加载失败"
            description="请下拉刷新后重试。"
            onActionClick={() => summaryQuery.refetch()}
          />
        ) : (
          <>
            <FadeInSection delay={0.02}>
              <TodayCampusQuickActions actions={PRIMARY_ACTIONS} />
            </FadeInSection>

            <FadeInSection delay={0.05}>
              <TodayCampusHero
                quickStats={summary.quick_stats}
                latestTopicTitle={latestTopicTitle}
                latestCampusTitle={latestCampusTitle}
              />
            </FadeInSection>

            <FadeInSection delay={0.08}>
              <MyCampusRecommendations summary={personalizedSummary} />
            </FadeInSection>

            <FadeInSection delay={0.11}>
              <HotTagsStrip tags={hotTags} />
            </FadeInSection>

            <FadeInSection delay={0.14}>
              <TodayCampusPreviewRail items={previewItems} />
            </FadeInSection>

            <FadeInSection delay={0.16}>
              <Link to="/publish" className="square-home-publish-link">
                <AppCard className="square-home-publish-card" interactive strong>
                  <div className="square-home-publish-card__row">
                    <div>
                      <p className="square-home-publish-card__eyebrow">Publish Center</p>
                      <h3 className="square-home-publish-card__title">统一发布入口</h3>
                      <p className="square-home-publish-card__desc">
                        发树洞、二手、跑腿和社团内容都从这里进入。
                      </p>
                    </div>
                    <span className="square-home-publish-card__arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </AppCard>
              </Link>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <section className="square-section square-home-explore">
                <div className="square-section-header square-section-header--stack">
                  <div>
                    <h2 className="square-section-title">继续探索</h2>
                    <p className="square-section-subtitle">
                      其他入口往下收，让首页先保持轻一点。
                    </p>
                  </div>
                </div>
                <div className="square-home-explore-links">
                  {EXPLORE_LINKS.map((item) => (
                    <Link key={item.to} to={item.to} className="square-home-explore-link">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
            </FadeInSection>
          </>
        )}
      </div>
    </RouteTransition>
  );
}
