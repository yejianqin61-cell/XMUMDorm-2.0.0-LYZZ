import { useState, useCallback, useEffect, useRef } from 'react';
import './Toast.css';

const DURATION = 2500;

/** 供全局调用的 Toast 引用，由 Provider 在 mount 时注入 */
const toastRef = { current: null };

/**
 * 统一 Toast 提示
 * 使用方式：Toast.success("发布成功") / Toast.error("网络错误")
 * 在任意组件或异步回调中均可直接调用，无需 hook
 */
export const Toast = {
  success(message) {
    toastRef.current?.('success', message);
  },
  error(message) {
    toastRef.current?.('error', message);
  },
};

function ToastContainer({ toast, onExited }) {
  const { visible, message, type } = toast;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible || !message) return;
    timerRef.current = setTimeout(() => {
      onExited?.();
    }, DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message, onExited]);

  if (!visible || !message) return null;

  return (
    <div className="toast-wrap" role="alert" aria-live="polite">
      <div className={`toast-toast toast-toast-${type}`}>
        {message}
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const show = useCallback((type, message) => {
    setToast({ visible: true, message: String(message), type });
  }, []);

  const hide = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  useEffect(() => {
    toastRef.current = show;
    return () => {
      toastRef.current = null;
    };
  }, [show]);

  return (
    <>
      {children}
      <ToastContainer toast={toast} onExited={hide} />
    </>
  );
}
