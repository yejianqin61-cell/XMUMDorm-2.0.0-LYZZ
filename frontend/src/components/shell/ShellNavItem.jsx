import { Link } from 'react-router-dom';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function ShellNavItem({
  label,
  Icon,
  active = false,
  className = '',
  to = '',
}) {
  return (
    <Link
      to={to || '#'}
      className={joinClassNames(
        'site-web-shell__nav-item',
        active && 'site-web-shell__nav-item--active',
        className,
      )}
      aria-current={active ? 'page' : undefined}
    >
      {Icon ? <Icon className="site-web-shell__nav-icon" size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" /> : null}
      <span className="site-web-shell__nav-label">{label}</span>
    </Link>
  );
}
