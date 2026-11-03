import { useTranslation } from 'react-i18next'
import type { Lang } from '../i18n'
import { formatDate, formatDistance, formatPrice, formatTime, localeOf } from './format'

// The formatting functions, already set to the language the page is showing.
export function useFormat() {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language === 'pt' ? 'pt' : 'en'

  return {
    lang,
    locale: localeOf(lang),
    price: (cents: number) => formatPrice(cents, lang),
    distance: (km: number) => formatDistance(km, lang),
    date: (iso: string) => formatDate(iso, lang),
    time: (iso: string) => formatTime(iso, lang),
  }
}
