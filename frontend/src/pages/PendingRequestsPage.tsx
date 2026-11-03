import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { answerAppointmentRequest } from '../api/appointmentRequests'
import { ApiError } from '../api/client'
import { fetchPendingRequests } from '../api/nutritionists'
import type { AppointmentRequest } from '../api/types'
import Hero from '../components/Hero'
import { ChevronLeftIcon, ChevronRightIcon, HistoryIcon, ShareIcon } from '../components/icons'
import RequestCard, { RequestCardSkeleton } from '../components/RequestCard'
import { errorText } from '../lib/errors'
import { useFetch } from '../lib/useFetch'

const PER_PAGE = 3
const navButton = 'flex size-9 items-center justify-center border border-gray-200 bg-white text-muted disabled:opacity-40'

export default function PendingRequestsPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const { data, error, loading, reload, setData } = useFetch((signal) => fetchPendingRequests(id, signal), [id])

  const [page, setPage] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const requests = data?.appointment_requests ?? []
  const pages = Math.max(Math.ceil(requests.length / PER_PAGE), 1)

  // After answering, the list gets shorter: do not stay on a page that no longer exists.
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1)
  }, [page, pages])

  async function handleAnswer(request: AppointmentRequest, answer: 'accept' | 'reject') {
    setBusyId(request.id)
    setMessage(null)
    try {
      await answerAppointmentRequest(request.id, answer)
      // Accepting also rejects the overlapping pending requests, so load the list again.
      const fresh = await fetchPendingRequests(id)
      const autoRejected = requests.length - 1 - fresh.appointment_requests.length
      setData(fresh)
      const overlap = answer === 'accept' && autoRejected > 0 ? ` ${t('pending.overlap', { count: autoRejected })}` : ''
      const text = t(answer === 'accept' ? 'pending.accepted' : 'pending.rejected', { name: request.guest_name })
      setMessage({ kind: 'ok', text: text + overlap })
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e, t) })
      reload() // it may already have been answered (for example rejected automatically)
    } finally {
      setBusyId(null)
    }
  }

  const visible = requests.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <>
      <Hero />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="rounded-md bg-white p-6 shadow-md" aria-labelledby="pending-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 id="pending-title" className="text-2xl font-light text-ink">
                {t('pending.title')}
              </h1>
              <p className="text-xs text-muted">
                {t('pending.subtitle')}{data ? ` · ${data.nutritionist.name}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={navButton} aria-label={t('pending.previous')} disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeftIcon />
              </button>
              <button type="button" className={navButton} aria-label={t('pending.next')} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRightIcon />
              </button>
              {/* Decorative, as in the mockup: not part of the challenge. */}
              <button type="button" className={`${navButton} text-ink`} aria-label={t('pending.share')}>
                <ShareIcon />
              </button>
              <button type="button" className={`${navButton} text-ink`} aria-label={t('pending.history')}>
                <HistoryIcon />
              </button>
            </div>
          </div>

          {message && (
            <p
              role={message.kind === 'error' ? 'alert' : 'status'}
              className={`mt-4 rounded-sm px-4 py-3 text-sm ${message.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-soft text-brand-dark'}`}
            >
              {message.text}
            </p>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-sm bg-red-50 px-4 py-3 text-sm text-red-700">
              {error instanceof ApiError && error.status === 404 ? (
                <Trans i18nKey="pending.notFound" components={{ list: <Link to="/professionals" className="font-medium underline" /> }} />
              ) : (
                <>
                  {errorText(error, t)}{' '}
                  <button type="button" onClick={reload} className="font-medium underline">
                    {t('errors.tryAgain')}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
            {!data && loading && Array.from({ length: PER_PAGE }, (_, i) => <RequestCardSkeleton key={i} />)}
            {visible.map((request) => (
              <RequestCard key={request.id} request={request} busy={busyId !== null} onAnswer={handleAnswer} />
            ))}
          </div>

          {data && requests.length === 0 && (
            <p className="py-10 text-center text-muted">{t('pending.empty')}</p>
          )}
        </section>
      </main>
    </>
  )
}
