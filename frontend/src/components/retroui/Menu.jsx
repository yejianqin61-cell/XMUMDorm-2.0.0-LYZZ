import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

const MenuContext = createContext({ open: false, setOpen: () => {} });

function NeoMenu({ children, ...props }) {
  const [open, setOpen] = useState(false);
  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" {...props}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

function MenuTrigger({ className = '', children, ...props }) {
  const { open, setOpen } = useContext(MenuContext);
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center font-semibold border-2 border-black bg-background px-4 py-2 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className
      )}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-haspopup="menu"
      {...props}
    >
      {children}
    </button>
  );
}

function MenuContent({ className = '', children, align = 'start', ...props }) {
  const { open, setOpen } = useContext(MenuContext);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, setOpen]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'absolute z-50 min-w-[180px] bg-background border-2 border-black shadow-[4px_4px_0_0_#000] py-1 mt-1',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function MenuItem({ className = '', children, onClick, ...props }) {
  const { setOpen } = useContext(MenuContext);

  const handleClick = (e) => {
    onClick?.(e);
    setOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'w-full text-left px-4 py-2 text-sm font-medium cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

function MenuSeparator({ className = '', ...props }) {
  return (
    <div
      role="separator"
      className={cn('mx-2 my-1 border-t-2 border-black', className)}
      {...props}
    />
  );
}

const NeoMenuCompound = Object.assign(NeoMenu, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
});

export { NeoMenuCompound as NeoMenu };