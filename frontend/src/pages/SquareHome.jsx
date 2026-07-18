import { useQuery } from '@tanstack/react-query';
import { BookOpenText, HandHelping, Shapes, Store } from 'lucide-react';
import { getSquareBanners, getSquareHomeSummary } from '@shared/api/square';
import { useLanguage } from '../context/LanguageContext';
import CanteenBannerCarousel from '../features/canteen/CanteenBannerCarousel';
import TodayCampusHero from '../components/square/TodayCampusHero';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
import MyCampusRecommendations from '../components/square/MyCampusRecommendations';
import PageSkeleton from '../components/ui/PageSkeleton';
import ErrorState from '../components/ui/ErrorState';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '@shared/query/queryKeys';
import './SquareHome.css';

const PRIMARY_ACTIONS = [
  {
    label: '社团广场',
    labelEn: 'Club Plaza',
    to: '/about/club',
    icon: <Shapes size={18} strokeWidth={2} />,
    tone: 'club',
  },
  {
    label: '马校一站通',
    labelEn: 'XMUM Guide',
    to: '/about/freshman-guide',
    icon: <BookOpenText size={18} strokeWidth={2} />,
    tone: 'guide',
  },
  {
    label: '帮帮我',
    labelEn: 'Help Me',
    to: '/about/errands',
    icon: <HandHelping size={18} strokeWidth={2} />,
    tone: 'help',
  },
  {
    label: '出物',
    labelEn: 'Marketplace',
    to: '/about/second-hand',
    icon: <Store size={18} strokeWidth={2} />,
    tone: 'market',
  },
];

function formatMeta(item, fallback) {
  const meta = [];
  if (item.organization_name) meta.push(item.organization_name);
  if (item.club_name) meta.push(item.club_name);
  if (item.location) meta.push(item.location);
  if (item.status_label) meta.push(item.status_label);
  return meta.filter(Boolean).join(' · ') || fallback;
}

function buildRecommendationSummary(summary, isEn) {
  const cards = [];

  (summary.campus_highlights || []).slice(0, 1).forEach((item) => {
    cards.push({
      id: `campus-${item.id}`,
      badge: isEn ? 'Campus' : '校园',
      title: item.title,
      meta: formatMeta(item, isEn ? 'Campus bulletin' : '校园公告'),
      href: `/about/campus/posts/${item.id}`,
    });
  });

  (summary.hot_activities || []).slice(0, 1).forEach((item) => {
    cards.push({
      id: `activity-${item.id}`,
      badge: isEn ? 'Event' : '活动',
      title: item.title,
      meta: formatMeta(item, isEn ? 'Club activity' : '社团活动'),
      href: '/about/club',
    });
  });

  (summary.hot_treeholes || []).slice(0, Math.max(0, 2 - cards.length)).forEach((item) => {
    cards.push({
      id: `treehole-${item.id}`,
      badge: isEn ? 'Discussion' : '讨论',
      title: item.excerpt || (isEn ? 'Open the discussion' : '打开这条讨论'),
      meta: `${item.like_count || 0}${isEn ? ' likes' : ' 赞'} · ${item.comment_count || 0}${isEn ? ' comments' : ' 评论'}`,
      href: `/posts/${item.id}`,
    });
  });

  return {
    is_personalized: false,
    profile: {},
    cards: cards.slice(0, 2),
  };
}

export default function SquareHome() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

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
  };
  const recommendationSummary = buildRecommendationSummary(summary, isEn);

  return (
    <RouteTransition className="square-home-page">
      <div className="square-home-inner">
        <FadeInSection className="square-home-slot square-home-slot--banner" delay={0}>
          <CanteenBannerCarousel
            fetchFn={getSquareBanners}
            queryKey={QK.squareBanners()}
            adminTo="/about/admin/orgs?tab=banners"
          />
        </FadeInSection>

        {summaryQuery.isLoading ? (
          <PageSkeleton variant="dashboard" hero metrics={3} items={2} className="square-home-skeleton" />
        ) : summaryQuery.isError ? (
          <ErrorState
            className="square-home-state square-home-slot square-home-slot--state"
            title={isEn ? 'Failed to load square summary' : '首页摘要加载失败'}
            description={isEn ? 'Pull down and try again.' : '请下拉刷新后重试。'}
            onActionClick={() => summaryQuery.refetch()}
          />
        ) : (
          <>
            <FadeInSection className="square-home-slot square-home-slot--actions" delay={0.03}>
              <TodayCampusQuickActions actions={PRIMARY_ACTIONS} />
            </FadeInSection>

            <FadeInSection className="square-home-slot square-home-slot--hero" delay={0.06}>
              <TodayCampusHero />
            </FadeInSection>

            <FadeInSection className="square-home-slot square-home-slot--recommendations" delay={0.1}>
              <MyCampusRecommendations summary={recommendationSummary} />
            </FadeInSection>
          </>
        )}
      </div>
    </RouteTransition>
  );
}
