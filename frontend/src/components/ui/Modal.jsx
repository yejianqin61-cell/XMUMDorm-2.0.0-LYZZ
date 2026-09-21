import NeoDialog from '../retroui/Dialog';
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
  return (
    <NeoDialog
      open={open}
      onClose={onClose}
      title={title || eyebrow}
      description={description}
      size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
    >
      <div className="space-y-4">
        {children}
        {footer && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
            {footer}
          </div>
        )}
      </div>
    </NeoDialog>
  );
}