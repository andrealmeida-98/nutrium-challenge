import { Link } from 'react-router-dom'
import { searchNutritionists } from '../api/nutritionists'
import Avatar from '../components/Avatar'
import Hero from '../components/Hero'
import { useFetch } from '../lib/useFetch'

// There is no login, so this page is how a nutritionist finds her pending requests.
export default function ProfessionalsPage() {
  const { data, error, loading, reload } = useFetch(
    (signal) => searchNutritionists({ q: '', location: '', page: 1, perPage: 50 }, signal),
    [],
  )

  return (
    <>
      <Hero />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-light">Professional area</h1>
        <p className="mb-6 text-sm text-muted">Choose who you are to see your pending appointment requests.</p>

        {loading && !data && <p className="text-muted">Loading…</p>}
        {error && (
          <p role="alert" className="rounded-sm bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}{' '}
            <button type="button" onClick={reload} className="font-medium underline">
              Try again
            </button>
          </p>
        )}

        <ul className="divide-y divide-gray-100 bg-white shadow-sm">
          {data?.nutritionists.map((n) => (
            <li key={n.id}>
              <Link to={`/nutritionists/${n.id}/pending-requests`} className="flex items-center gap-4 px-5 py-4 hover:bg-brand-soft">
                <Avatar name={n.name} className="size-12 text-lg" />
                <span className="font-medium text-brand">{n.name}</span>
                <span className="text-sm text-muted">Dietitian • {n.license_number}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
