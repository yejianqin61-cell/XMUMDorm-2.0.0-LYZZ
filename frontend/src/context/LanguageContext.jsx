import { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext({
  lang: 'zh',
  isZh: true,
  setLang: () => {},
});

function readInitialLanguage() {
  if (typeof window === 'undefined') return 'zh';

  try {
    return window.localStorage.getItem('dorm-lang') === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLanguage);
  const isZh = lang !== 'en';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

    try {
      window.localStorage.setItem('dorm-lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setLang = (next) => {
    setLangState(next === 'en' ? 'en' : 'zh');
  };

  return (
    <LanguageContext.Provider value={{ lang, isZh, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

