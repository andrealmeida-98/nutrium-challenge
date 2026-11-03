import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AppointmentRequest } from '../api/types'
import { mockApi } from '../test/mockApi'
import PendingRequestsPage from './PendingRequestsPage'

function pending(id: number, guest: string, hour: number): AppointmentRequest {
  const startsAt = new Date(2026, 10, 20, hour, 0)
  return {
    id,
    status: 'pending',
    guest_name: guest,
    guest_email: `${guest.toLowerCase()}@example.com`,
    starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + 45 * 60000).toISOString(),
    service: { id: 10, name: 'General consultation', price_cents: 4000, duration_minutes: 45, city: 'Braga' },
    nutritionist: { id: 1, name: 'Ana Ribeiro' },
  }
}

const listBody = (requests: AppointmentRequest[]) => ({
  body: { nutritionist: { id: 1, name: 'Ana Ribeiro' }, appointment_requests: requests },
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/nutritionists/1/pending-requests']}>
      <Routes>
        <Route path="/nutritionists/:id/pending-requests" element={<PendingRequestsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PendingRequestsPage', () => {
  it('shows the guest, the date and the time of each pending request', async () => {
    mockApi({ 'GET /nutritionists/1/appointment_requests': () => listBody([pending(1, 'Maria', 9)]) })
    renderPage()

    expect(await screen.findByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('20th november 2026')).toBeInTheDocument()
    expect(screen.getByText('9:00 am')).toBeInTheDocument()
    expect(screen.getByText(/Ana Ribeiro/)).toBeInTheDocument()
  })

  it('says so when there is nothing pending', async () => {
    mockApi({ 'GET /nutritionists/1/appointment_requests': () => listBody([]) })
    renderPage()

    expect(await screen.findByText(/No pending requests/)).toBeInTheDocument()
  })

  it('shows three requests at a time and moves with the arrows', async () => {
    mockApi({
      'GET /nutritionists/1/appointment_requests': () =>
        listBody([pending(1, 'Ana', 8), pending(2, 'Bia', 9), pending(3, 'Cris', 10), pending(4, 'Dino', 11)]),
    })
    renderPage()

    expect(await screen.findByText('Cris')).toBeInTheDocument()
    expect(screen.queryByText('Dino')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous requests' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next requests' }))

    expect(screen.getByText('Dino')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })

  it('accepts a request, reloads the list and reports the ones rejected automatically', async () => {
    const lists = [
      [pending(1, 'Maria', 9), pending(2, 'Rui', 9), pending(3, 'Sofia', 15)],
      [pending(3, 'Sofia', 15)], // Rui overlapped Maria, so he was rejected by the API
    ]
    let accepted = false
    mockApi({
      'GET /nutritionists/1/appointment_requests': () => listBody(accepted ? lists[1] : lists[0]),
      'PATCH /appointment_requests/1/accept': () => {
        accepted = true
        return { body: { ...pending(1, 'Maria', 9), status: 'accepted' } }
      },
    })
    renderPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Answer request' }))[0])
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByRole('status')).toHaveTextContent("Accepted Maria's request. 1 overlapping request was rejected automatically.")
    expect(screen.queryByText('Maria')).not.toBeInTheDocument()
    expect(screen.queryByText('Rui')).not.toBeInTheDocument()
    expect(screen.getByText('Sofia')).toBeInTheDocument()
  })

  it('rejects a request without mentioning overlaps', async () => {
    let rejected = false
    mockApi({
      'GET /nutritionists/1/appointment_requests': () => listBody(rejected ? [] : [pending(1, 'Maria', 9)]),
      'PATCH /appointment_requests/1/reject': () => {
        rejected = true
        return { body: { ...pending(1, 'Maria', 9), status: 'rejected' } }
      },
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Answer request' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(await screen.findByRole('status')).toHaveTextContent("Rejected Maria's request.")
    expect(await screen.findByText(/No pending requests/)).toBeInTheDocument()
  })

  it('shows the API message and reloads when the request was already answered (409)', async () => {
    let calls = 0
    mockApi({
      'GET /nutritionists/1/appointment_requests': () => listBody(++calls === 1 ? [pending(1, 'Maria', 9)] : []),
      'PATCH /appointment_requests/1/accept': () => ({ status: 409, body: { error: 'request is rejected, not pending' } }),
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Answer request' }))
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('request is rejected, not pending')
    expect(await screen.findByText(/No pending requests/)).toBeInTheDocument()
  })

  it('tells the user when the nutritionist does not exist', async () => {
    mockApi({ 'GET /nutritionists/1/appointment_requests': () => ({ status: 404, body: { error: 'Not found' } }) })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Nutritionist not found')
  })
})
