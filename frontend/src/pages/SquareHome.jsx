import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSquareBanners, getSquareHomeSummary } from '../api/square';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import TodayCampusHero from '../components/square/TodayCampusHero';
import TodayCampusSummary from '../components/square/TodayCampusSummary';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
import TodayCampusHotActivities from '../components/square/TodayCampusHotActivities';
import TodayCampusHotTopics from '../components/square/TodayCampusHotTopics';
import TodayCampusModuleGrid from '../components/square/TodayCampusModuleGrid';
import AppCard from '../components/ui/AppCard';
import PageSkeleton from '../components/ui/PageSkeleton';
import ErrorState from '../components/ui/ErrorState';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '../query/queryKeys';
import './SquareHome.css';

const GRID_ITEMS = [
  { label: '社团广场', to: '/about/club', icon: '🎨', hint: '看社团、找活动、认识同好' },
  { label: '马校一站通', to: '/about/freshman-guide', icon: '📚', hint: '攻略、课程与新生信息' },
  { label: '帮帮我', to: '/about/errands', icon: '🤝', hint: '跑腿求助，解决生活小事' },
  { label: '出物', to: '/about/second-hand', icon: '🛍️', hint: '校园二手流通更快一点' },
];

const QUICK_ACTIONS = [
  { to: '/post/new', icon: '✍️', label: '发树洞', hint: '快速发布想说的话' },
  { to: '/about/trending', icon: '🔥', label: '看热搜', hint: '追踪今天最热讨论' },
  { to: '/about/club', icon: '🎫', label: '找活动', hint: '进入社团和活动页' },
  { to: '/about/map', icon: '🗺️', label: '校园地图', hint: '切到地图模式浏览' },
];

export default function SquareHome() {
  const summaryQuery = useQuery({
    queryKey: QK.squareHomeSummary(),
    queryFn: getSquareHomeSummary,
    staleTime: 30 * 1000,
  });

  const summary = summaryQuery.data || {
    hot_topics: [],
    hot_activities: [],
    hot_treeholes: [],
    campus_highlights: [],
    quick_stats: {},
  };

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
              <TodayCampusHero
                quickStats={summary.quick_stats}
                latestTopicTitle={latestTopicTitle}
                latestCampusTitle={latestCampusTitle}
              />
            </FadeInSection>
            <FadeInSection delay={0.05}>
              <TodayCampusSummary summary={summary} />
            </FadeInSection>
            <FadeInSection delay={0.07}>
              <Link to="/publish" className="square-home-publish-link">
                <AppCard className="square-home-publish-card" interactive strong>
                  <div className="square-home-publish-card__row">
                    <div>
                      <p className="square-home-publish-card__eyebrow">Publish Center</p>
                      <h3 className="square-home-publish-card__title">统一发布入口</h3>
                      <p className="square-home-publish-card__desc">发树洞、二手、跑腿和社团内容都从这里进入。</p>
                    </div>
                    <span className="square-home-publish-card__arrow" aria-hidden="true">→</span>
                  </div>
                </AppCard>
              </Link>
            </FadeInSection>
            <FadeInSection delay={0.08}>
              <TodayCampusQuickActions actions={QUICK_ACTIONS} />
            </FadeInSection>
            <FadeInSection delay={0.11}>
              <TodayCampusHotActivities activities={summary.hot_activities || []} />
            </FadeInSection>
            <FadeInSection delay={0.14}>
              <TodayCampusHotTopics topics={summary.hot_topics || []} />
            </FadeInSection>
            <FadeInSection delay={0.17}>
              <TodayCampusModuleGrid items={GRID_ITEMS} />
            </FadeInSection>
          </>
        )}
        <div className="square-section square-home-footer">
          <Link to="/about/map" className="square-home-map-link">
            地图模式
          </Link>
        </div>
      </div>
    </RouteTransition>
  );
}
