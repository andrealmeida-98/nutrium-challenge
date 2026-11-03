import { render, screen, waitFor, within } from '@testing-library/react'
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
    expect(screen.getByText('Nutritionist • 2963N')).toBeInTheDocument()
    expect(screen.getByText('€ 40.00 · 45 min')).toBeInTheDocument()
    expect(screen.getByText('0.0 km from Braga')).toBeInTheDocument()
  })

  it('shows the price of the service chosen in the dropdown', async () => {
    mockApi({ 'GET /nutritionists': () => response() })
    renderPage()

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Service' }), 'Meal plan')

    expect(screen.getByText('€ 60.00 · 60 min')).toBeInTheDocument()
  })

  describe('location autocomplete', () => {
    const porto = { cities: [{ id: 1, name: 'Porto' }] }
    const nutritionistRequests = (fetchMock: ReturnType<typeof mockApi>) =>
      fetchMock.mock.calls.filter(([url]) => new URL(String(url)).pathname === '/nutritionists')

    async function pickPorto() {
      await userEvent.type(screen.getByLabelText('Location'), 'por')
      await userEvent.click(await screen.findByRole('option', { name: 'Porto' }))
    }

    it('sends the typed search and the city picked from the list', async () => {
      const fetchMock = mockApi({ 'GET /nutritionists': () => response(), 'GET /cities': () => ({ body: porto }) })
      renderPage()
      await screen.findByRole('heading', { name: 'Ana Ribeiro' })

      await userEvent.type(screen.getByLabelText('Name or service'), 'sports')
      await pickPorto()
      await userEvent.click(screen.getByRole('button', { name: 'Search' }))

      const lastUrl = new URL(String(nutritionistRequests(fetchMock).at(-1)![0]))
      expect(lastUrl.searchParams.get('q')).toBe('sports')
      expect(lastUrl.searchParams.get('location')).toBe('Porto')
      expect(lastUrl.searchParams.get('page')).toBe('1')
    })

    it('does not accept free text as a city and asks to choose one', async () => {
      const fetchMock = mockApi({ 'GET /nutritionists': () => response(), 'GET /cities': () => ({ body: porto }) })
      renderPage()
      await screen.findByRole('heading', { name: 'Ana Ribeiro' })
      const before = nutritionistRequests(fetchMock).length

      await userEvent.type(screen.getByLabelText('Location'), 'Xpto')
      await userEvent.click(screen.getByRole('button', { name: 'Search' }))

      expect(await screen.findByText('Choose a city from the list.')).toBeInTheDocument()
      expect(screen.getByLabelText('Location')).toHaveAttribute('aria-invalid', 'true')
      expect(nutritionistRequests(fetchMock)).toHaveLength(before) // nothing was searched
    })

    it('takes the error away once a city is picked', async () => {
      mockApi({ 'GET /nutritionists': () => response(), 'GET /cities': () => ({ body: porto }) })
      renderPage()
      await screen.findByRole('heading', { name: 'Ana Ribeiro' })
      await userEvent.type(screen.getByLabelText('Location'), 'por')
      await userEvent.click(screen.getByRole('button', { name: 'Search' }))
      expect(await screen.findByText('Choose a city from the list.')).toBeInTheDocument()

      await userEvent.click(await screen.findByRole('option', { name: 'Porto' }))

      expect(screen.queryByText('Choose a city from the list.')).not.toBeInTheDocument()
    })

    it('searches near Braga when the location is left empty', async () => {
      const fetchMock = mockApi({ 'GET /nutritionists': () => response() })
      renderPage()
      await screen.findByRole('heading', { name: 'Ana Ribeiro' })

      await userEvent.type(screen.getByLabelText('Name or service'), 'ana')
      await userEvent.click(screen.getByRole('button', { name: 'Search' }))

      const lastUrl = new URL(String(nutritionistRequests(fetchMock).at(-1)![0]))
      expect(lastUrl.searchParams.get('q')).toBe('ana')
      expect(lastUrl.searchParams.has('location')).toBe(false)
    })

    it('forgets the picked city when the text is edited', async () => {
      const fetchMock = mockApi({ 'GET /nutritionists': () => response(), 'GET /cities': () => ({ body: porto }) })
      renderPage()
      await screen.findByRole('heading', { name: 'Ana Ribeiro' })
      await pickPorto()

      await userEvent.type(screen.getByLabelText('Location'), 'x') // "Portox" is not a city
      await userEvent.click(screen.getByRole('button', { name: 'Search' }))

      expect(await screen.findByText('Choose a city from the list.')).toBeInTheDocument()
      expect(nutritionistRequests(fetchMock).every(([url]) => !String(url).includes('location=Portox'))).toBe(true)
    })

    it('starts with the city in the address', async () => {
      mockApi({ 'GET /nutritionists': () => response() })
      renderPage('/?location=Faro')

      expect(screen.getByLabelText('Location')).toHaveValue('Faro')
      expect(screen.queryByText('Choose a city from the list.')).not.toBeInTheDocument()
    })
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

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
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

    // The days are disabled until the times taken have been loaded.
    const calendarLoaded = (dialog: HTMLElement) =>
      waitFor(() => expect(within(dialog).getByRole('group', { name: 'Date and time' })).toHaveAttribute('aria-busy', 'false'))

    // Name, email, then 20 November at 10:00 am.
    async function fillForm(dialog: HTMLElement, name: string, email: string) {
      await userEvent.type(within(dialog).getByLabelText('Name'), name)
      await userEvent.type(within(dialog).getByLabelText('Email'), email)
      await calendarLoaded(dialog)
      await userEvent.click(within(dialog).getByRole('button', { name: '20 November 2026' }))
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
      await calendarLoaded(dialog)
      await userEvent.click(within(dialog).getByRole('button', { name: '20 November 2026' }))
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
