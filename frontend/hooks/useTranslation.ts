
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Define the shape of the context
interface LanguageContextType {
  language: string;
  translations: Record<string, any>;
  t: (key: string, options?: Record<string, string | number>) => string;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define the props for the provider
interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const language = 'id'; // Hardcode language to Indonesian
  const [translations, setTranslations] = useState<Record<string, any>>({});

  const fetchTranslations = useCallback(async (lang: string) => {
    try {
      const response = await fetch(`/locales/${lang}.json`);
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error(`Could not load translation file for language: ${lang}`, error);
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  // FIX: Refactored the control flow to be clearer for the TypeScript type checker.
  // This resolves the "not assignable to type 'never'" error by first ensuring `result` is a string
  // before attempting to perform string operations on it.
  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key; // Return the key if translation is not found
      }
    }

    // If the final result is not a string, we can't process it, so return the key.
    if (typeof result !== 'string') {
      return key;
    }
    
    // If we have options, perform placeholder replacement.
    if (options) {
      // FIX: The `reduce` function was causing a confusing TypeScript error.
      // Refactored to a for...of loop which is clearer and avoids the type inference issue.
      let interpolatedString = result;
      for (const [optKey, optValue] of Object.entries(options)) {
        interpolatedString = interpolatedString.replace(`{${optKey}}`, String(optValue));
      }
      return interpolatedString;
    }
    
    // Otherwise, return the untransformed string.
    return result;
  }, [translations]);

  const value = {
    language,
    translations,
    t,
  };

  // FIX: Replaced JSX with `React.createElement` to be compatible with a .ts file.
  // This resolves errors about unknown names like 'div' and JSX-related parsing issues.
  return React.createElement(
    LanguageContext.Provider,
    { value },
    Object.keys(translations).length > 0 ? children : React.createElement('div', null, 'Loading translations...')
  );
};

// Custom hook to use the language context
export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
