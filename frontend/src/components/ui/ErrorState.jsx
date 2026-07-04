import AppCard from './AppCard';
import { useLanguage } from '../../context/LanguageContext';
import Button from './Button';

export default function ErrorState({
  title,
  description,
  actionLabel,
  onActionClick,
  action = null,
  icon = '!',
  eyebrow,
  className = '',
}) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const finalTitle = title || (isEn ? 'Load failed' : '加载失败');
  const finalActionLabel = actionLabel || (isEn ? 'Retry' : '重试');
  const finalEyebrow = eyebrow || (isEn ? 'Error' : '错误');
  const resolvedAction = action || (
    onActionClick
      ? {
          label: finalActionLabel,
          onClick: onActionClick,
          variant: 'danger',
        }
      : null
  );

  return (
    <AppCard className={className} tone="muted">
      <div className="ui-state ui-state--error" role="alert" aria-label={finalTitle}>
        <div className="ui-state__art" aria-hidden="true">
          <span className="ui-state__icon">{icon}</span>
        </div>
        {finalEyebrow ? <p className="ui-state__eyebrow">{finalEyebrow}</p> : null}
        <h3 className="ui-state__title">{finalTitle}</h3>
        {description ? <p className="ui-state__description">{description}</p> : null}
        {resolvedAction ? (
          <div className="ui-state__actions">
            <Button type="button" variant={resolvedAction.variant || 'danger'} onClick={resolvedAction.onClick}>
              {resolvedAction.label}
            </Button>
          </div>
        ) : null}
      </div>
    </AppCard>
  );
}
