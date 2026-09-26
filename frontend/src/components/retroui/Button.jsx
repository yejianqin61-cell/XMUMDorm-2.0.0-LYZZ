import { cn } from '../../lib/utils';
import { cva } from 'class-variance-authority';
import React from 'react';

export const buttonVariants = cva(
  'font-semibold transition-all cursor-pointer rounded-none duration-200 font-medium flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary border-2 border-black',
  {
    variants: {
      variant: {
        default:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-primary text-primary-foreground transition hover:translate-y-1 active:translate-y-2 active:translate-x-1 hover:bg-primary-hover',
        secondary:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-secondary text-secondary-foreground transition hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        outline:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-transparent transition hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        destructive:
          'shadow-[4px_4px_0_0_#122E8A] hover:shadow-none bg-destructive text-destructive-foreground transition hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        ghost:
          'border-transparent bg-transparent hover:bg-muted shadow-none',
        link: 'border-transparent bg-transparent hover:underline shadow-none',
      },
      size: {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-1.5 text-base',
        lg: 'px-6 py-2 text-lg',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export default function NeoButton({
  children,
  size,
  variant,
  className = '',
  type = 'button',
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  ...props
}) {
  const mergedDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={mergedDisabled}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}