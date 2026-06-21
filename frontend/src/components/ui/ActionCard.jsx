import AppCard from './AppCard';

export default function ActionCard({ icon, title, description, hint, className = '', ...rest }) {
  return (
    <AppCard className={className} interactive {...rest}>
      <div className="ui-action-card">
        {icon ? <span className="ui-action-card__icon" aria-hidden="true">{icon}</span> : null}
        {title ? <h3 className="ui-card__title">{title}</h3> : null}
        {description ? <p className="ui-card__description">{description}</p> : null}
        {hint ? <span className="ui-card__meta">{hint}</span> : null}
      </div>
    </AppCard>
  );
}
