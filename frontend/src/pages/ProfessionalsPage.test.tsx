import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi } from '../test/mockApi'
import PendingRequestsPage from './PendingRequestsPage'
import ProfessionalsPage from './ProfessionalsPage'

const nutritionist = (id: number, name: string, license: string) => ({
  id,
  name,
  license_number: license,
  distance_km: 0,
  services: [],
})

function renderApp(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/professionals/:id/pending-requests" element={<PendingRequestsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfessionalsPage', () => {
  it('lists the nutritionists and links each one to her pending requests', async () => {
    mockApi({
      'GET /nutritionists': () => ({
        body: {
          location: { requested: null, resolved: 'Braga', fallback: false },
          meta: { page: 1, per_page: 50, total_count: 2, total_pages: 1 },
          nutritionists: [nutritionist(1, 'Ana Ribeiro', '2963N'), nutritionist(2, 'Bruno Carvalho', '1048N')],
        },
      }),
    })
    renderApp('/professionals')

    const ana = await screen.findByRole('link', { name: /Ana Ribeiro/ })
    expect(ana).toHaveAttribute('href', '/professionals/1/pending-requests')
    expect(screen.getByRole('link', { name: /Bruno Carvalho/ })).toHaveAttribute('href', '/professionals/2/pending-requests')
    expect(screen.getByText('Nutritionist • 2963N')).toBeInTheDocument()
  })

  it('opens the pending requests of the chosen nutritionist', async () => {
    mockApi({
      'GET /nutritionists': () => ({
        body: {
          location: { requested: null, resolved: 'Braga', fallback: false },
          meta: { page: 1, per_page: 50, total_count: 1, total_pages: 1 },
          nutritionists: [nutritionist(1, 'Ana Ribeiro', '2963N')],
        },
      }),
      'GET /nutritionists/1/appointment_requests': () => ({
        body: { nutritionist: { id: 1, name: 'Ana Ribeiro' }, appointment_requests: [] },
      }),
    })
    renderApp('/professionals')

    await userEvent.click(await screen.findByRole('link', { name: /Ana Ribeiro/ }))

    expect(await screen.findByRole('heading', { name: 'Pending Requests' })).toBeInTheDocument()
    expect(screen.getByText(/Ana Ribeiro/)).toBeInTheDocument()
  })
})
