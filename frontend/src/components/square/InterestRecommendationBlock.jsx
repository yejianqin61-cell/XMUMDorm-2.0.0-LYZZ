import { Link } from 'react-router-dom';
import AppCard from '../ui/AppCard';

export default function InterestRecommendationBlock({ items = [] }) {
  if (!items.length) return null;

  return (
    <AppCard className="treehole-rhythm-card treehole-rhythm-card--interest" interactive={false}>
      <div className="treehole-rhythm-card__eyebrow">More to explore</div>
      <h3 className="treehole-rhythm-card__title">Keep browsing</h3>
      <div className="treehole-rhythm-list">
        {items.map((item) => (
          <Link key={item.id} to={item.href} className="treehole-rhythm-link">
            <span className="treehole-rhythm-link__title">{item.title}</span>
          </Link>
        ))}
      </div>
    </AppCard>
  );
}
