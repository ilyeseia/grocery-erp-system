import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Language type
export type Language = 'en' | 'ar' | 'fr';

// Language names
export const languageNames: Record<Language, string> = {
  en: 'English',
  ar: 'العربية',
  fr: 'Français',
};

// Language directions
export const languageDirections: Record<Language, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
  fr: 'ltr',
};

// Translation type
type TranslationKeys = typeof import('../locales/en.json');
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & string];

export type TranslationKey = NestedKeyOf<TranslationKeys>;

// i18n Store
interface I18nState {
  language: Language;
  direction: 'ltr' | 'rtl';
  translations: Record<string, unknown>;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Helper to get nested value
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj) as string | undefined;
}

// Replace parameters in translation string
function replaceParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    str
  );
}

// Load translations dynamically
async function loadTranslations(lang: Language): Promise<Record<string, unknown>> {
  const translations = await import(`../locales/${lang}.json`);
  return translations.default || translations;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'en',
      direction: 'ltr',
      translations: {},

      setLanguage: async (lang: Language) => {
        const translations = await loadTranslations(lang);
        const direction = languageDirections[lang];

        // Update document direction and lang
        if (typeof document !== 'undefined') {
          document.documentElement.dir = direction;
          document.documentElement.lang = lang;
        }

        set({ language: lang, direction, translations });
      },

      t: (key: string, params?: Record<string, string | number>): string => {
        const { translations } = get();
        const value = getNestedValue(translations, key);

        if (value === undefined) {
          console.warn(`Translation not found: ${key}`);
          return key;
        }

        return replaceParams(value, params);
      },
    }),
    {
      name: 'erp-i18n',
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reload translations for persisted language
          loadTranslations(state.language).then((translations) => {
            const direction = languageDirections[state.language];
            state.translations = translations;
            state.direction = direction;

            if (typeof document !== 'undefined') {
              document.documentElement.dir = direction;
              document.documentElement.lang = state.language;
            }
          });
        }
      },
    }
  )
);

// Initialize with English translations
if (typeof window !== 'undefined') {
  loadTranslations('en').then((translations) => {
    useI18nStore.setState({ translations });
  });
}

// Hook for components
export function useTranslation() {
  const { t, language, direction, setLanguage } = useI18nStore();
  return { t, language, direction, setLanguage };
}
