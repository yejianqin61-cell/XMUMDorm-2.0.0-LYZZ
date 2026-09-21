import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const NeoInput = forwardRef(function NeoInput(
  { className = '', error = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-none border-2 border-black bg-input px-4 py-2',
        'shadow-[4px_4px_0_0_#000]',
        'font-semibold text-foreground placeholder:text-muted-foreground',
        'transition-all',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'focus:shadow-none focus:translate-y-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        error && 'border-destructive shadow-destructive/50',
        className
      )}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
});

export default NeoInput;