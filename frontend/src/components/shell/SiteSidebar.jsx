import ShellNavItem from './ShellNavItem';

const DEFAULT_ITEMS = [
  { label: '广场', accent: 'var(--accent-square)' },
  { label: '树洞', accent: 'var(--accent-treehole)' },
  { label: '食堂', accent: 'var(--accent-canteen)' },
  { label: '我的', accent: 'var(--color-brand-primary)' },
];

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteSidebar({ children = null, className = '' }) {
  return (
    <aside className={joinClassNames('site-web-shell__sidebar', className)}>
      <div className="site-web-shell__panel site-web-shell__panel--sidebar">
        {children || (
          <>
            <div className="site-web-shell__panel-head">
              <p className="site-web-shell__panel-eyebrow">Primary Navigation</p>
              <h2 className="site-web-shell__panel-title">主站导航</h2>
            </div>
            <nav className="site-web-shell__nav" aria-label="Site sections">
              {DEFAULT_ITEMS.map((item, index) => (
                <ShellNavItem
                  key={item.label}
                  label={item.label}
                  accent={item.accent}
                  active={index === 0}
                />
              ))}
            </nav>
          </>
        )}
      </div>
    </aside>
  );
}
