import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import pt from './pt'

export const LANGUAGES = ['en', 'pt'] as const
export type Lang = (typeof LANGUAGES)[number]

const STORAGE_KEY = 'lang'

// Language to start with: the one the user chose before, otherwise the browser's.
export function detectLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'pt') return saved
  } catch {
    // storage can be blocked: fall through to the browser language
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, pt: { translation: pt } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // not being able to remember the choice is not a problem
  }
})

export default i18n
