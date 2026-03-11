import { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext({
  lang: 'zh',
  setLang: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('zh');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('dorm-lang');
      if (stored === 'zh' || stored === 'en') {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (next) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('dorm-lang', next);
      } catch {
        // ignore
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

