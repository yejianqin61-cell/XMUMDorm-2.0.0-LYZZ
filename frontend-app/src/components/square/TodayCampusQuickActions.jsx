import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export default function TodayCampusQuickActions({ actions }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  return (
    <nav className="today-campus-panel" aria-label={isEn ? 'Square shortcuts' : '广场快捷入口'}>
      <div className="today-campus-quick-actions">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="today-campus-quick-action-link">
            <span className="today-campus-quick-action__icon" aria-hidden="true">
              {action.icon}
            </span>
            <span className="today-campus-quick-action__title">{isEn ? action.labelEn || action.label : action.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
