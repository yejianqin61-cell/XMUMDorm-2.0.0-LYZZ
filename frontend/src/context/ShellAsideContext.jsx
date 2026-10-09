import { ShellAsideContext } from './ShellAsideContextState';
import {   useState } from 'react';



export function ShellAsideProvider({ children }) {
  const [asideContent, setAsideContent] = useState(null);
  return (
    <ShellAsideContext.Provider value={{ asideContent, setAsideContent }}>
      {children}
    </ShellAsideContext.Provider>
  );
}


