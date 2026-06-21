export default function PageSkeleton({ hero = false, metrics = 0, items = 3, className = '' }) {
  return (
    <div className={`ui-page-skeleton ${className}`.trim()} aria-hidden="true">
      {hero ? <div className="ui-page-skeleton__item ui-page-skeleton__item--hero" /> : null}
      {metrics > 0 ? (
        <div className="ui-page-skeleton__grid">
          {Array.from({ length: metrics }).map((_, index) => (
            <div key={index} className="ui-page-skeleton__item ui-page-skeleton__item--metric" />
          ))}
        </div>
      ) : null}
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="ui-page-skeleton__item ui-page-skeleton__item--list" />
      ))}
    </div>
  );
}
