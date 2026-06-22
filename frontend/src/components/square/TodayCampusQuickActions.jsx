import { Link } from 'react-router-dom';
import ActionCard from '../ui/ActionCard';

export default function TodayCampusQuickActions({ actions }) {
  return (
    <section className="today-campus-panel">
      <div className="square-section-header square-section-header--stack">
        <div>
          <h2 className="square-section-title">快捷入口</h2>
          <p className="square-section-subtitle">保留最高频的四个入口，不把首页继续拉成长表单。</p>
        </div>
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
