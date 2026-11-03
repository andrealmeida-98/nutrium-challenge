import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n, { detectLanguage } from './index'
import en from './en'
import pt from './pt'

// The type of `pt` already forces the same keys, this also checks the values at run time.
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, shape(v)]))
  }
  return typeof value
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/{{\s*(\w+)\s*}}|<(\w+)>/g)].map((m) => m[1] ?? m[2]).sort()
}

function flatten(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => flatten(v, path ? `${path}.${key}` : key))
  }
  return []
}

describe('translations', () => {
  it('Portuguese has the same keys and structure as English', () => {
    expect(shape(pt)).toEqual(shape(en))
  })

  it('every Portuguese text keeps the same {{placeholders}} and <tags> as the English one', () => {
    const english = new Map(flatten(en))
    for (const [key, text] of flatten(pt)) {
      expect(placeholders(text), key).toEqual(placeholders(english.get(key)!))
    }
  })

  it('has no empty texts', () => {
    for (const [key, text] of [...flatten(en), ...flatten(pt)]) {
      expect(text.trim(), key).not.toBe('')
    }
  })

  it('picks the right plural form in both languages', () => {
    expect(i18n.t('pending.overlap', { count: 1, lng: 'en' })).toBe('1 overlapping request was rejected automatically.')
    expect(i18n.t('pending.overlap', { count: 3, lng: 'en' })).toBe('3 overlapping requests were rejected automatically.')
    expect(i18n.t('pending.overlap', { count: 1, lng: 'pt' })).toBe('1 pedido sobreposto foi rejeitado automaticamente.')
    expect(i18n.t('pending.overlap', { count: 3, lng: 'pt' })).toBe('3 pedidos sobrepostos foram rejeitados automaticamente.')
  })
})

describe('detectLanguage', () => {
  // The test setup saves "en" every time it resets the language.
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses the browser language when nothing was chosen', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-PT')
    expect(detectLanguage()).toBe('pt')

    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
    expect(detectLanguage()).toBe('en')
  })

  it('prefers the language the user chose', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-PT')
    localStorage.setItem('lang', 'en')

    expect(detectLanguage()).toBe('en')
  })

  it('ignores a saved language that does not exist', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB')
    localStorage.setItem('lang', 'xx')

    expect(detectLanguage()).toBe('en')
  })
})
