function renderList(items) {
  return Array.from({ length: items }).map((_, index) => (
    <div key={index} className="ui-page-skeleton__item ui-page-skeleton__item--list" />
  ));
}

function renderCards(items) {
  return (
    <div className="ui-page-skeleton__grid">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="ui-page-skeleton__item ui-page-skeleton__item--card" />
      ))}
    </div>
  );
}

function renderDashboard(metrics, items, hero) {
  return (
    <>
      {hero ? <div className="ui-page-skeleton__item ui-page-skeleton__item--hero" /> : null}
      {metrics > 0 ? (
        <div className="ui-page-skeleton__grid">
          {Array.from({ length: metrics }).map((_, index) => (
            <div key={index} className="ui-page-skeleton__item ui-page-skeleton__item--metric" />
          ))}
        </div>
      ) : null}
      {renderList(items)}
    </>
  );
}

function renderDetail(items, hero) {
  return (
    <>
      {hero ? <div className="ui-page-skeleton__item ui-page-skeleton__item--hero" /> : null}
      <div className="ui-page-skeleton__item ui-page-skeleton__item--title" />
      <div className="ui-page-skeleton__stack">
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="ui-page-skeleton__item ui-page-skeleton__item--detail" />
        ))}
      </div>
    </>
  );
}

function renderForm() {
  return (
    <>
      <div className="ui-page-skeleton__item ui-page-skeleton__item--title" />
      <div className="ui-page-skeleton__stack ui-page-skeleton__stack--tight">
        <div className="ui-page-skeleton__item ui-page-skeleton__item--field" />
        <div className="ui-page-skeleton__item ui-page-skeleton__item--field" />
        <div className="ui-page-skeleton__item ui-page-skeleton__item--field-lg" />
      </div>
      <div className="ui-page-skeleton__actions">
        <div className="ui-page-skeleton__item ui-page-skeleton__item--button" />
        <div className="ui-page-skeleton__item ui-page-skeleton__item--button" />
      </div>
    </>
  );
}

export default function PageSkeleton({
  variant = 'list',
  hero = false,
  metrics = 0,
  items = 3,
  className = '',
}) {
  const resolvedVariant = variant === 'list' && (hero || metrics > 0) ? 'dashboard' : variant;

  return (
    <div className={`ui-page-skeleton ${className}`.trim()} aria-hidden="true">
      {resolvedVariant === 'dashboard' ? renderDashboard(metrics, items, hero) : null}
      {resolvedVariant === 'list' ? renderList(items) : null}
      {resolvedVariant === 'card' ? renderCards(items) : null}
      {resolvedVariant === 'detail' ? renderDetail(items, hero) : null}
      {resolvedVariant === 'form' ? renderForm() : null}
    </div>
  );
}
