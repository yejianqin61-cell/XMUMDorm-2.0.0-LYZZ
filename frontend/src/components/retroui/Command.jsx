import { useState, useEffect, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Search, X } from 'lucide-react';

const NeoCommand = forwardRef(function NeoCommand(
  { className = '', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full flex-col overflow-hidden border-2 border-black bg-background shadow-[4px_4px_0_0_#000]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

function CommandInput({ className = '', value, onValueChange, placeholder = 'Search...', ...props }) {
  return (
    <div className="flex items-center border-b-2 border-black px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        className={cn(
          'flex h-11 w-full bg-transparent py-3 text-sm font-medium outline-none placeholder:text-muted-foreground',
          className
        )}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        {...props}
      />
      {value && (
        <button
          type="button"
          className="ml-2 shrink-0 opacity-50 hover:opacity-100"
          onClick={() => onValueChange?.('')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function CommandList({ className = '', children, ...props }) {
  return (
    <div
      className={cn('max-h-[300px] overflow-y-auto p-1', className)}
      role="listbox"
      {...props}
    >
      {children}
    </div>
  );
}

function CommandEmpty({ className = '', children = 'No results found.', ...props }) {
  return (
    <div className={cn('py-6 text-center text-sm text-muted-foreground', className)} {...props}>
      {children}
    </div>
  );
}

function CommandGroup({ className = '', heading, children, ...props }) {
  return (
    <div className={cn('overflow-hidden py-1', className)} {...props}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

function CommandItem({
  className = '',
  children,
  onSelect,
  value,
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      role="option"
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-none px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-primary hover:text-primary-foreground data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        className
      )}
      onClick={() => onSelect?.(value)}
      {...props}
    >
      {children}
    </button>
  );
}

function CommandSeparator({ className = '', ...props }) {
  return (
    <div
      className={cn('mx-1 my-1 border-t-2 border-black', className)}
      role="separator"
      {...props}
    />
  );
}

const NeoCommandCompound = Object.assign(NeoCommand, {
  Input: CommandInput,
  List: CommandList,
  Empty: CommandEmpty,
  Group: CommandGroup,
  Item: CommandItem,
  Separator: CommandSeparator,
});

export { NeoCommandCompound as NeoCommand };