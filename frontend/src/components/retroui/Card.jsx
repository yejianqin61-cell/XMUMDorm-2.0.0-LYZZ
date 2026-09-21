import { cn } from '../../lib/utils';

export default function NeoCard({
  className = '',
  children,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-block border-2 border-black bg-card shadow-[4px_4px_0_0_#000] hover:shadow-none transition-all',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}