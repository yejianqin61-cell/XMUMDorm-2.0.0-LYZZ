import { Link } from 'react-router-dom';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ShellNavItem({
  label,
  accent,
  active = false,
  className = '',
  to = '',
  caption = '',
}) {
  return (
    <Link
      to={to || '#'}
      className={joinClassNames(
        'site-web-shell__nav-item',
        active && 'site-web-shell__nav-item--active',
        className,
      )}
      style={{ '--shell-nav-accent': accent || 'var(--color-brand-primary)' }}
    >
      <span className="site-web-shell__nav-swatch" aria-hidden="true" />
      <span className="site-web-shell__nav-copy">
        <span className="site-web-shell__nav-label">{label}</span>
        {caption ? <span className="site-web-shell__nav-caption">{caption}</span> : null}
      </span>
    </Link>
  );
}
