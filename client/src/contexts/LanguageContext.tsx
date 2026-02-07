import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Translation files
import enTranslations from '../translations/en.json';
import etTranslations from '../translations/et.json';
import ruTranslations from '../translations/ru.json';
import fiTranslations from '../translations/fi.json';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, any> = {
  en: enTranslations,
  et: etTranslations,
  ru: ruTranslations,
  fi: fiTranslations,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  const changeLanguage = (language: string) => {
    setCurrentLanguage(language);
    // Store in localStorage for persistence
    localStorage.setItem('selectedLanguage', language);
  };

  const t = (key: string): string => {
    // Split the key by dots to navigate nested objects
    const keys = key.split('.');
    let value: any = translations[currentLanguage] || translations.en;
    
    // Navigate through nested object
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found in current language
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            // If not found in English either, return the original key
            return key;
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && translations[savedLanguage as keyof typeof translations]) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};