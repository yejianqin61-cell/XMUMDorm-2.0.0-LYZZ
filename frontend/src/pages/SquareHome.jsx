import { useQuery } from '@tanstack/react-query';
import { BookOpenText, HandHelping, Shapes, Store } from 'lucide-react';
import { getSquareBanners, getSquareHomeSummary } from '@shared/api/square';
import { useLanguage } from '../context/LanguageContext';
import CanteenBannerCarousel from '../features/canteen/CanteenBannerCarousel';
import TodayCampusHero from '../components/square/TodayCampusHero';
import TodayCampusQuickActions from '../components/square/TodayCampusQuickActions';
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

export default function SquareHome() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const summaryQuery = useQuery({
    queryKey: QK.squareHomeSummary(),
    queryFn: getSquareHomeSummary,
    staleTime: 30 * 1000,
  });

  return (
    <RouteTransition className="square-home-page">
      <div className="square-home-inner">
        <FadeInSection className="square-home-slot square-home-slot--banner" delay={0}>
          <CanteenBannerCarousel
            fetchFn={getSquareBanners}
            queryKey={QK.squareBanners()}
            adminTo="/about/admin/orgs?tab=banners"
            placementType="square"
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
          </>
        )}
      </div>
    </RouteTransition>
  );
}