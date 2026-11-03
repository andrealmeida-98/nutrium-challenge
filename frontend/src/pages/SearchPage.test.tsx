import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchResponse } from '../api/types'
import { mockApi } from '../test/mockApi'
import SearchPage from './SearchPage'

const ana = {
  id: 1,
  name: 'Ana Ribeiro',
  license_number: '2963N',
  distance_km: 0,
  services: [
    { id: 10, name: 'General consultation', price_cents: 4000, duration_minutes: 45, city: 'Braga', distance_km: 0 },
    { id: 11, name: 'Meal plan', price_cents: 6000, duration_minutes: 60, city: 'Braga', distance_km: 0 },
  ],
}

function response(overrides: Partial<SearchResponse> = {}): { body: SearchResponse } {
  return {
    body: {
      location: { requested: null, resolved: 'Braga', fallback: false },
      meta: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
      nutritionists: [ana],
      ...overrides,
    },
  }
}

function renderPage(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SearchPage />
    </MemoryRouter>,
  )
}

// The price uses a non-breaking space, which Testing Library turns into a normal one when matching text.
describe('SearchPage', () => {
  it('lists the nutritionists with licence number, price and distance', async () => {
    mockApi({ 'GET /nutritionists': () => response() })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Ana Ribeiro' })).toBeInTheDocument()
    expect(screen.getByText('Dietitian • 2963N')).toBeInTheDocument()
    expect(screen.getByText('€ 40.00 · 45 min')).toBeInTheDocument()
    expect(screen.getByText('0.0 km from Braga')).toBeInTheDocument()
  })

  it('shows the price of the service chosen in the dropdown', async () => {
    mockApi({ 'GET /nutritionists': () => response() })
    renderPage()

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Service' }), 'Meal plan')

    expect(screen.getByText('€ 60.00 · 60 min')).toBeInTheDocument()
  })

  it('sends the typed search and location to the API', async () => {
    const fetchMock = mockApi({ 'GET /nutritionists': () => response() })
    renderPage()
    await screen.findByRole('heading', { name: 'Ana Ribeiro' })

    await userEvent.type(screen.getByLabelText('Name or service'), 'sports')
    await userEvent.type(screen.getByLabelText('Location'), 'Porto')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    const lastUrl = new URL(String(fetchMock.mock.calls.at(-1)![0]))
    expect(lastUrl.searchParams.get('q')).toBe('sports')
    expect(lastUrl.searchParams.get('location')).toBe('Porto')
    expect(lastUrl.searchParams.get('page')).toBe('1')
  })

  it('warns when the location was not found', async () => {
    mockApi({
      'GET /nutritionists': () =>
        response({ location: { requested: 'Xpto', resolved: 'Braga', fallback: true } }),
    })
    renderPage('/?location=Xpto')

    expect(await screen.findByText(/could not find “Xpto”.*near Braga/)).toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    mockApi({
      'GET /nutritionists': () =>
        response({ nutritionists: [], meta: { page: 1, per_page: 10, total_count: 0, total_pages: 0 } }),
    })
    renderPage('/?q=zzz')

    expect(await screen.findByText(/No nutritionists found/)).toBeInTheDocument()
  })

  it('shows an error with a retry when the API is down', async () => {
    let calls = 0
    mockApi({ 'GET /nutritionists': () => (++calls === 1 ? { status: 500, body: { error: 'Boom' } } : response()) })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Ana Ribeiro' })).toBeInTheDocument()
  })

  it('shows the pagination and asks for the next page', async () => {
    const fetchMock = mockApi({
      'GET /nutritionists': () => response({ meta: { page: 1, per_page: 10, total_count: 25, total_pages: 3 } }),
    })
    renderPage()
    await screen.findByRole('heading', { name: 'Ana Ribeiro' })

    await userEvent.click(within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', { name: '2' }))

    expect(new URL(String(fetchMock.mock.calls.at(-1)![0])).searchParams.get('page')).toBe('2')
  })

  describe('schedule appointment modal', () => {
    // 18 November 2026, 8:00. Only Date is faked, so timers and user events keep working.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 10, 18, 8, 0))
    })
    afterEach(() => vi.useRealTimers())

    const noBusySlots = () => ({ body: { busy_slots: [] } })

    async function openModal() {
      renderPage()
      await userEvent.click(await screen.findByRole('button', { name: 'Schedule appointment' }))
      return screen.getByRole('dialog')
    }

    // Name, email, then 20 November at 10:00 am.
    async function fillForm(dialog: HTMLElement, name: string, email: string) {
      await userEvent.type(within(dialog).getByLabelText('Name'), name)
      await userEvent.type(within(dialog).getByLabelText('Email'), email)
      await userEvent.click(await within(dialog).findByRole('button', { name: '20 November 2026' }))
      await userEvent.click(within(dialog).getByRole('button', { name: '10:00 am' }))
    }

    it('sends the request with the chosen service and a UTC date', async () => {
      const fetchMock = mockApi({
        'GET /nutritionists': () => response(),
        'GET /nutritionists/1/busy_slots': noBusySlots,
        'POST /appointment_requests': () => ({ status: 201, body: { id: 1 } }),
      })
      const dialog = await openModal()
      await fillForm(dialog, 'Maria', 'maria@example.com')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }))

      expect(await screen.findByText('Request sent!')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('20th november 2026 at 10:00 am')
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
      expect(JSON.parse(String(post[1]!.body))).toEqual({
        service_id: 10,
        guest_name: 'Maria',
        guest_email: 'maria@example.com',
        starts_at: new Date(2026, 10, 20, 10, 0).toISOString(),
      })
    })

    it('asks for a date and time before sending', async () => {
      const fetchMock = mockApi({ 'GET /nutritionists': () => response(), 'GET /nutritionists/1/busy_slots': noBusySlots })
      const dialog = await openModal()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Choose a date and time')
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
    })

    it('shows the errors returned by the API and keeps the form', async () => {
      mockApi({
        'GET /nutritionists': () => response(),
        'GET /nutritionists/1/busy_slots': noBusySlots,
        'POST /appointment_requests': () => ({
          status: 422,
          body: { error: 'Validation failed', details: { guest_email: ["can't be blank", 'is invalid'] } },
        }),
      })
      const dialog = await openModal()
      await userEvent.type(within(dialog).getByLabelText('Name'), 'Maria')
      await userEvent.click(await within(dialog).findByRole('button', { name: '20 November 2026' }))
      await userEvent.click(within(dialog).getByRole('button', { name: '10:00 am' }))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }))

      const alert = await within(dialog).findByRole('alert')
      expect(alert).toHaveTextContent("Email can't be blank")
      expect(alert).not.toHaveTextContent('Email is invalid')
      expect(within(dialog).getByLabelText('Name')).toHaveValue('Maria')
      expect(within(dialog).getByRole('button', { name: '10:00 am' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('closes with Escape', async () => {
      mockApi({ 'GET /nutritionists': () => response(), 'GET /nutritionists/1/busy_slots': noBusySlots })
      await openModal()

      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
