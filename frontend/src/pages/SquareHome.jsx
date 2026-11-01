import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { squareBannerDemo, squareBannerMode } from '../dev/squareBannerPreview';
import { getSquareBanners } from '@shared/api/square';
import CanteenBannerCarousel from '../features/canteen/CanteenBannerCarousel';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import { QK } from '@shared/query/queryKeys';
import CampusNewsRemote from '../features/campus-news/CampusNewsRemote';
import './SquareHome.css';

export default function SquareHome() {
  const location = useLocation();
  let savedMode = null;
  if (import.meta.env.DEV) {
    try { savedMode = sessionStorage.getItem('square-banner-preview'); } catch { /* storage may be disabled */ }
  }
  const mode = squareBannerMode(import.meta.env.DEV, location.search, savedMode);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try { sessionStorage.setItem('square-banner-preview', mode); } catch { /* storage may be disabled */ }
  }, [mode]);
  const demo = mode === 'demo';
  return (
    <RouteTransition className="square-home-page square-news-home">
      <div className="square-home-inner square-news-home__inner">
        {import.meta.env.DEV && <p className="square-news-banner-source">
          {demo ? '轮播演示数据（仅本地开发）' : '轮播使用原 API（需本地后端）'}
          {' · '}<Link to={`/about?squareBanners=${demo ? 'api' : 'demo'}`}>{demo ? '切换真实 API' : '切换演示数据'}</Link>
        </p>}
        <FadeInSection className="square-home-slot square-home-slot--banner" delay={0}>
          <CanteenBannerCarousel
            fetchFn={demo ? async () => squareBannerDemo : getSquareBanners}
            queryKey={demo ? ['dev-square-banners-demo'] : QK.squareBanners()}
            adminTo="/about/admin/orgs?tab=banners"
            placementType="square"
          />
        </FadeInSection>

        <CampusNewsRemote />
      </div>
    </RouteTransition>
  );
}
