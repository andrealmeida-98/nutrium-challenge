import type { Lang } from '../i18n'

// "en-GB" and "pt-PT" for the browser's Intl.
export const localeOf = (lang: Lang) => (lang === 'pt' ? 'pt-PT' : 'en-GB')

// "€ 25.00" (as in the mockup) or "25,00 €". The spaces do not break, so the symbol never ends up alone on a line.
export function formatPrice(cents: number, lang: Lang = 'en'): string {
  if (lang === 'pt') {
    return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency: 'EUR' }).format(cents / 100)
  }
  return `€ ${(cents / 100).toFixed(2)}`
}

export function formatDistance(km: number, lang: Lang = 'en'): string {
  const digits = km < 10 ? 1 : 0
  const number = km.toLocaleString(localeOf(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${number} km`
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  return `${day}${{ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th'}`
}

// "21st december 2025", as in the mockup, or "21 de dezembro de 2025". Shown in the browser's time zone.
export function formatDate(iso: string, lang: Lang = 'en'): string {
  const date = new Date(iso)
  if (lang === 'pt') {
    return date.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const month = date.toLocaleString(localeOf(lang), { month: 'long' }).toLowerCase()
  return `${ordinal(date.getDate())} ${month} ${date.getFullYear()}`
}

// "9:30 am", as in the mockup, or "09:30".
export function formatTime(iso: string, lang: Lang = 'en'): string {
  const date = new Date(iso)
  if (lang === 'pt') {
    return date.toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'am' : 'pm'}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
