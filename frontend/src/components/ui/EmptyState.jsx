import { Link } from 'react-router-dom';
import { NeoEmpty } from '../retroui/Empty';
import NeoButton from './Button';

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onActionClick,
  action = null,
  icon = null,
  eyebrow,
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
    <NeoEmpty className={className}>
      <NeoEmpty.Content>
        {icon && <NeoEmpty.Icon>{icon}</NeoEmpty.Icon>}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <NeoEmpty.Title>{title}</NeoEmpty.Title>
        <NeoEmpty.Separator />
        {description && <NeoEmpty.Description>{description}</NeoEmpty.Description>}
        {hasAction && (
          <>
            {resolvedAction.to ? (
              <NeoButton as={Link} to={resolvedAction.to} variant={resolvedAction.variant || 'primary'} onClick={resolvedAction.onClick}>
                {resolvedAction.label}
              </NeoButton>
            ) : (
              <NeoButton type="button" variant={resolvedAction.variant || 'primary'} onClick={resolvedAction.onClick}>
                {resolvedAction.label}
              </NeoButton>
            )}
          </>
        )}
      </NeoEmpty.Content>
    </NeoEmpty>
  );
}