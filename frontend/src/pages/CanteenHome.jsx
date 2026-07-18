import CanteenSearchBar from '../components/canteen/CanteenSearchBar';
import CanteenBannerCarousel from '../features/canteen/CanteenBannerCarousel';
import CanteenRegionGrid from '../features/canteen/CanteenRegionGrid';
import CanteenHomeRankings from '../features/canteen/CanteenHomeRankings';
import CanteenPickMeal from '../features/canteen/CanteenPickMeal';
import CanteenFoodSquare from '../features/canteen/CanteenFoodSquare';
import './CanteenHome.css';

export default function CanteenHome() {
  return (
    <div className="canteen-home-page">
      <div className="canteen-home-inner">
        <CanteenSearchBar />
        <CanteenBannerCarousel />
        <CanteenRegionGrid />
        <CanteenHomeRankings
          title="大家都在吃"
          showTabs={false}
          footer={<CanteenPickMeal compact />}
        />
        <CanteenFoodSquare title="食堂讨论" limit={3} showHint={false} />
      </div>
    </div>
  );
}
