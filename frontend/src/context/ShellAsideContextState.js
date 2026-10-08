import { createContext, useContext } from 'react';
export const ShellAsideContext = createContext({
  asideContent: null,
  setAsideContent: () => {},
});
export function useShellAside() {
  return useContext(ShellAsideContext);
}
