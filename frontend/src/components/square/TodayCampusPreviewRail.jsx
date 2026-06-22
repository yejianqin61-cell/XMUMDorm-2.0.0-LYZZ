import { Link } from 'react-router-dom';

export default function TodayCampusPreviewRail({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">轻浏览</h2>
          <p className="square-section-subtitle">把活动和热议压成横向预览，不再在首页平铺详情列表。</p>
        </div>
        <Link to="/about/trending" className="square-section-more">
          查看更多 →
        </Link>
      </div>
      <div className="square-preview-rail" role="list" aria-label="轻浏览预览">
        {items.map((item) => (
          <Link key={`${item.kind}-${item.id}`} to={item.to} className="square-preview-card" role="listitem">
            <span className={`square-preview-card__badge square-preview-card__badge--${item.kind}`}>
              {item.badge}
            </span>
            <h3 className="square-preview-card__title">{item.title}</h3>
            <p className="square-preview-card__meta">{item.meta}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
