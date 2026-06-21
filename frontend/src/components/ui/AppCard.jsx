function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function AppCard({
  as: Component = 'div',
  className = '',
  bodyClassName = '',
  tone = 'default',
  padding = 'md',
  interactive = false,
  children,
  ...rest
}) {
  return (
    <Component
      className={joinClassNames(
        'ui-card',
        tone === 'strong' && 'ui-card--strong',
        tone === 'muted' && 'ui-card--muted',
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
