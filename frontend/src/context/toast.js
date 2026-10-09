
export const toastRef = { current: null };
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
