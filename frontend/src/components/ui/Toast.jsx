import { X } from 'lucide-react';
import Button from './Button';
import './Toast.css';

const TITLE_MAP = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
};

export function ToastView({ toast, onDismiss }) {
  const { id, type = 'info', title, message } = toast;

  return (
    <div className={`ui-toast ui-toast--${type}`} role="alert" aria-live="polite">
      <span className="ui-toast__marker" aria-hidden="true" />
      <div className="ui-toast__content">
        <p className="ui-toast__title">{title || TITLE_MAP[type] || TITLE_MAP.info}</p>
        <p className="ui-toast__message">{message}</p>
      </div>
      <Button
        type="button"
        variant="tertiary"
        size="sm"
        className="ui-toast__dismiss"
        onClick={() => onDismiss?.(id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </Button>
    </div>
  );
}

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="ui-toast-stack">
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
