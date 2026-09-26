import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const NeoSelect = forwardRef(function NeoSelect(
  { className = '', error = false, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-none border-2 border-black bg-input px-4 py-2',
        'shadow-[4px_4px_0_0_#122E8A]',
        'font-semibold text-foreground',
        'appearance-none cursor-pointer',
        'transition-all',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'focus:shadow-none focus:translate-y-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        error && 'border-destructive shadow-destructive/50',
        className
      )}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    >
      {children}
    </select>
  );
});

export default NeoSelect;