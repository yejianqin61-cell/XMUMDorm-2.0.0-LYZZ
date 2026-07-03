import AppCard from './AppCard';
import { useLanguage } from '../../context/LanguageContext';

export default function ErrorState({ title, description, actionLabel, onActionClick, className = '' }) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const finalTitle = title || (isEn ? 'Load failed' : '加载失败');
  const finalActionLabel = actionLabel || (isEn ? 'Retry' : '重试');

  return (
    <AppCard className={className} tone="muted">
      <div className="ui-state ui-state--error" role="alert" aria-label={finalTitle}>
        <span className="ui-state__icon" aria-hidden="true">!</span>
        <h3 className="ui-state__title">{finalTitle}</h3>
        {description ? <p className="ui-state__description">{description}</p> : null}
        {onActionClick ? (
          <button type="button" className="ui-state__action" onClick={onActionClick}>
            {finalActionLabel}
          </button>
        ) : null}
      </div>
    </AppCard>
  );
}
