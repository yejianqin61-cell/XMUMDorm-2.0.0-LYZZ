import { Link } from 'react-router-dom';
import AppCard from '../ui/AppCard';

export default function TodayCampusQuickActions({ actions }) {
  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">快捷入口</h2>
          <p className="square-section-subtitle">保留四个最高频入口，用更统一的卡面直接进入核心模块。</p>
        </div>
      </div>
      <div className="today-campus-quick-actions">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="today-campus-quick-action-link">
            <AppCard className={`today-campus-quick-action today-campus-quick-action--${action.tone}`} interactive>
              <div className="today-campus-quick-action__pattern" aria-hidden="true" />
              <div className="today-campus-quick-action__top">
                <span className="today-campus-quick-action__emoji" aria-hidden="true">
                  {action.emoji}
                </span>
                <span className="today-campus-quick-action__icon" aria-hidden="true">
                  {action.icon}
                </span>
              </div>
              <div className="today-campus-quick-action__content">
                <h3 className="today-campus-quick-action__title">{action.label}</h3>
                <p className="today-campus-quick-action__hint">{action.hint}</p>
              </div>
            </AppCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
