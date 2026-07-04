import './DashboardPageLayout.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function DashboardPageLayout({
  summary = null,
  stats = null,
  quickActions = null,
  main = null,
  secondary = null,
  footer = null,
  className = '',
  contentClassName = '',
}) {
  const hasSecondary = Boolean(secondary);

  return (
    <div className={joinClassNames('dashboard-page-layout', className)}>
      {summary ? <div className="dashboard-page-layout__summary">{summary}</div> : null}
      {stats ? <div className="dashboard-page-layout__stats">{stats}</div> : null}
      {quickActions ? <div className="dashboard-page-layout__quick-actions">{quickActions}</div> : null}
      <div
        className={joinClassNames(
          'dashboard-page-layout__content',
          hasSecondary && 'dashboard-page-layout__content--with-secondary',
          contentClassName
        )}
      >
        <main className="dashboard-page-layout__main">{main}</main>
        {secondary ? <aside className="dashboard-page-layout__secondary">{secondary}</aside> : null}
      </div>
      {footer ? <div className="dashboard-page-layout__footer">{footer}</div> : null}
    </div>
  );
}
