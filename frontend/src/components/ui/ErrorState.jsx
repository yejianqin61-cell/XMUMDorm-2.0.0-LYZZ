import AppCard from './AppCard';

export default function ErrorState({ title = '加载失败', description, actionLabel = '重试', onActionClick, className = '' }) {
  return (
    <AppCard className={className} tone="muted">
      <div className="ui-state ui-state--error" role="alert" aria-label={title}>
        <span className="ui-state__icon" aria-hidden="true">!</span>
        <h3 className="ui-state__title">{title}</h3>
        {description ? <p className="ui-state__description">{description}</p> : null}
        {onActionClick ? (
          <button type="button" className="ui-state__action" onClick={onActionClick}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </AppCard>
  );
}
