import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import NeoCard from '../retroui/Card';

export default function TodayCampusQuickActions({ actions }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  return (
    <nav className="today-campus-quick-actions" aria-label={isEn ? 'Campus modules' : '校园模块'}>
      {actions.map((action) => (
        <Link key={action.to} to={action.to} className="today-campus-quick-action-link no-underline">
          <NeoCard className="p-5 flex flex-col justify-between min-h-[164px] gap-3">
            <div className="flex items-start justify-between gap-3">
              <span className="today-campus-quick-action__icon" aria-hidden="true">{action.icon}</span>
            </div>
            <span className="today-campus-quick-action__title text-lg font-extrabold tracking-tight">
              {isEn ? action.labelEn || action.label : action.label}
            </span>
          </NeoCard>
        </Link>
      ))}
    </nav>
  );
}