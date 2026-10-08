import { buttonVariants } from './buttonVariants';
import { cn } from '../../lib/utils';
import {  } from 'class-variance-authority';
import React from 'react';



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