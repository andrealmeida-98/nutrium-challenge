import { useTranslation } from 'react-i18next'
import { isSameDay, monthGrid } from '../lib/availability'
import { useFormat } from '../lib/useFormat'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

type Props = {
  month: Date // any day of the month to show
  selected: Date | null
  isDisabled: (day: Date) => boolean
  onSelect: (day: Date) => void
  onMonthChange: (month: Date) => void
  canGoBack: boolean
}

// Month view where the days without free times are greyed out.
export default function Calendar({ month, selected, isDisabled, onSelect, onMonthChange, canGoBack }: Props) {
  const { t } = useTranslation()
  const { locale } = useFormat()
  const weekdays = t('calendar.weekdays', { returnObjects: true })
  const label = month.toLocaleString(locale, { month: 'long', year: 'numeric' })
  const shift = (by: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + by, 1))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canGoBack} aria-label={t('modal.previousMonth')} className="p-1 text-muted disabled:opacity-30">
          <ChevronLeftIcon />
        </button>
        <span className="text-sm font-medium" aria-live="polite">
          {label}
        </span>
        <button type="button" onClick={() => shift(1)} aria-label={t('modal.nextMonth')} className="p-1 text-muted">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {weekdays.map((day) => (
          <span key={day} className="py-1 text-muted">
            {day}
          </span>
        ))}
        {monthGrid(month).map((day, i) =>
          day === null ? (
            <span key={`empty-${i}`} />
          ) : (
            <button
              key={day.getTime()}
              type="button"
              disabled={isDisabled(day)}
              onClick={() => onSelect(day)}
              aria-label={day.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              aria-pressed={selected !== null && isSameDay(day, selected)}
              className={`rounded-sm py-1.5 text-sm ${
                selected && isSameDay(day, selected)
                  ? 'bg-brand text-white'
                  : 'text-ink hover:bg-brand-soft disabled:text-gray-300 disabled:line-through disabled:hover:bg-transparent'
              }`}
            >
              {day.getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
