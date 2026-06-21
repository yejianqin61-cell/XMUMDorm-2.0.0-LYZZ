import { Link } from 'react-router-dom';

export default function TodayCampusQuickActions({ actions }) {
  return (
    <section className="today-campus-panel">
      <div className="square-section-header">
        <h2 className="square-section-title">快捷入口</h2>
      </div>
      <div className="today-campus-quick-actions">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="today-campus-quick-action pressable">
            <span className="today-campus-quick-action__icon" aria-hidden="true">{action.icon}</span>
            <span className="today-campus-quick-action__label">{action.label}</span>
            <span className="today-campus-quick-action__hint">{action.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
