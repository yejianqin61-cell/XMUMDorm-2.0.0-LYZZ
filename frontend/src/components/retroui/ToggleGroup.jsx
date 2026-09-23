import { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';
import { toggleVariants } from './Toggle';

const ToggleGroupContext = createContext({
  variant: 'default',
  size: 'default',
  spacing: 1,
  value: '',
  type: 'single',
  onValueChange: () => {},
});

function NeoToggleGroup({
  className = '',
  variant = 'default',
  size = 'default',
  spacing = 1,
  value = '',
  type = 'single',
  onValueChange,
  children,
  ...props
}) {
  return (
    <ToggleGroupContext.Provider value={{ variant, size, spacing, value, type, onValueChange }}>
      <div
        data-slot="toggle-group"
        data-variant={variant}
        data-size={size}
        className={cn('flex w-fit items-center gap-1', className)}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

function ToggleGroupItem({
  className = '',
  variant,
  size,
  value: itemValue,
  children,
  ...props
}) {
  const context = useContext(ToggleGroupContext);
  const resolvedVariant = variant || context.variant;
  const resolvedSize = size || context.size;
  const isPressed = context.type === 'single'
    ? context.value === itemValue
    : false;

  const handleClick = () => {
    if (context.type === 'single') {
      context.onValueChange(isPressed ? '' : itemValue);
    }
  };

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      aria-pressed={isPressed}
      className={cn(toggleVariants({ variant: resolvedVariant, size: resolvedSize }), className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

const NeoToggleGroupCompound = Object.assign(NeoToggleGroup, {
  Item: ToggleGroupItem,
});

export { NeoToggleGroupCompound as NeoToggleGroup };