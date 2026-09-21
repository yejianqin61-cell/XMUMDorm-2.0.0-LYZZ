import NeoCard from '../retroui/Card';

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
  const padMap = { sm: 'p-3', md: 'p-4', lg: 'p-6' };
  const pad = padMap[padding] || 'p-4';

  return (
    <Component
      className={`ui-card ${interactive ? 'cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      <NeoCard className={`w-full ${pad} ${bodyClassName}`}>
        {children}
      </NeoCard>
    </Component>
  );
}