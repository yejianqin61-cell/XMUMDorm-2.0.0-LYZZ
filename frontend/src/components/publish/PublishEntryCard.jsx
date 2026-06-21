import AppCard from '../ui/AppCard';

function PublishEntryCard({
  icon,
  title,
  description,
  meta,
  badge,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`publish-entry-card${disabled ? ' is-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <AppCard className="publish-entry-card__surface" interactive={!disabled} strong>
        <div className="publish-entry-card__head">
          <span className="publish-entry-card__icon" aria-hidden="true">
            {icon}
          </span>
          {badge ? <span className="publish-entry-card__badge">{badge}</span> : null}
        </div>
        <div className="publish-entry-card__body">
          <h3 className="publish-entry-card__title">{title}</h3>
          <p className="publish-entry-card__description">{description}</p>
          {meta ? <p className="publish-entry-card__meta">{meta}</p> : null}
        </div>
      </AppCard>
    </button>
  );
}

export default PublishEntryCard;
