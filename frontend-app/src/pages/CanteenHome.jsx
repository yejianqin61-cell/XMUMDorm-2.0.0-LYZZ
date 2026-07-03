import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenStrings } from '../i18n/canteenStrings';
import CanteenSearchBar from '../components/canteen/CanteenSearchBar';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import CanteenRegionGrid from '../components/canteen/CanteenRegionGrid';
import CanteenHomeRankings from '../components/canteen/CanteenHomeRankings';
import CanteenPickMeal from '../components/canteen/CanteenPickMeal';
import CanteenFoodSquare from '../components/canteen/CanteenFoodSquare';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import './CanteenHome.css';

/** V3.0 食堂工具型首页 */
export default function CanteenHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);

  return (
    <RouteTransition className="canteen-home-page">
      <div className="canteen-home-inner">
        <FadeInSection delay={0}>
          <CanteenSearchBar />
        </FadeInSection>
        <FadeInSection delay={0.03}>
          <CanteenBannerCarousel />
        </FadeInSection>
        <FadeInSection delay={0.06}>
          <CanteenRegionGrid />
        </FadeInSection>
        <FadeInSection delay={0.09}>
          <CanteenHomeRankings />
        </FadeInSection>
        <FadeInSection delay={0.12}>
          <CanteenPickMeal />
        </FadeInSection>
        <FadeInSection delay={0.15}>
          <CanteenFoodSquare />
        </FadeInSection>
        <div className="canteen-section canteen-home-footer">
          <Link to="/eat/map" className="canteen-home-map-link">
            {t.mapMode}
          </Link>
        </div>
      </div>
    </RouteTransition>
  );
}
