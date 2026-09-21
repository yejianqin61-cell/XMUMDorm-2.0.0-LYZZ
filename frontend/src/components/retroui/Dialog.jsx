import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const dialogVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-black bg-card shadow-[4px_4px_0_0_#000] p-6',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        screen: 'max-w-[95vw]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export default function NeoDialog({
  open,
  onOpenChange,
  onClose,
  children,
  title,
  description,
  size = 'md',
  className = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (open) {
      setMounted(true);
      previousFocusRef.current = document.activeElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE);
        firstFocusable?.focus();
      });

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && closeOnEscape) {
          handleClose();
          return;
        }
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(FOCUSABLE);
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      setMounted(false);
      previousFocusRef.current?.focus();
    }
    return undefined;
  }, [open]);

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-[10vh]"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          dialogVariants({ size }),
          mounted && 'animate-in fade-in-0 zoom-in-95',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-muted transition-colors border-2 border-transparent hover:border-black ml-4 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body,
  );
}