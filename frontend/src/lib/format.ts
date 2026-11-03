// "€ 25.00" from cents. The space does not break, so "€" never ends up alone on a line.
export function formatPrice(cents: number): string {
  return `€\u00a0${(cents / 100).toFixed(2)}`
}

export function formatDistance(km: number): string {
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  return `${day}${{ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th'}`
}

// "21st december 2025", as in the mockup. Shown in the browser's time zone.
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const month = date.toLocaleString('en-GB', { month: 'long' }).toLowerCase()
  return `${ordinal(date.getDate())} ${month} ${date.getFullYear()}`
}

// "9:30 am", as in the mockup.
export function formatTime(iso: string): string {
  const date = new Date(iso)
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
