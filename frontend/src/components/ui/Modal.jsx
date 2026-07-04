import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import './Modal.css';

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
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  return (
    <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="Close modal"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={`ui-modal__dialog ui-modal__dialog--${size}`}>
        <div className="ui-modal__header">
          <div className="ui-modal__title-wrap">
            {eyebrow ? <p className="ui-modal__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 id="ui-modal-title" className="ui-modal__title">{title}</h2> : null}
            {description ? <p className="ui-modal__description">{description}</p> : null}
          </div>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            className="ui-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer ? <div className="ui-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
