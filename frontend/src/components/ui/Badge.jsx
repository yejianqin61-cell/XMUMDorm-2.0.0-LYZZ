import './Badge.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'xs',
  className = '',
  children,
  ...rest
}) {
  return (
    <span
      className={joinClassNames(
        'ui-badge',
        `ui-badge--${size}`,
        `ui-badge--${variant}`,
        `ui-badge--${tone}`,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
