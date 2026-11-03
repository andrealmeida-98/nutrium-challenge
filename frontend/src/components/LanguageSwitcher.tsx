import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div role="group" aria-label={t('header.language')} className="flex overflow-hidden rounded-sm border border-white/50 text-xs font-bold">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-pressed={i18n.language === lang}
          onClick={() => void i18n.changeLanguage(lang)}
          className={`px-2.5 py-1 ${i18n.language === lang ? 'bg-white text-brand-dark' : 'text-white hover:bg-white/20'}`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
