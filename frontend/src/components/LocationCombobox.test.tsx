import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { mockApi } from '../test/mockApi'
import LocationCombobox from './LocationCombobox'

const cities = [
  { id: 1, name: 'Portalegre' },
  { id: 2, name: 'Portimão' },
  { id: 3, name: 'Porto' },
]

// The page keeps the state; this does the same for the tests.
function Harness({ invalid = false }: { invalid?: boolean }) {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <>
      <LocationCombobox
        text={text}
        selected={selected}
        invalid={invalid}
        onTextChange={(value) => {
          setText(value)
          setSelected(null)
        }}
        onSelect={(name) => {
          setText(name)
          setSelected(name)
        }}
      />
      <output data-testid="selected">{selected ?? 'none'}</output>
    </>
  )
}

const input = () => screen.getByRole('combobox', { name: 'Location' })
const cityRequests = (fetchMock: ReturnType<typeof mockApi>) => fetchMock.mock.calls.filter(([url]) => String(url).includes('/cities'))

describe('LocationCombobox', () => {
  it('asks the API and lists the cities that match what is typed', async () => {
    const fetchMock = mockApi({ 'GET /cities': () => ({ body: { cities } }) })
    render(<Harness />)

    await userEvent.type(input(), 'port')

    expect(await screen.findAllByRole('option')).toHaveLength(3)
    expect(new URL(String(cityRequests(fetchMock).at(-1)![0])).searchParams.get('q')).toBe('port')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not ask for anything while the field is empty', async () => {
    const fetchMock = mockApi({ 'GET /cities': () => ({ body: { cities } }) })
    render(<Harness />)

    await userEvent.click(input())
    await userEvent.type(input(), '  ')

    expect(cityRequests(fetchMock)).toHaveLength(0)
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('picks a city with the mouse, fills the field and closes the list', async () => {
    mockApi({ 'GET /cities': () => ({ body: { cities } }) })
    render(<Harness />)
    await userEvent.type(input(), 'port')

    await userEvent.click(await screen.findByRole('option', { name: 'Portimão' }))

    expect(input()).toHaveValue('Portimão')
    expect(screen.getByTestId('selected')).toHaveTextContent('Portimão')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('does not ask again after a city is picked', async () => {
    const fetchMock = mockApi({ 'GET /cities': () => ({ body: { cities } }) })
    render(<Harness />)
    await userEvent.type(input(), 'port')
    await userEvent.click(await screen.findByRole('option', { name: 'Porto' }))
    const calls = cityRequests(fetchMock).length

    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(cityRequests(fetchMock)).toHaveLength(calls)
  })

  it('works with the keyboard: arrows move, Enter picks, Escape closes', async () => {
    mockApi({ 'GET /cities': () => ({ body: { cities } }) })
    render(<Harness />)
    await userEvent.type(input(), 'port')
    await screen.findAllByRole('option')

    // The first one starts highlighted.
    expect(screen.getByRole('option', { name: 'Portalegre' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Porto' })).toHaveAttribute('aria-selected', 'true')
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Porto' }).id)
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: 'Portimão' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{Enter}')
    expect(screen.getByTestId('selected')).toHaveTextContent('Portimão')
  })

  it('Escape closes the list without picking anything', async () => {
    mockApi({ 'GET /cities': () => ({ body: { cities } }) })
    render(<Harness />)
    await userEvent.type(input(), 'port')
    await screen.findAllByRole('option')

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByTestId('selected')).toHaveTextContent('none')
  })

  it('says so when no city matches', async () => {
    mockApi({ 'GET /cities': () => ({ body: { cities: [] } }) })
    render(<Harness />)

    await userEvent.type(input(), 'xpto')

    expect(await screen.findByText('No cities found')).toBeInTheDocument()
  })

  it('shows nothing, and does not break, when the API fails', async () => {
    mockApi({ 'GET /cities': () => ({ status: 500, body: { error: 'Boom' } }) })
    render(<Harness />)

    await userEvent.type(input(), 'port')

    await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument())
    expect(input()).toBeInTheDocument()
  })

  it('shows the error under the field when asked to', () => {
    mockApi({})
    render(<Harness invalid />)

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a city from the list.')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription('Choose a city from the list.')
  })
})
