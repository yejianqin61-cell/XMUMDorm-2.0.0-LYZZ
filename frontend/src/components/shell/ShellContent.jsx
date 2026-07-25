function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ShellContent({ children = null, className = '' }) {
  return (
    <main className={joinClassNames('site-web-shell__content', className)}>
      <div className="site-web-shell__content-inner">
        <div className="site-web-shell__viewport">
          <div className="site-web-shell__viewport-body">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
