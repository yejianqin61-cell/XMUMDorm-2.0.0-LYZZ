import { Link } from 'react-router-dom';
import CanteenSearchBar from '../components/canteen/CanteenSearchBar';
import CanteenBannerCarousel from '../components/canteen/CanteenBannerCarousel';
import CanteenRegionGrid from '../components/canteen/CanteenRegionGrid';
import CanteenHomeRankings from '../components/canteen/CanteenHomeRankings';
import CanteenPickMeal from '../components/canteen/CanteenPickMeal';
import CanteenFoodSquare from '../components/canteen/CanteenFoodSquare';
import './CanteenHome.css';

/** V3.0 食堂工具型首页 */
export default function CanteenHome() {
  return (
    <div className="canteen-home-page">
      <div className="canteen-home-inner">
        <CanteenSearchBar />
        <CanteenBannerCarousel />
        <CanteenRegionGrid />
        <CanteenHomeRankings />
        <CanteenPickMeal />
        <CanteenFoodSquare />
        <div className="canteen-section canteen-home-footer">
          <Link to="/eat/map" className="canteen-home-map-link">
            地图模式
          </Link>
        </div>
      </div>
    </div>
  );
}
