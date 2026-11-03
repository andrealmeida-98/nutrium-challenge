import { useTranslation } from 'react-i18next'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Hero from './components/Hero'
import PendingRequestsPage from './pages/PendingRequestsPage'
import ProfessionalsPage from './pages/ProfessionalsPage'
import SearchPage from './pages/SearchPage'

function NotFound() {
  const { t } = useTranslation()
  return (
    <>
      <Hero />
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-light">{t('notFound.title')}</h1>
        <Link to="/" className="mt-4 inline-block text-brand underline">
          {t('notFound.back')}
        </Link>
      </main>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/professionals/:id/pending-requests" element={<PendingRequestsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
