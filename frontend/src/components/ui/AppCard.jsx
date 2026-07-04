import Card from './Card';

/**
 * AppCard — thin tone→variant adapter over Card.
 * @deprecated Use `<Card variant="muted">` directly. AppCard will be removed in a future cleanup.
 */
export default function AppCard({
  as: Component = 'div',
  className = '',
  bodyClassName = '',
  tone = 'default',
  strong = false,
  muted = false,
  padding = 'md',
  interactive = false,
  children,
  ...rest
}) {
  const variant = strong ? 'strong' : muted ? 'muted' : tone;

  return (
    <Card
      as={Component}
      className={className}
      bodyClassName={bodyClassName}
      variant={variant}
      padding={padding}
      interactive={interactive}
      {...rest}
    >
      {children}
    </Card>
  );
}
