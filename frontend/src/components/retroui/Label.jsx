import { cn } from '../../lib/utils';

export default function NeoLabel({ className = '', children, ...props }) {
  return (
    <label
      className={cn(
        'font-semibold text-foreground leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}