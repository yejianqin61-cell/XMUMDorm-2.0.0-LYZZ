import './DetailPageLayout.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function DetailPageLayout({
  header = null,
  hero = null,
  content = null,
  meta = null,
  comments = null,
  aside = null,
  className = '',
  mainClassName = '',
  asideClassName = '',
  asideSticky = false,
}) {
  const hasAside = Boolean(aside);

  return (
    <div className={joinClassNames('detail-page-layout', className)}>
      {header ? <div className="detail-page-layout__header">{header}</div> : null}
      <div className={joinClassNames('detail-page-layout__content-grid', hasAside && 'detail-page-layout__content-grid--with-aside')}>
        <main className={joinClassNames('detail-page-layout__main', mainClassName)}>
          {hero ? <div className="detail-page-layout__hero">{hero}</div> : null}
          {content ? <div className="detail-page-layout__content">{content}</div> : null}
          {meta ? <div className="detail-page-layout__meta">{meta}</div> : null}
          {comments ? <div className="detail-page-layout__comments">{comments}</div> : null}
        </main>
        {hasAside ? (
          <aside
            className={joinClassNames(
              'detail-page-layout__aside',
              asideSticky && 'detail-page-layout__aside--sticky',
              asideClassName
            )}
          >
            {aside}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
