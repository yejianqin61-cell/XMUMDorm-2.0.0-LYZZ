/**
 * 语言 Context（React Native 版）
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'zh' | 'en';

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; toggleLang: () => void } | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
