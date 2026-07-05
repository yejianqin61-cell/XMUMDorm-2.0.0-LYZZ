import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getCanteenStrings } from '../i18n/canteenStrings';
import CanteenSearchBar from '../components/canteen/CanteenSearchBar';
import CanteenBannerCarousel from '../features/canteen/CanteenBannerCarousel';
import CanteenRegionGrid from '../features/canteen/CanteenRegionGrid';
import CanteenHomeRankings from '../features/canteen/CanteenHomeRankings';
import CanteenPickMeal from '../features/canteen/CanteenPickMeal';
import CanteenFoodSquare from '../features/canteen/CanteenFoodSquare';
import FadeInSection from '../components/ui/FadeInSection';
import RouteTransition from '../components/ui/RouteTransition';
import './CanteenHome.css';

export default function CanteenHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);

  return (
    <RouteTransition className="canteen-home-page">
      <div className="canteen-home-inner">
        <section className="canteen-home-hero">
          <div className="canteen-home-hero__intro">
            <p className="canteen-home-hero__eyebrow">{isZh ? '校园食堂' : 'Campus Canteen'}</p>
            <h1 className="canteen-home-hero__title">{isZh ? '食堂' : 'Canteen'}</h1>
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

        <div className="canteen-home-body">
          <main className="canteen-home-main">
            <FadeInSection delay={0}>
              <CanteenSearchBar />
            </FadeInSection>
            <FadeInSection delay={0.04}>
              <CanteenBannerCarousel />
            </FadeInSection>
            <FadeInSection delay={0.08}>
              <CanteenRegionGrid />
            </FadeInSection>
            <FadeInSection delay={0.12}>
              <CanteenHomeRankings />
            </FadeInSection>
            <FadeInSection delay={0.16}>
              <CanteenPickMeal />
            </FadeInSection>
            <FadeInSection delay={0.20}>
              <CanteenFoodSquare />
            </FadeInSection>
          </main>

          <aside className="canteen-home-aside">
            <div className="canteen-home-aside-card">
              <h3 className="canteen-home-aside__title">{isZh ? '快捷入口' : 'Quick Links'}</h3>
              <Link to="/eat/rankings" className="canteen-home-aside-link">
                {isZh ? '排行榜' : 'Rankings'}
              </Link>
              <Link to="/eat/map" className="canteen-home-aside-link">
                {isZh ? '食堂地图' : 'Canteen Map'}
              </Link>
              <Link to="/eat/search" className="canteen-home-aside-link">
                {isZh ? '搜索' : 'Search'}
              </Link>
              <Link to="/merchant/manage" className="canteen-home-aside-link">
                {isZh ? '菜品管理' : 'Manage Food'}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </RouteTransition>
  );
}
