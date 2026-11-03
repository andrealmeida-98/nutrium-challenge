import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppointmentRequest } from '../api/types'
import { useFormat } from '../lib/useFormat'
import Avatar from './Avatar'
import { CalendarIcon, ClockIcon } from './icons'

type Props = {
  request: AppointmentRequest
  busy: boolean
  onAnswer: (request: AppointmentRequest, answer: 'accept' | 'reject') => void
}

// One pending request. "Answer request" opens the two choices, as in the mockup the
// card has a single call to action at the bottom.
export default function RequestCard({ request, busy, onAnswer }: Props) {
  const { t } = useTranslation()
  const format = useFormat()
  const [answering, setAnswering] = useState(false)

  return (
    <article className="flex flex-col border border-gray-200 bg-white">
      <div className="flex gap-5 p-6">
        <Avatar name={request.guest_name} className="size-24 text-3xl" />
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-xl font-light text-ink">{request.guest_name}</h3>
          <p className="truncate text-xs text-muted">{request.guest_email}</p>
          <p className="truncate pb-1 text-xs text-ink">{request.service.name}</p>
          <p className="flex items-center gap-2 text-sm">
            <CalendarIcon className="rounded-full bg-brand-soft p-0.5 text-lg text-brand" />
            {format.date(request.starts_at)}
          </p>
          <p className="flex items-center gap-2 text-sm">
            <ClockIcon className="rounded-full bg-brand-soft p-0.5 text-lg text-brand" />
            {format.time(request.starts_at)}
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-100">
        {answering ? (
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <button
              type="button"
              disabled={busy}
              onClick={() => onAnswer(request, 'accept')}
              className="py-3 text-sm font-bold text-brand hover:bg-brand-soft disabled:opacity-50"
            >
              {t('pending.accept')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAnswer(request, 'reject')}
              className="py-3 text-sm font-bold text-accent-text hover:bg-accent-soft disabled:opacity-50"
            >
              {t('pending.reject')}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAnswering(true)} className="w-full py-3 text-sm font-bold text-brand hover:bg-brand-soft">
            {t('pending.answer')}
          </button>
        )}
      </div>
    </article>
  )
}

// Grey placeholder shown while loading, like the empty cards of the mockup.
export function RequestCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col border border-gray-200 bg-white">
      <div className="flex gap-5 p-6">
        <div className="size-24 shrink-0 rounded-full bg-gray-100" />
        <div className="w-full space-y-3 pt-4">
          <div className="h-2.5 w-2/3 rounded bg-gray-100" />
          <div className="h-2.5 w-full rounded bg-gray-100" />
          <div className="h-2.5 w-1/2 rounded bg-gray-100" />
        </div>
      </div>
      <div className="mt-auto flex justify-center border-t border-gray-100 py-4">
        <div className="h-2 w-16 rounded bg-gray-100" />
      </div>
    </div>
  )
}
