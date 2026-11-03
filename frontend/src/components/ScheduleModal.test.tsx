import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Nutritionist } from '../api/types'
import { mockApi } from '../test/mockApi'
import ScheduleModal from './ScheduleModal'

const service = { id: 10, name: 'General consultation', price_cents: 4000, duration_minutes: 60, city: 'Braga', distance_km: 0 }
const nutritionist: Nutritionist = { id: 1, name: 'Ana Ribeiro', license_number: '2963N', distance_km: 0, services: [service] }

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute)
const busy = (from: Date, to: Date) => ({ starts_at: from.toISOString(), ends_at: to.toISOString() })

// Renders the modal and waits until the times taken have been loaded (the days are disabled until then).
async function renderModal() {
  render(<ScheduleModal nutritionist={nutritionist} service={service} onClose={() => {}} />)
  await waitFor(() => expect(screen.getByRole('group', { name: 'Date and time' })).toHaveAttribute('aria-busy', 'false'))
}

// 18 November 2026, 8:00. Only Date is faked, so timers and user events keep working.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 8, 0))
})
afterEach(() => vi.useRealTimers())

describe('ScheduleModal availability', () => {
  it('asks the API for the times taken in the month on screen', async () => {
    const fetchMock = mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [] } }) })
    await renderModal()
    await screen.findByRole('button', { name: '20 November 2026' })

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.searchParams.get('from')).toBe(new Date(2026, 10, 1).toISOString())
    expect(url.searchParams.get('to')).toBe(new Date(2026, 11, 1).toISOString())
  })

  it('crosses out the times that are already accepted', async () => {
    mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [busy(at(20, 10), at(20, 11))] } }) })
    await renderModal()

    await userEvent.click(await screen.findByRole('button', { name: '20 November 2026' }))

    // The service lasts 60 min, so 9:30, 10:00 and 10:30 collide with the accepted 10:00-11:00.
    for (const time of ['9:30 am', '10:00 am', '10:30 am']) {
      expect(screen.getByRole('button', { name: time })).toBeDisabled()
    }
    for (const time of ['9:00 am', '11:00 am']) {
      expect(screen.getByRole('button', { name: time })).toBeEnabled()
    }
  })

  it('disables a day with no free time left', async () => {
    mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [busy(at(20, 9), at(20, 18))] } }) })
    await renderModal()

    expect(await screen.findByRole('button', { name: '19 November 2026' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '20 November 2026' })).toBeDisabled()
  })

  it('disables the days in the past and the times that have passed today', async () => {
    vi.setSystemTime(new Date(2026, 10, 18, 12, 15)) // today, a quarter past noon
    mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [] } }) })
    await renderModal()

    expect(await screen.findByRole('button', { name: '17 November 2026' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '18 November 2026' }))

    expect(screen.getByRole('button', { name: '9:00 am' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '12:00 pm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '12:30 pm' })).toBeEnabled()
  })

  it('cannot go back to a month that is over', async () => {
    mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [] } }) })
    await renderModal()
    await screen.findByRole('button', { name: '20 November 2026' })

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })

  it('loads the next month when the guest moves forward', async () => {
    const fetchMock = mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [] } }) })
    await renderModal()
    await screen.findByRole('button', { name: '20 November 2026' })

    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))

    expect(await screen.findByRole('button', { name: '15 December 2026' })).toBeEnabled()
    const url = new URL(String(fetchMock.mock.calls.at(-1)![0]))
    expect(url.searchParams.get('from')).toBe(new Date(2026, 11, 1).toISOString())
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeEnabled()
  })

  it('lets the guest try anyway when the availability could not be loaded', async () => {
    mockApi({ 'GET /nutritionists/1/busy_slots': () => ({ status: 500, body: { error: 'Boom' } }) })
    await renderModal()

    expect(await screen.findByText(/Could not check which times are taken/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20 November 2026' })).toBeEnabled()
  })

  it('shows the time as taken when someone else got it while the guest was choosing', async () => {
    let taken = false
    mockApi({
      'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: taken ? [busy(at(20, 10), at(20, 11))] : [] } }),
      'POST /appointment_requests': () => {
        taken = true
        return { status: 422, body: { error: 'Validation failed', details: { starts_at: ['is not available'] } } }
      },
    })
    await renderModal()
    await userEvent.type(screen.getByLabelText('Name'), 'Maria')
    await userEvent.type(screen.getByLabelText('Email'), 'maria@example.com')
    await userEvent.click(await screen.findByRole('button', { name: '20 November 2026' }))
    await userEvent.click(screen.getByRole('button', { name: '10:00 am' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Date and time is not available')
    // The taken times are loaded again, so 10:00 gets crossed out and the choice is cleared.
    await waitFor(() => expect(screen.getByRole('button', { name: '10:00 am' })).toBeDisabled())
    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument()
  })
})
