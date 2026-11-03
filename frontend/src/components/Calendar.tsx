import { isSameDay, monthGrid } from '../lib/availability'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

type Props = {
  month: Date // any day of the month to show
  selected: Date | null
  isDisabled: (day: Date) => boolean
  onSelect: (day: Date) => void
  onMonthChange: (month: Date) => void
  canGoBack: boolean
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Month view where the days without free times are greyed out.
export default function Calendar({ month, selected, isDisabled, onSelect, onMonthChange, canGoBack }: Props) {
  const label = month.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (by: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + by, 1))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month" className="p-1 text-muted disabled:opacity-30">
          <ChevronLeftIcon />
        </button>
        <span className="text-sm font-medium" aria-live="polite">
          {label}
        </span>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="p-1 text-muted">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((day) => (
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
              aria-label={day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
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
