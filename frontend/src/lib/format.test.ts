import { describe, expect, it } from 'vitest'
import { visiblePages } from '../components/Pagination'
import { formatDate, formatDistance, formatPrice, formatTime, initials } from './format'

// Dates are built in local time, so the tests do not depend on the machine's time zone.
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString()

describe('format', () => {
  it('formats a price in euros from cents', () => {
    expect(formatPrice(2500)).toBe('€\u00a025.00')
    expect(formatPrice(4050)).toBe('€\u00a040.50')
  })

  it('formats the date like the mockup, with ordinals', () => {
    expect(formatDate(local(2025, 12, 21))).toBe('21st december 2025')
    expect(formatDate(local(2026, 11, 2))).toBe('2nd november 2026')
    expect(formatDate(local(2026, 11, 3))).toBe('3rd november 2026')
    expect(formatDate(local(2026, 11, 11))).toBe('11th november 2026')
    expect(formatDate(local(2026, 11, 22))).toBe('22nd november 2026')
  })

  it('formats the time like the mockup', () => {
    expect(formatTime(local(2025, 12, 21, 9, 30))).toBe('9:30 am')
    expect(formatTime(local(2025, 12, 21, 15, 5))).toBe('3:05 pm')
    expect(formatTime(local(2025, 12, 21, 0, 0))).toBe('12:00 am')
    expect(formatTime(local(2025, 12, 21, 12, 0))).toBe('12:00 pm')
  })

  it('formats distances', () => {
    expect(formatDistance(0)).toBe('0.0 km')
    expect(formatDistance(15.94)).toBe('16 km')
    expect(formatDistance(4.26)).toBe('4.3 km')
  })

  it('takes up to two initials', () => {
    expect(initials('Ana Ribeiro')).toBe('AR')
    expect(initials('maria')).toBe('M')
    expect(initials('Ana Maria Silva')).toBe('AM')
  })
})

describe('visiblePages', () => {
  it('shows every page when there are few', () => {
    expect(visiblePages(1, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('shows a window around the current page when there are many', () => {
    expect(visiblePages(1, 20)).toEqual([1, 2, 3, 4, 5])
    expect(visiblePages(10, 20)).toEqual([8, 9, 10, 11, 12])
    expect(visiblePages(20, 20)).toEqual([16, 17, 18, 19, 20])
  })
})

describe('format in Portuguese', () => {
  it('formats prices the Portuguese way', () => {
    expect(formatPrice(2500, 'pt')).toBe('25,00 €')
  })

  it('formats the date in words, in Portuguese', () => {
    expect(formatDate(local(2025, 12, 21), 'pt')).toBe('21 de dezembro de 2025')
    expect(formatDate(local(2026, 11, 2), 'pt')).toBe('2 de novembro de 2026')
  })

  it('uses a 24 hour clock', () => {
    expect(formatTime(local(2025, 12, 21, 9, 30), 'pt')).toBe('09:30')
    expect(formatTime(local(2025, 12, 21, 15, 5), 'pt')).toBe('15:05')
  })

  it('uses a decimal comma for distances', () => {
    expect(formatDistance(4.26, 'pt')).toBe('4,3 km')
    expect(formatDistance(15.94, 'pt')).toBe('16 km')
  })
})
