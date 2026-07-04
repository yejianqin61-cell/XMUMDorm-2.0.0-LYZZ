import './Button.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

function isButtonElement(Component) {
  return Component === 'button';
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  block = false,
  ...rest
}) {
  const mergedDisabled = disabled || loading;
  const mergedType = isButtonElement(Component) ? (type ?? 'button') : undefined;

  return (
    <Component
      type={mergedType}
      className={joinClassNames(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        block && 'ui-button--block',
        className
      )}
      disabled={isButtonElement(Component) ? mergedDisabled : undefined}
      aria-disabled={!isButtonElement(Component) && mergedDisabled ? 'true' : undefined}
      {...rest}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : iconLeft}
      <span>{children}</span>
      {!loading ? iconRight : null}
    </Component>
  );
}
