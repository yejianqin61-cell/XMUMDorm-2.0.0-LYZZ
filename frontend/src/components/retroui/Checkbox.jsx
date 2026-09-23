import { forwardRef, useId } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

const checkboxVariants = cva(
  'peer relative shrink-0 appearance-none border-2 border-black cursor-pointer transition-all checked:bg-primary checked:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const NeoCheckbox = forwardRef(function NeoCheckbox(
  { className = '', size = 'md', id: idProp, checked, children, label, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <div className="flex items-start gap-2">
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          className={cn(checkboxVariants({ size }), className)}
          {...props}
        />
        <Check
          className={cn(
            'absolute inset-0 pointer-events-none text-primary-foreground transition-opacity',
            checked ? 'opacity-100' : 'opacity-0',
            size === 'sm' && 'h-4 w-4 p-0.5',
            size === 'md' && 'h-5 w-5 p-0.5',
            size === 'lg' && 'h-6 w-6 p-0.5'
          )}
          strokeWidth={3}
        />
      </div>
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer select-none">
          {label}
        </label>
      )}
      {children && !label && (
        <label htmlFor={id} className="cursor-pointer">
          {children}
        </label>
      )}
    </div>
  );
});

export default NeoCheckbox;