import { Link } from 'react-router-dom';
import ActionCard from '../ui/ActionCard';

export default function TodayCampusQuickActions({ actions }) {
  return (
    <section className="today-campus-panel">
      <div className="square-section-header">
        <h2 className="square-section-title">快捷入口</h2>
      </div>
      <div className="today-campus-quick-actions">
        {actions.map((action) => (
          <ActionCard
            key={action.to}
            as={Link}
            to={action.to}
            className="today-campus-quick-action pressable"
            icon={action.icon}
            title={action.label}
            hint={action.hint}
          />
        ))}
      </div>
    </section>
  );
}
