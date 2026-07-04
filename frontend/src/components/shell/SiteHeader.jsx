function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteHeader({ children = null, className = '' }) {
  return (
    <header className={joinClassNames('site-web-shell__header', className)}>
      <div className="site-web-shell__header-inner">
        {children || (
          <>
            <div className="site-web-shell__brand">
              <span className="site-web-shell__brand-mark" aria-hidden="true">XM</span>
              <div className="site-web-shell__brand-copy">
                <strong>XMUMDorm</strong>
                <span>Desktop Web Shell</span>
              </div>
            </div>
            <div className="site-web-shell__header-meta">
              <span className="site-web-shell__header-chip">Search</span>
              <span className="site-web-shell__header-chip">Messages</span>
              <span className="site-web-shell__header-chip">Profile</span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
