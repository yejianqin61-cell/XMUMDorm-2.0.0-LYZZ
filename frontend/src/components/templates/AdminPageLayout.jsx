import './AdminPageLayout.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function AdminPageLayout({
  header = null,
  toolbar = null,
  content = null,
  aside = null,
  footer = null,
  mode = 'default',
  className = '',
  contentClassName = '',
  asideClassName = '',
  asideSticky = false,
}) {
  const hasAside = Boolean(aside);

  return (
    <div className={joinClassNames('admin-page-layout', `admin-page-layout--${mode}`, className)}>
      {header ? <div className="admin-page-layout__header">{header}</div> : null}
      {toolbar ? <div className="admin-page-layout__toolbar">{toolbar}</div> : null}
      <div
        className={joinClassNames(
          'admin-page-layout__content-grid',
          hasAside && 'admin-page-layout__content-grid--with-aside',
          contentClassName
        )}
      >
        <main className="admin-page-layout__content">{content}</main>
        {aside ? (
          <aside
            className={joinClassNames(
              'admin-page-layout__aside',
              asideSticky && 'admin-page-layout__aside--sticky',
              asideClassName
            )}
          >
            {aside}
          </aside>
        ) : null}
      </div>
      {footer ? <div className="admin-page-layout__footer">{footer}</div> : null}
    </div>
  );
}
