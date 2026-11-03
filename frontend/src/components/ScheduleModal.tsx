import { useEffect, useState, type FormEvent } from 'react'
import { createAppointmentRequest } from '../api/appointmentRequests'
import { ApiError } from '../api/client'
import { fetchBusySlots } from '../api/nutritionists'
import type { Nutritionist, Service } from '../api/types'
import { isDayAvailable, slotsForDay } from '../lib/availability'
import { formatDate, formatPrice, formatTime } from '../lib/format'
import { useFetch } from '../lib/useFetch'
import Calendar from './Calendar'
import { CloseIcon } from './icons'

type Props = { nutritionist: Nutritionist; service: Service; onClose: () => void }

const FIELD_LABELS: Record<string, string> = {
  guest_name: 'Name',
  guest_email: 'Email',
  starts_at: 'Date and time',
  service: 'Service',
}

// "Name can't be blank", "Date and time is not available"...
// One message per field: a blank email would otherwise say "can't be blank" and "is invalid".
function errorMessages(details: Record<string, string[]>): string[] {
  return Object.entries(details).map(([field, messages]) => `${FIELD_LABELS[field] ?? field} ${messages[0]}`)
}

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const inputClass =
  'mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand'

export default function ScheduleModal({ nutritionist, service, onClose }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [month, setMonth] = useState(() => firstOfMonth(new Date()))
  const [day, setDay] = useState<Date | null>(null)
  const [slot, setSlot] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [sent, setSent] = useState(false)

  // Times already taken by accepted requests, for the month on screen.
  const busy = useFetch(
    (signal) => fetchBusySlots(nutritionist.id, month, new Date(month.getFullYear(), month.getMonth() + 1, 1), signal),
    [nutritionist.id, month.getTime()],
  )
  // If this fails the guest can still pick any time: the API checks it again when sending.
  const busySlots = busy.data?.busy_slots ?? []
  const now = new Date()

  const duration = service.duration_minutes
  const isDayDisabled = (d: Date) => busy.loading || !isDayAvailable(d, duration, busySlots, now)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function changeMonth(next: Date) {
    setMonth(next)
    setDay(null)
    setSlot(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!slot) {
      setErrors(['Choose a date and time'])
      return
    }

    setSubmitting(true)
    setErrors([])
    try {
      await createAppointmentRequest({
        service_id: service.id,
        guest_name: name,
        guest_email: email,
        starts_at: slot.toISOString(),
      })
      setSent(true)
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = errorMessages(error.details)
        setErrors(messages.length > 0 ? messages : [error.message])
        if (error.details.starts_at) {
          // Someone else got that time in the meantime: show it as taken.
          setSlot(null)
          busy.reload()
        }
      } else {
        setErrors(['Something went wrong. Please try again.'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  const slots = day ? slotsForDay(day, duration, busySlots, now) : []

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-sm bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="schedule-title" className="text-xl font-medium text-brand">
              Schedule appointment
            </h2>
            <p className="text-sm text-muted">
              {nutritionist.name} · {service.name} · {service.duration_minutes} min · {formatPrice(service.price_cents)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl text-muted hover:text-ink">
            <CloseIcon />
          </button>
        </div>

        {sent && slot ? (
          <div className="mt-6" role="status">
            <p className="font-medium text-brand">Request sent!</p>
            <p className="mt-1 text-sm">
              You asked {nutritionist.name} for {formatDate(slot.toISOString())} at {formatTime(slot.toISOString())}.{' '}
              {nutritionist.name} will answer soon and you will get an email at <strong>{email}</strong>. If you had
              another pending request, it was cancelled: you can only have one at a time.
            </p>
            <button type="button" onClick={onClose} className="mt-6 w-full rounded-sm bg-brand px-4 py-2 text-white hover:bg-brand-dark">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <label className="block text-sm">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus autoComplete="name" className={inputClass} />
            </label>
            <label className="block text-sm">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputClass} />
            </label>

            <fieldset aria-busy={busy.loading}>
              <legend className="text-sm">Date and time</legend>
              <div className="mt-2 rounded-sm border border-gray-200 p-3">
                <Calendar
                  month={month}
                  selected={day}
                  isDisabled={isDayDisabled}
                  onSelect={(d) => {
                    setDay(d)
                    setSlot(null)
                  }}
                  onMonthChange={changeMonth}
                  canGoBack={month > firstOfMonth(now)}
                />

                {busy.error && (
                  <p className="mt-2 text-xs text-muted">
                    Could not check which times are taken. You can still send the request, we will check it for you.
                  </p>
                )}

                {day && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs text-muted">
                      Times on {formatDate(day.toISOString())} (crossed out times are taken or have passed)
                    </p>
                    {slots.length === 0 ? (
                      <p className="text-sm text-muted">This service does not fit in the working hours.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((s) => {
                          const selected = slot?.getTime() === s.start.getTime()
                          return (
                            <button
                              key={s.start.getTime()}
                              type="button"
                              disabled={!s.available}
                              aria-pressed={selected}
                              onClick={() => setSlot(s.start)}
                              className={`rounded-sm border px-1 py-1.5 text-sm ${
                                selected
                                  ? 'border-brand bg-brand text-white'
                                  : 'border-gray-200 hover:border-brand hover:bg-brand-soft disabled:border-gray-100 disabled:text-gray-300 disabled:line-through disabled:hover:bg-transparent'
                              }`}
                            >
                              {formatTime(s.start.toISOString())}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {slot && (
                <p className="mt-2 text-sm text-brand-dark">
                  Selected: {formatDate(slot.toISOString())}, {formatTime(slot.toISOString())}
                </p>
              )}
            </fieldset>

            {errors.length > 0 && (
              <ul role="alert" className="rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sm bg-accent px-4 py-2 font-medium text-white hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
