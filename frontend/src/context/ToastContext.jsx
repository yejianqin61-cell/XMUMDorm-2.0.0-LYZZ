import { useState, useCallback, useEffect, useRef } from 'react';
import ToastStack from '../components/ui/Toast';

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
  info(message) {
    toastRef.current?.('info', message);
  },
};

function ToastContainer({ toasts, onExited }) {
  const timerRef = useRef(new Map());

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timerRef.current.has(toast.id)) return;
      const timer = setTimeout(() => {
        onExited?.(toast.id);
      }, DURATION);
      timerRef.current.set(toast.id, timer);
    });
  }, [toasts, onExited]);

  useEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));
    Array.from(timerRef.current.keys()).forEach((id) => {
      if (activeIds.has(id)) return;
      clearTimeout(timerRef.current.get(id));
      timerRef.current.delete(id);
    });
  }, [toasts]);

  useEffect(() => () => {
    timerRef.current.forEach((timer) => clearTimeout(timer));
    timerRef.current.clear();
  }, []);

  return <ToastStack toasts={toasts} onDismiss={onExited} />;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((type, message) => {
    setToasts((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: String(message),
        type,
      },
    ].slice(-3));
  }, []);

  const hide = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
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
      <ToastContainer toasts={toasts} onExited={hide} />
    </>
  );
}
