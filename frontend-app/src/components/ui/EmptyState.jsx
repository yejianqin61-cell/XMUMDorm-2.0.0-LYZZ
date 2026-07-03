import { Link } from 'react-router-dom';
import AppCard from './AppCard';

export default function EmptyState({ title, description, actionLabel, actionTo, onActionClick, icon = '○', className = '' }) {
  const hasAction = actionLabel && (actionTo || onActionClick);

  return (
    <AppCard className={className} tone="muted">
      <div className="ui-state ui-state--empty" role="status" aria-label={title}>
        <span className="ui-state__icon" aria-hidden="true">{icon}</span>
        <h3 className="ui-state__title">{title}</h3>
        {description ? <p className="ui-state__description">{description}</p> : null}
        {hasAction ? (
          actionTo ? (
            <Link to={actionTo} className="ui-state__action" onClick={onActionClick}>
              {actionLabel}
            </Link>
          ) : (
            <button type="button" className="ui-state__action" onClick={onActionClick}>
              {actionLabel}
            </button>
          )
        ) : null}
      </div>
    </AppCard>
  );
}
