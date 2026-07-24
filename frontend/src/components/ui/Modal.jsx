import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../../context/LanguageContext';
import './Modal.css';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  size = 'sm',
  children,
  footer = null,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) {
  const { isZh } = useLanguage();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previousFocusRef.current = document.activeElement;

    // Focus the dialog on open
    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose?.();
        return;
      }
      // Focus trap: cycle Tab within modal
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(FOCUSABLE);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger element
      previousFocusRef.current?.focus();
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  return (
    <div
      className="ui-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ui-modal-title"
      ref={dialogRef}
      tabIndex={-1}
    >
      {closeOnBackdrop ? (
        <button
          type="button"
          className="ui-modal__backdrop"
          aria-label={isZh ? '关闭弹窗' : 'Close modal'}
          onClick={onClose}
        />
      ) : (
        <div className="ui-modal__backdrop" aria-hidden="true" />
      )}
      <div className={`ui-modal__dialog ui-modal__dialog--${size}`}>
        <div className="ui-modal__header">
          <div className="ui-modal__title-wrap">
            {eyebrow ? <p className="ui-modal__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 id="ui-modal-title" className="ui-modal__title">{title}</h2> : null}
            {description ? <p className="ui-modal__description">{description}</p> : null}
          </div>
          {onClose ? (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              className="ui-modal__close"
              onClick={onClose}
              aria-label={isZh ? '关闭弹窗' : 'Close modal'}
            >
              <X size={16} />
            </Button>
          ) : null}
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer ? <div className="ui-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
