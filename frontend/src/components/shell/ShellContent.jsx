function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ShellContent({ children = null, className = '' }) {
  return (
    <main className={joinClassNames('site-web-shell__content', className)}>
      <div className="site-web-shell__content-inner">
        {children || (
          <div className="site-web-shell__panel site-web-shell__panel--content">
            <div className="site-web-shell__panel-head">
              <p className="site-web-shell__panel-eyebrow">Main Viewport</p>
              <h1 className="site-web-shell__content-title">主内容容器占位</h1>
            </div>
            <p className="site-web-shell__content-description">
              后续列表页、详情页、表单页和工作台页都会落在这个主内容区中。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
