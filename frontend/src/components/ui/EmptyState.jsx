import { Link } from 'react-router-dom';
import AppCard from './AppCard';
import Button from './Button';

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onActionClick,
  action = null,
  icon = '○',
  eyebrow = 'Empty',
  className = '',
}) {
  const resolvedAction = action || (
    actionLabel && (actionTo || onActionClick)
      ? {
          label: actionLabel,
          to: actionTo,
          onClick: onActionClick,
        }
      : null
  );
  const hasAction = resolvedAction?.label && (resolvedAction?.to || resolvedAction?.onClick);

  return (
    <AppCard className={className} tone="muted">
      <div className="ui-state ui-state--empty" role="status" aria-label={title}>
        <div className="ui-state__art" aria-hidden="true">
          <span className="ui-state__icon">{icon}</span>
        </div>
        {eyebrow ? <p className="ui-state__eyebrow">{eyebrow}</p> : null}
        <h3 className="ui-state__title">{title}</h3>
        {description ? <p className="ui-state__description">{description}</p> : null}
        {hasAction ? (
          <div className="ui-state__actions">
            {resolvedAction.to ? (
              <Button as={Link} to={resolvedAction.to} variant={resolvedAction.variant || 'primary'} onClick={resolvedAction.onClick}>
                {resolvedAction.label}
              </Button>
            ) : (
              <Button type="button" variant={resolvedAction.variant || 'primary'} onClick={resolvedAction.onClick}>
                {resolvedAction.label}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </AppCard>
  );
}
