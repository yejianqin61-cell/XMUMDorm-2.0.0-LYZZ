function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteAside({ children = null, className = '' }) {
  return (
    <aside className={joinClassNames('site-web-shell__aside', className)}>
      <div className="site-web-shell__panel site-web-shell__panel--aside">
        {children || (
          <>
            <div className="site-web-shell__panel-head">
              <p className="site-web-shell__panel-eyebrow">Secondary Aside</p>
              <h2 className="site-web-shell__panel-title">辅助信息区</h2>
            </div>
            <div className="site-web-shell__aside-stack">
              <div className="site-web-shell__placeholder-card">
                <strong>Recommended</strong>
                <span>为后续推荐、帮助和轻量快捷操作预留占位。</span>
              </div>
              <div className="site-web-shell__placeholder-card">
                <strong>Quick Actions</strong>
                <span>当前任务仅搭结构，不承载真实业务逻辑。</span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
