import { Link } from 'react-router-dom';
import AppCard from '../ui/AppCard';
import SectionHeader from '../templates/SectionHeader';
import { useLanguage } from '../../context/LanguageContext';

export default function TodayCampusQuickActions({ actions }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  return (
    <section className="today-campus-panel square-home-block">
      <SectionHeader
        title={isEn ? 'Quick Access' : '快捷入口'}
        description={isEn ? 'Jump straight to the four highest-frequency campus paths.' : '先进入四条最高频的校园主链路。'}
        compact
      />
      <div className="today-campus-quick-actions">
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
                <p className="today-campus-quick-action__hint">{isEn ? action.hintEn || action.hint : action.hint}</p>
              </div>
            </AppCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
