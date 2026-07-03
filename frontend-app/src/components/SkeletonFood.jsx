import Card from './Card';
import './Skeleton.css';
import './SkeletonFood.css';

/** 菜品卡片骨架：与 FoodCard 布局一致（图 80x80 + 名称 + 价格行） */
function SkeletonFood() {
  return (
    <Card as="div" className="skeleton-food-wrap">
      <div className="skeleton-food">
        <div className="skeleton skeleton-food-image skeleton-shimmer" />
        <div className="skeleton-food-body">
          <div className="skeleton skeleton-food-name skeleton-shimmer" />
          <div className="skeleton skeleton-food-price skeleton-shimmer" />
        </div>
      </div>
    </Card>
  );
}

export default SkeletonFood;
