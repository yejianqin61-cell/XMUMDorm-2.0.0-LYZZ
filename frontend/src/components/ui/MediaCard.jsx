import AppCard from './AppCard';

export default function MediaCard({ eyebrow, title, description, meta, media, pill, className = '', children, ...rest }) {
  return (
    <AppCard className={className} interactive {...rest}>
      <div className="ui-media-card">
        <div className="ui-card__row">
          <div style={{ minWidth: 0, flex: 1 }}>
            {eyebrow ? <span className="ui-card__eyebrow">{eyebrow}</span> : null}
            {title ? <h3 className="ui-card__title">{title}</h3> : null}
            {description ? <p className="ui-card__description">{description}</p> : null}
            {meta ? <span className="ui-card__meta">{meta}</span> : null}
          </div>
          {media ? <div className="ui-media-card__media">{media}</div> : null}
        </div>
        {pill ? <span className="ui-card__pill">{pill}</span> : null}
        {children}
      </div>
    </AppCard>
  );
}
