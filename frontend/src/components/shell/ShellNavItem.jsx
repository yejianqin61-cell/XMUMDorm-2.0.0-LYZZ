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
  href = '',
}) {
  const classNames = joinClassNames(
    'site-web-shell__nav-item',
    active && 'site-web-shell__nav-item--active',
    className,
  );
  const contents = (
    <>
      {Icon ? <Icon className="site-web-shell__nav-icon" size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" /> : null}
      <span className="site-web-shell__nav-label">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classNames}
        target="_blank"
        rel="noopener noreferrer"
      >
        {contents}
      </a>
    );
  }

  return (
    <Link
      to={to || '#'}
      className={classNames}
      aria-current={active ? 'page' : undefined}
    >
      {contents}
    </Link>
  );
}
