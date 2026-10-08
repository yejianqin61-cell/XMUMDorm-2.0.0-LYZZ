import { createContext, useContext, useCallback } from 'react';
export const ExpFeedbackContext = createContext(null);
export function useExpFeedback() {
  const ctx = useContext(ExpFeedbackContext);
  const handleExpResponse = useCallback(
    (result, isZh = true) => ctx?.handleExpResponse?.(result, isZh),
    [ctx]
  );
  return { handleExpResponse };
}
