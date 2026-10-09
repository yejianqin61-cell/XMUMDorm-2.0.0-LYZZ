import { createContext, useContext } from 'react';
export const LanguageContext = createContext({
  lang: 'zh',
  isZh: true,
  setLang: () => {},
});
export function useLanguage() {
  return useContext(LanguageContext);
}
