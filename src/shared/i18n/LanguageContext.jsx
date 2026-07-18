import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import pt from './pt';
import en from './en';

const translations = { pt, en };
const htmlLang = { pt: 'pt-BR', en: 'en' };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('pt');

  useEffect(() => {
    document.documentElement.lang = htmlLang[language];
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t: translations[language] }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
