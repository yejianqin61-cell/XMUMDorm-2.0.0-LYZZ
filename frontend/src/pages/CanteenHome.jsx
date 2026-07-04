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
        <section className="canteen-home-hero">
          <div className="canteen-home-hero__intro">
            <p className="canteen-home-hero__eyebrow">{isZh ? '校园食堂门户' : 'Campus Canteen Portal'}</p>
            <h1 className="canteen-home-hero__title">
              {isZh ? '把吃什么、去哪吃、最近吃什么都放在首页' : 'Keep search, picks, and rankings on one home portal'}
            </h1>
            <p className="canteen-home-hero__subtitle">
              {isZh
                ? '围绕食堂入口、推荐内容、热度榜单和美食内容流，收成一个更像网页首页的浏览节奏。'
                : 'Bring canteen entry points, quick picks, rankings, and food posts into one clearer portal rhythm.'}
            </p>
          </div>
          <div className="canteen-home-hero__stats" aria-label={isZh ? '首页能力摘要' : 'Portal highlights'}>
            <div className="canteen-home-hero__stat">
              <span className="canteen-home-hero__stat-value">{isZh ? '入口' : 'Areas'}</span>
              <span className="canteen-home-hero__stat-label">{t.regionSectionTitle}</span>
            </div>
            <div className="canteen-home-hero__stat">
              <span className="canteen-home-hero__stat-value">{isZh ? '榜单' : 'Ranks'}</span>
              <span className="canteen-home-hero__stat-label">{t.rankingsTitle}</span>
            </div>
            <div className="canteen-home-hero__stat">
              <span className="canteen-home-hero__stat-value">{isZh ? '推荐' : 'Picks'}</span>
              <span className="canteen-home-hero__stat-label">{t.pickTitle}</span>
            </div>
          </div>
        </section>

        <div className="canteen-home-slot canteen-home-slot--search">
          <FadeInSection delay={0}>
            <CanteenSearchBar />
          </FadeInSection>
        </div>
        <div className="canteen-home-slot canteen-home-slot--banner">
          <FadeInSection delay={0.03}>
            <CanteenBannerCarousel />
          </FadeInSection>
        </div>
        <div className="canteen-home-slot canteen-home-slot--regions">
          <FadeInSection delay={0.06}>
            <CanteenRegionGrid />
          </FadeInSection>
        </div>
        <div className="canteen-home-slot canteen-home-slot--rankings">
          <FadeInSection delay={0.09}>
            <CanteenHomeRankings />
          </FadeInSection>
        </div>
        <div className="canteen-home-slot canteen-home-slot--pick">
          <FadeInSection delay={0.12}>
            <CanteenPickMeal />
          </FadeInSection>
        </div>
        <div className="canteen-home-slot canteen-home-slot--square">
          <FadeInSection delay={0.15}>
            <CanteenFoodSquare />
          </FadeInSection>
        </div>
        <div className="canteen-section canteen-home-footer">
          <Link to="/eat/map" className="canteen-home-map-link">
            {t.mapMode}
          </Link>
        </div>
      </div>
    </RouteTransition>
  );
}
