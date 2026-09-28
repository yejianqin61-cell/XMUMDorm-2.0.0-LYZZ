import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

function NeoPopover({ children, ...props }) {
  return <div className="relative inline-block" {...props}>{children}</div>;
}

function PopoverTrigger({ className = '', children, asChild, ...props }) {
  return (
    <span className={cn('inline-flex', className)} {...props}>
      {children}
    </span>
  );
}

function PopoverContent({
  className = '',
  children,
  triggerRef,
  open,
  onClose,
  align = 'center',
  side = 'bottom',
  sideOffset = 8,
  ...props
}) {
  const contentRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef?.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      let top = triggerRect.bottom + sideOffset;
      let left = triggerRect.left;

      if (align === 'center') {
        left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
      } else if (align === 'end') {
        left = triggerRect.right - contentRect.width;
      }

      if (side === 'top') {
        top = triggerRect.top - contentRect.height - sideOffset;
      }

      setPos({ top: top + window.scrollY, left: left + window.scrollX });
    }
  }, [open, triggerRef, align, side, sideOffset]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose?.();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const content = (
    <div
      ref={contentRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left }}
      className={cn(
        'z-50 w-72 border-2 border-black bg-background p-4 shadow-[4px_4px_0_0_#122E8A]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
}

function PopoverHeader({ className = '', children, ...props }) {
  return (
    <div className={cn('flex flex-col gap-1 text-sm mb-2', className)} {...props}>
      {children}
    </div>
  );
}

function PopoverTitle({ className = '', children, ...props }) {
  return (
    <h3 className={cn('text-base font-semibold', className)} {...props}>
      {children}
    </h3>
  );
}

function PopoverDescription({ className = '', children, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

const NeoPopoverCompound = Object.assign(NeoPopover, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Header: PopoverHeader,
  Title: PopoverTitle,
  Description: PopoverDescription,
});

export { NeoPopoverCompound as NeoPopover };