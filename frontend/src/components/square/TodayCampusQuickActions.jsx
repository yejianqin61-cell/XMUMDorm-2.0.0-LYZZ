import { Link } from 'react-router-dom';
import AppCard from '../ui/AppCard';
import { useLanguage } from '../../context/LanguageContext';

export default function TodayCampusQuickActions({ actions }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  return (
    <nav className="today-campus-quick-actions" aria-label={isEn ? 'Campus modules' : '校园模块'}>
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="today-campus-quick-action-link">
            <AppCard className={`today-campus-quick-action today-campus-quick-action--${action.tone}`} interactive>
              <div className="today-campus-quick-action__pattern" aria-hidden="true" />
              <div className="today-campus-quick-action__top">
                <span className="today-campus-quick-action__tone" aria-hidden="true" />
                <span className="today-campus-quick-action__icon" aria-hidden="true">
                  {action.icon}
                </span>
              </div>
              <div className="today-campus-quick-action__content">
                <h3 className="today-campus-quick-action__title">{isEn ? action.labelEn || action.label : action.label}</h3>
              </div>
            </AppCard>
          </Link>
        ))}
    </nav>
  );
}
