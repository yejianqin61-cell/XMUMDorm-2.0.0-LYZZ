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

function SquareHomeSkeleton() {
  return (
    <div className="square-home-skeleton" aria-hidden="true">
      <div className="square-home-skeleton__hero" />
      <div className="square-home-skeleton__metrics">
        <span />
        <span />
        <span />
      </div>
      <div className="square-home-skeleton__block" />
      <div className="square-home-skeleton__block square-home-skeleton__block--short" />
    </div>
  );
}

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
    <div className="square-home-page">
      <div className="square-home-inner">
        <CanteenBannerCarousel
          fetchFn={getSquareBanners}
          queryKey={QK.squareBanners()}
          adminTo="/about/admin/orgs?tab=banners"
        />
        {summaryQuery.isLoading ? (
          <SquareHomeSkeleton />
        ) : summaryQuery.isError ? (
          <div className="state-error square-home-state">首页摘要加载失败，请下拉刷新后重试。</div>
        ) : (
          <>
            <TodayCampusHero
              quickStats={summary.quick_stats}
              latestTopicTitle={latestTopicTitle}
              latestCampusTitle={latestCampusTitle}
            />
            <TodayCampusSummary summary={summary} />
            <TodayCampusQuickActions actions={QUICK_ACTIONS} />
            <TodayCampusHotActivities activities={summary.hot_activities || []} />
            <TodayCampusHotTopics topics={summary.hot_topics || []} />
            <TodayCampusModuleGrid items={GRID_ITEMS} />
          </>
        )}
        <div className="square-section square-home-footer">
          <Link to="/about/map" className="square-home-map-link">
            地图模式
          </Link>
        </div>
      </div>
    </div>
  );
}
