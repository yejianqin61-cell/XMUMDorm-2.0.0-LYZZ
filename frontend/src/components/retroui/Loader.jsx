import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const loaderVariants = cva('flex gap-1', {
  variants: {
    variant: {
      default: '[&>div]:bg-primary [&>div]:border-border',
      secondary: '[&>div]:bg-secondary [&>div]:border-border',
      outline: '[&>div]:bg-transparent [&>div]:border-2 [&>div]:border-border',
    },
    size: {
      sm: '[&>div]:w-2 [&>div]:h-2',
      md: '[&>div]:w-3 [&>div]:h-3',
      lg: '[&>div]:w-4 [&>div]:h-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const NeoLoader = React.forwardRef(function NeoLoader(
  {
    className = '',
    variant,
    size,
    count = 3,
    duration = 0.5,
    delayStep = 100,
    ...props
  },
  ref
) {
  return (
    <div
      className={cn(loaderVariants({ variant, size }), className)}
      ref={ref}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-2 border-black animate-bounce"
          style={{
            animationDuration: `${duration}s`,
            animationIterationCount: 'infinite',
            animationDelay: `${i * delayStep}ms`,
          }}
        />
      ))}
    </div>
  );
});

export { NeoLoader };