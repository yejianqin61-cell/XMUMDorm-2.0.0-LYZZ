import { Link } from 'react-router-dom';

export default function TodayCampusModuleGrid({ items }) {
  return (
    <section className="today-campus-panel">
      <div className="square-section-header">
        <h2 className="square-section-title">校园入口</h2>
      </div>
      <div className="square-grid">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="square-grid-card pressable">
            <span className="square-grid-icon" aria-hidden="true">{item.icon}</span>
            <span className="square-grid-label">{item.label}</span>
            <span className="square-grid-desc">{item.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
