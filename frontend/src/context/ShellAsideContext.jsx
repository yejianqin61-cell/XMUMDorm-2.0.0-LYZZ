import { createContext, useContext, useState, useCallback } from 'react';

const ShellAsideContext = createContext({
  asideContent: null,
  setAsideContent: () => {},
});

export function ShellAsideProvider({ children }) {
  const [asideContent, setAsideContent] = useState(null);
  return (
    <ShellAsideContext.Provider value={{ asideContent, setAsideContent }}>
      {children}
    </ShellAsideContext.Provider>
  );
}

export function useShellAside() {
  return useContext(ShellAsideContext);
}
