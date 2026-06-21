import { Link } from 'react-router-dom';
import ActionCard from '../ui/ActionCard';

export default function TodayCampusModuleGrid({ items }) {
  return (
    <section className="today-campus-panel">
      <div className="square-section-header">
        <h2 className="square-section-title">校园入口</h2>
      </div>
      <div className="square-grid">
        {items.map((item) => (
          <ActionCard
            key={item.to}
            as={Link}
            to={item.to}
            className="square-grid-card pressable"
            icon={item.icon}
            title={item.label}
            hint={item.hint}
          />
        ))}
      </div>
    </section>
  );
}
