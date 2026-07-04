import './Tag.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

function isButtonElement(Component) {
  return Component === 'button';
}

export default function Tag({
  as: Component = 'span',
  tone = 'default',
  variant = 'soft',
  size = 'sm',
  active = false,
  interactive = false,
  className = '',
  children,
  type,
  ...rest
}) {
  const resolvedInteractive = interactive || Component === 'button' || Component === 'a';

  return (
    <Component
      type={isButtonElement(Component) ? (type ?? 'button') : undefined}
      className={joinClassNames(
        'ui-tag',
        `ui-tag--${size}`,
        `ui-tag--${variant}`,
        `ui-tag--${tone}`,
        resolvedInteractive && 'ui-tag--interactive',
        active && 'ui-tag--active',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
