import './ListPageLayout.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ListPageLayout({
  header = null,
  filterBar = null,
  list = null,
  aside = null,
  footer = null,
  className = '',
  contentClassName = '',
  mainClassName = '',
  asideClassName = '',
  asideSticky = false,
}) {
  const hasTwoColumns = Boolean(aside);

  return (
    <div className={joinClassNames('list-page-layout', className)}>
      {header ? <div className="list-page-layout__header">{header}</div> : null}
      {filterBar ? <div className="list-page-layout__filter">{filterBar}</div> : null}
      <div
        className={joinClassNames(
          'list-page-layout__content',
          hasTwoColumns && 'list-page-layout__content--with-aside',
          contentClassName
        )}
      >
        <main className={joinClassNames('list-page-layout__main', mainClassName)}>{list}</main>
        {aside ? (
          <aside
            className={joinClassNames(
              'list-page-layout__aside',
              asideSticky && 'list-page-layout__aside--sticky',
              asideClassName
            )}
          >
            {aside}
          </aside>
        ) : null}
      </div>
      {footer ? <div className="list-page-layout__footer">{footer}</div> : null}
    </div>
  );
}
