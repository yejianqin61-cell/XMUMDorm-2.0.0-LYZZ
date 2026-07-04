function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Card({
  as: Component = 'div',
  className = '',
  bodyClassName = '',
  variant = 'default',
  padding = 'md',
  interactive = false,
  children,
  ...rest
}) {
  return (
    <Component
      className={joinClassNames(
        'ui-card',
        variant === 'strong' && 'ui-card--strong',
        variant === 'muted' && 'ui-card--muted',
        interactive && 'ui-card--interactive',
        className
      )}
      {...rest}
    >
      <div
        className={joinClassNames(
          'ui-card__body',
          padding === 'sm' && 'ui-card__body--sm',
          padding === 'lg' && 'ui-card__body--lg',
          bodyClassName
        )}
      >
        {children}
      </div>
    </Component>
  );
}
