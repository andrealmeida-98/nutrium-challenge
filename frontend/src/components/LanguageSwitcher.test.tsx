import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { mockApi } from '../test/mockApi'
import SearchPage from '../pages/SearchPage'
import LanguageSwitcher from './LanguageSwitcher'

afterEach(() => localStorage.clear())

const ana = {
  id: 1,
  name: 'Ana Ribeiro',
  license_number: '2963N',
  distance_km: 4.26,
  services: [{ id: 10, name: 'Consulta geral', price_cents: 4000, duration_minutes: 45, city: 'Braga', distance_km: 4.26 }],
}

describe('LanguageSwitcher', () => {
  it('marks the current language', () => {
    render(<LanguageSwitcher />)

    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'PT' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('changes the language, remembers it and sets the page language', async () => {
    render(<LanguageSwitcher />)

    await userEvent.click(screen.getByRole('button', { name: 'PT' }))

    expect(i18n.language).toBe('pt')
    expect(localStorage.getItem('lang')).toBe('pt')
    expect(document.documentElement.lang).toBe('pt')
    expect(screen.getByRole('button', { name: 'PT' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('translates a whole page, including prices, distances and the calendar', async () => {
    mockApi({
      'GET /nutritionists': () => ({
        body: {
          location: { requested: null, resolved: 'Braga', fallback: false },
          meta: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
          nutritionists: [ana],
        },
      }),
      'GET /nutritionists/1/busy_slots': () => ({ body: { busy_slots: [] } }),
    })
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('button', { name: 'Schedule appointment' })).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'PT' })[0])

    expect(screen.getByRole('button', { name: 'Pesquisar' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nome, serviço…')).toBeInTheDocument()
    expect(screen.getByText('Nutricionista • 2963N')).toBeInTheDocument()
    expect(screen.getByText('a 4,3 km de Braga')).toBeInTheDocument()
    expect(screen.getByText('40,00 € · 45 min')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Marcar consulta' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Marcar consulta')
    expect(await screen.findByText('Seg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeInTheDocument()
  })
})
