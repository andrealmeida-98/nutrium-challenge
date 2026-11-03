import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchNutritionists } from '../api/nutritionists'
import type { Nutritionist, Service } from '../api/types'
import Hero from '../components/Hero'
import { LocateIcon } from '../components/icons'
import NutritionistCard from '../components/NutritionistCard'
import Pagination from '../components/Pagination'
import ScheduleModal from '../components/ScheduleModal'
import { useFetch } from '../lib/useFetch'

const fieldClass = 'w-full rounded-sm bg-white px-6 py-4 text-ink shadow-md outline-none placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-white/70'

export default function SearchPage() {
  // The search lives in the URL (?q=&location=&page=), so back/forward and reloads work.
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const location = params.get('location') ?? ''
  const page = Math.max(Number(params.get('page')) || 1, 1)

  const [qInput, setQInput] = useState(q)
  const [locationInput, setLocationInput] = useState(location)
  const [scheduling, setScheduling] = useState<{ nutritionist: Nutritionist; service: Service } | null>(null)

  const { data, error, loading, reload } = useFetch(
    (signal) => searchNutritionists({ q, location, page }, signal),
    [q, location, page],
  )

  function updateParams(next: { q?: string; location?: string; page?: number }) {
    const merged = { q, location, page, ...next }
    const search = new URLSearchParams()
    if (merged.q) search.set('q', merged.q)
    if (merged.location) search.set('location', merged.location)
    if (merged.page > 1) search.set('page', String(merged.page))
    setParams(search)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateParams({ q: qInput.trim(), location: locationInput.trim(), page: 1 })
  }

  function goToPage(next: number) {
    updateParams({ page: next })
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <Hero>
        <form onSubmit={handleSubmit} role="search" className="grid gap-4 md:grid-cols-[2fr_1.4fr_auto]">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Name, service…"
            aria-label="Name or service"
            className={fieldClass}
          />
          <div className="relative">
            <input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Location"
              aria-label="Location"
              className={`${fieldClass} pr-12`}
            />
            <LocateIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-lg text-brand" />
          </div>
          <button type="submit" className="rounded-sm bg-accent px-12 py-4 font-medium text-white shadow-md hover:brightness-95">
            Search
          </button>
        </form>
      </Hero>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {data?.location.fallback && (
          <p role="status" className="rounded-sm bg-accent-soft px-4 py-3 text-sm text-accent-text">
            We could not find “{data.location.requested}”, so these results are near {data.location.resolved}.
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-sm bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}{' '}
            <button type="button" onClick={reload} className="font-medium underline">
              Try again
            </button>
          </div>
        )}

        {data && data.nutritionists.length === 0 && !loading && (
          <p className="py-12 text-center text-muted">No nutritionists found. Try a different name or service.</p>
        )}

        <div className={`space-y-6 ${loading && data ? 'opacity-60' : ''}`} aria-busy={loading}>
          {data?.nutritionists.map((nutritionist) => (
            <NutritionistCard
              key={nutritionist.id}
              nutritionist={nutritionist}
              fromCity={data.location.resolved}
              onSchedule={(n, s) => setScheduling({ nutritionist: n, service: s })}
            />
          ))}
        </div>

        {loading && !data && <p className="py-12 text-center text-muted">Loading…</p>}

        {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} onChange={goToPage} />}
      </main>

      {scheduling && <ScheduleModal {...scheduling} onClose={() => setScheduling(null)} />}
    </>
  )
}
