import { useState, createContext, useContext } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

const AccordionContext = createContext(null);

function NeoAccordion({ type = 'single', value, defaultValue, onValueChange, className = '', children, ...props }) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const handleToggle = (val) => {
    const next = activeValue === val ? '' : val;
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <AccordionContext.Provider value={{ activeValue, onToggle: handleToggle }}>
      <div className={cn('flex flex-col gap-2', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ value, className = '', children, ...props }) {
  const { activeValue } = useContext(AccordionContext);
  const isOpen = activeValue === value;

  return (
    <div
      className={cn(
        'border-2 border-black bg-background text-foreground shadow-[4px_4px_0_0_#000] transition-all',
        isOpen ? 'shadow-none' : 'hover:shadow-[2px_2px_0_0_#000]',
        className
      )}
      data-state={isOpen ? 'open' : 'closed'}
      {...props}
    >
      {children}
    </div>
  );
}

function AccordionHeader({ value, className = '', children, ...props }) {
  const { activeValue, onToggle } = useContext(AccordionContext);
  const isOpen = activeValue === value;

  return (
    <button
      type="button"
      className={cn(
        'flex flex-1 items-center justify-between px-4 py-3 w-full text-left font-semibold cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className
      )}
      onClick={() => onToggle(value)}
      aria-expanded={isOpen}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  );
}

function AccordionContent({ value, className = '', children, ...props }) {
  const { activeValue } = useContext(AccordionContext);
  const isOpen = activeValue === value;

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200',
        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      )}
      role="region"
      {...props}
    >
      <div className={cn('px-4 pt-0 pb-4', className)}>{children}</div>
    </div>
  );
}

const NeoAccordionCompound = Object.assign(NeoAccordion, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Content: AccordionContent,
});

export { NeoAccordionCompound as NeoAccordion };