import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

const TabContext = createContext(null);

function NeoTab({ defaultValue, value, onValueChange, className = '', children, ...props }) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const handleChange = useCallback(
    (val) => {
      if (!isControlled) setInternalValue(val);
      onValueChange?.(val);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabContext.Provider value={{ activeValue, onChange: handleChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabContext.Provider>
  );
}

function TabList({ className = '', children, ...props }) {
  return (
    <div
      role="tablist"
      className={cn('flex flex-row space-x-2 w-full', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function TabTrigger({ value, className = '', children, disabled = false, ...props }) {
  const { activeValue, onChange } = useContext(TabContext);
  const isActive = activeValue === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      disabled={disabled}
      className={cn(
        'px-4 flex items-center py-1 border-2 border-transparent transition-all',
        isActive
          ? 'border-border bg-primary text-primary-foreground font-semibold'
          : 'hover:bg-muted hover:text-muted-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={() => onChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

function TabContent({ value, className = '', children, ...props }) {
  const { activeValue } = useContext(TabContext);
  if (activeValue !== value) return null;

  return (
    <div role="tabpanel" className={cn('mt-2 w-full', className)} {...props}>
      {children}
    </div>
  );
}

const NeoTabCompound = Object.assign(NeoTab, {
  List: TabList,
  Trigger: TabTrigger,
  Content: TabContent,
});

export default NeoTabCompound;