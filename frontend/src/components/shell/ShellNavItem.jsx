function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ShellNavItem({ label, accent, active = false, className = '' }) {
  return (
    <div
      className={joinClassNames('site-web-shell__nav-item', active && 'site-web-shell__nav-item--active', className)}
      style={{ '--shell-nav-accent': accent || 'var(--color-brand-primary)' }}
    >
      <span className="site-web-shell__nav-swatch" aria-hidden="true" />
      <span className="site-web-shell__nav-label">{label}</span>
    </div>
  );
}
