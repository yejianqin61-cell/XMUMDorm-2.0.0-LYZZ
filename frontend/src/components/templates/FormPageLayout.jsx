import './FormPageLayout.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function FormPageLayout({
  header = null,
  notice = null,
  sections = null,
  actions = null,
  aside = null,
  className = '',
  asideSticky = false,
}) {
  return (
    <div className={joinClassNames('form-page-layout', className)}>
      {header ? <div className="form-page-layout__header">{header}</div> : null}
      <div className="form-page-layout__content-grid">
        <main className="form-page-layout__main">
          {notice ? <div className="form-page-layout__notice">{notice}</div> : null}
          {sections ? <div className="form-page-layout__sections">{sections}</div> : null}
        </main>
        {aside ? (
          <aside
            className={joinClassNames(
              'form-page-layout__aside',
              asideSticky && 'form-page-layout__aside--sticky'
            )}
          >
            {aside}
          </aside>
        ) : null}
      </div>
      {actions ? <div className="form-page-layout__actions">{actions}</div> : null}
    </div>
  );
}
