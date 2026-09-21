import { NeoAlert } from '../retroui/Alert';
import NeoButton from './Button';

export default function ErrorState({
  title,
  description,
  actionLabel,
  onActionClick,
  action = null,
  eyebrow,
  className = '',
}) {
  const resolvedAction = action || (
    onActionClick
      ? {
          label: actionLabel || 'Retry',
          onClick: onActionClick,
          variant: 'danger',
        }
      : null
  );

  return (
    <NeoAlert status="error" className={className}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider mb-1">{eyebrow}</p>
      )}
      <NeoAlert.Title>{title}</NeoAlert.Title>
      {description && <NeoAlert.Description>{description}</NeoAlert.Description>}
      {resolvedAction && typeof resolvedAction.onClick === 'function' && (
        <div className="mt-3">
          <NeoButton type="button" variant={resolvedAction.variant || 'danger'} onClick={resolvedAction.onClick}>
            {resolvedAction.label}
          </NeoButton>
        </div>
      )}
    </NeoAlert>
  );
}