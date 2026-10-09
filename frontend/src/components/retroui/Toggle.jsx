import { toggleVariants } from './toggleVariants';
import {  } from 'class-variance-authority';
import { cn } from '../../lib/utils';



function NeoToggle({
  className = '',
  variant = 'default',
  size = 'default',
  pressed = false,
  onPressedChange,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      data-slot="toggle"
      aria-pressed={pressed}
      className={cn(toggleVariants({ variant, size, className }))}
      onClick={() => onPressedChange?.(!pressed)}
      {...props}
    >
      {children}
    </button>
  );
}

export { NeoToggle };