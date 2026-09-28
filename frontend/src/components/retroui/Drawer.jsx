import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

function NeoDrawer({ open, onClose, children, ...props }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" {...props}>
      <div
        className="fixed inset-0 z-50 bg-neutral-900/50"
        onClick={onClose}
      />
      <DrawerContent onClose={onClose}>{children}</DrawerContent>
    </div>,
    document.body
  );
}

function DrawerContent({ className = '', children, side = 'right', onClose, ...props }) {
  return (
    <div
      className={cn(
        'fixed z-50 bg-background border-2 border-black shadow-[4px_4px_0_0_var(--color-black)] flex flex-col',
        side === 'right' && 'inset-y-0 right-0 w-full max-w-md border-l-2',
        side === 'left' && 'inset-y-0 left-0 w-full max-w-md border-r-2',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[80vh] border-t-2 rounded-t-lg',
        side === 'top' && 'inset-x-0 top-0 max-h-[80vh] border-b-2 rounded-b-lg',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between p-4 border-b-2 border-black">
        <button
          type="button"
          className="ml-auto border-2 border-black p-1 hover:bg-muted transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}

function DrawerHeader({ className = '', children, ...props }) {
  return (
    <div className={cn('flex flex-col gap-1 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

function DrawerTitle({ className = '', children, ...props }) {
  return (
    <h2 className={cn('text-xl font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}

function DrawerDescription({ className = '', children, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

function DrawerFooter({ className = '', children, ...props }) {
  return (
    <div className={cn('flex flex-col gap-2 border-t-2 border-black p-4', className)} {...props}>
      {children}
    </div>
  );
}

const NeoDrawerCompound = Object.assign(NeoDrawer, {
  Content: DrawerContent,
  Header: DrawerHeader,
  Title: DrawerTitle,
  Description: DrawerDescription,
  Footer: DrawerFooter,
});

export { NeoDrawerCompound as NeoDrawer };