import { useQuery } from '@tanstack/react-query';
import { BookOpenText, HandHelping, Shapes, Store } from 'lucide-react';
import { getSquareBanners, getSquareHomeSummary } from '../api/square';
import { useLanguage } from '../context/LanguageContext';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import TodayCampusHero from '../components/square/TodayCampusHero';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
import TodayCampusTrendingBoard from '../components/square/TodayCampusTrendingBoard';
import PageSkeleton from '../components/ui/PageSkeleton';
import ErrorState from '../components/ui/ErrorState';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '../query/queryKeys';
import './SquareHome.css';

const PRIMARY_ACTIONS = [
  {
    label: '社团广场',
    labelEn: 'Club Plaza',
    to: '/about/club',
    icon: <Shapes size={18} strokeWidth={2} />,
    emoji: '🎨',
    hint: '看社团、找活动、认识同好',
    hintEn: 'Discover clubs, activities, and like-minded people',
    tone: 'club',
  },
  {
    label: '马校一站通',
    labelEn: 'XMUM Guide',
    to: '/about/freshman-guide',
    icon: <BookOpenText size={18} strokeWidth={2} />,
    emoji: '📚',
    hint: '攻略、课程与新生信息',
    hintEn: 'Guides, courses, and freshman essentials',
    tone: 'guide',
  },
  {
    label: '帮帮我',
    labelEn: 'Help Me',
    to: '/about/errands',
    icon: <HandHelping size={18} strokeWidth={2} />,
    emoji: '🤝',
    hint: '跑腿求助，解决生活小事',
    hintEn: 'Get quick help with daily errands',
    tone: 'help',
  },
  {
    label: '出物',
    labelEn: 'Marketplace',
    to: '/about/second-hand',
    icon: <Store size={18} strokeWidth={2} />,
    emoji: '🪄',
    hint: '校园二手流通更快一点',
    hintEn: 'Move second-hand items faster on campus',
    tone: 'market',
  },
];

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
    quick_stats: {},
  };

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
            title={isEn ? 'Failed to load square summary' : '首页摘要加载失败'}
            description={isEn ? 'Pull down and try again.' : '请下拉刷新后重试。'}
            onActionClick={() => summaryQuery.refetch()}
          />
        ) : (
          <>
            <FadeInSection delay={0.03}>
              <TodayCampusTrendingBoard topics={summary.hot_topics || []} />
            </FadeInSection>

            <FadeInSection delay={0.06}>
              <TodayCampusQuickActions actions={PRIMARY_ACTIONS} />
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <TodayCampusHero quickStats={summary.quick_stats} />
            </FadeInSection>
          </>
        )}
      </div>
    </RouteTransition>
  );
}
