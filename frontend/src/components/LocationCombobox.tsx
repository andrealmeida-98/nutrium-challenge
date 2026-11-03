import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCities } from '../api/nutritionists'
import type { City } from '../api/types'
import { LocateIcon } from './icons'

type Props = {
  text: string // what is typed in the field
  selected: string | null // the city picked from the list, if any
  invalid: boolean // text was typed but no city was picked
  onTextChange: (text: string) => void
  onSelect: (name: string) => void
  className?: string
}

const DEBOUNCE_MS = 150

// Location field with suggestions. Free text is not accepted as a place: the guest has to
// pick one of the cities (or leave the field empty, and the search uses Braga).
// Follows the ARIA "combobox with listbox popup" pattern, so it works with a keyboard and screen readers.
export default function LocationCombobox({ text, selected, invalid, onTextChange, onSelect, className = '' }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const listId = `${id}-list`
  const hintId = `${id}-hint`
  const inputRef = useRef<HTMLInputElement>(null)

  const [suggestions, setSuggestions] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  // Ask for suggestions a moment after the guest stops typing. Nothing to ask once a city is picked.
  const query = text.trim()
  const searching = query !== '' && selected === null
  useEffect(() => {
    if (!searching) {
      setSuggestions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchCities(query, controller.signal).then(
        (data) => {
          setSuggestions(data.cities)
          setActive(0)
          setLoading(false)
        },
        (error: Error) => {
          if (error.name === 'AbortError') return
          setSuggestions([]) // without suggestions the guest cannot pick a city, so the field stays empty-handed
          setLoading(false)
        },
      )
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, searching])

  // Typed text that is not a city: go back to the field and show the suggestions again.
  useEffect(() => {
    if (invalid) {
      inputRef.current?.focus()
      setOpen(true)
    }
  }, [invalid])

  function pick(city: City) {
    onSelect(city.name)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (event.key === 'Enter' && open && suggestions[active]) {
      event.preventDefault() // picks the city; a second Enter sends the form
      pick(suggestions[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && searching && suggestions.length > 0
  const showEmpty = open && searching && !loading && suggestions.length === 0

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        role="combobox"
        aria-label={t('search.locationLabel')}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={invalid ? hintId : undefined}
        autoComplete="off"
        value={text}
        placeholder={t('search.locationPlaceholder')}
        onChange={(e) => {
          onTextChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-sm bg-white px-6 py-4 pr-12 text-ink shadow-md outline-none placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-white/70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400"
      />
      <LocateIcon className="pointer-events-none absolute right-5 top-4 text-lg text-brand" />

      <ul
        id={listId}
        role="listbox"
        aria-label={t('search.citiesLabel')}
        hidden={!showList}
        className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-sm bg-white py-1 text-ink shadow-lg"
      >
        {suggestions.map((city, index) => (
          <li
            key={city.id}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === active}
            // mousedown, not click: the input would lose focus (and close the list) before the click
            onMouseDown={(e) => {
              e.preventDefault()
              pick(city)
            }}
            onMouseEnter={() => setActive(index)}
            className={`cursor-pointer px-6 py-2 ${index === active ? 'bg-brand-soft text-brand-dark' : ''}`}
          >
            {city.name}
          </li>
        ))}
      </ul>

      {showEmpty && (
        <p role="status" className="absolute z-20 mt-1 w-full rounded-sm bg-white px-6 py-3 text-sm text-muted shadow-lg">
          {t('search.noCities')}
        </p>
      )}

      {invalid && (
        <p id={hintId} role="alert" className="mt-1 rounded-sm bg-red-600/90 px-3 py-1 text-sm text-white">
          {t('search.locationInvalid')}
        </p>
      )}
    </div>
  )
}
