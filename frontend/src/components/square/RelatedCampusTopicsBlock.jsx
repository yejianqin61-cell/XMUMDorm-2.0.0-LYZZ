import { Link } from 'react-router-dom';
import AppCard from '../ui/AppCard';

export default function RelatedCampusTopicsBlock({ items = [] }) {
  if (!items.length) return null;

  return (
    <AppCard className="treehole-rhythm-card treehole-rhythm-card--campus" interactive={false}>
      <div className="treehole-rhythm-card__eyebrow">Campus Pulse</div>
      <h3 className="treehole-rhythm-card__title">和你校园身份更相关</h3>
      <div className="treehole-rhythm-list">
        {items.map((item) => (
          <Link key={item.id} to={item.href} className="treehole-rhythm-link">
            <span className="treehole-rhythm-link__title">{item.title}</span>
            <span className="treehole-rhythm-link__meta">{item.reason}</span>
          </Link>
        ))}
      </div>
    </AppCard>
  );
}
