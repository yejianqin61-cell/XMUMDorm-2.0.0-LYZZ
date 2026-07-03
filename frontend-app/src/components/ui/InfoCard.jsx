import AppCard from './AppCard';

export default function InfoCard({ eyebrow, title, description, meta, pill, className = '', children, ...rest }) {
  return (
    <AppCard className={className} {...rest}>
      <div className="ui-info-card">
        {(eyebrow || pill) && (
          <div className="ui-card__row">
            {eyebrow ? <span className="ui-card__eyebrow">{eyebrow}</span> : <span />}
            {pill ? <span className="ui-card__pill">{pill}</span> : null}
          </div>
        )}
        {title ? <h3 className="ui-card__title">{title}</h3> : null}
        {description ? <p className="ui-card__description">{description}</p> : null}
        {meta ? <span className="ui-card__meta">{meta}</span> : null}
        {children}
      </div>
    </AppCard>
  );
}
