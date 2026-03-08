import Card from './Card';
import './Skeleton.css';
import './SkeletonCard.css';

/** 通用卡片骨架：与 MerchantCard 布局一致（logo 48x48 + 标题行 + 描述行） */
function SkeletonCard() {
  return (
    <Card as="div" className="skeleton-card-wrap">
      <div className="skeleton-card">
        <div className="skeleton skeleton-card-logo skeleton-shimmer" />
        <div className="skeleton-card-body">
          <div className="skeleton skeleton-card-title skeleton-shimmer" />
          <div className="skeleton skeleton-card-desc skeleton-shimmer" />
        </div>
      </div>
    </Card>
  );
}

export default SkeletonCard;
