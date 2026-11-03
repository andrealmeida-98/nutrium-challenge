import { describe, expect, it } from 'vitest'
import { isDayAvailable, isSameDay, monthGrid, slotsForDay, WORKING_HOURS } from './availability'

const day = new Date(2026, 10, 20) // Friday, 20 November 2026
const earlier = new Date(2026, 10, 1, 8, 0) // "now" is long before, so nothing has passed
const at = (h: number, m = 0) => new Date(2026, 10, 20, h, m)
const busy = (from: Date, to: Date) => ({ starts_at: from.toISOString(), ends_at: to.toISOString() })
const hours = (slots: { start: Date; available: boolean }[]) => slots.map((s) => s.start.getHours() + s.start.getMinutes() / 60)

describe('slotsForDay', () => {
  it('has a slot every 30 minutes, and the service has to finish before closing', () => {
    const sixty = slotsForDay(day, 60, [], earlier)
    expect(hours(sixty)[0]).toBe(WORKING_HOURS.start)
    expect(hours(sixty).at(-1)).toBe(WORKING_HOURS.end - 1) // 17:00 + 60 min = 18:00
    expect(sixty).toHaveLength(17)

    const thirty = slotsForDay(day, 30, [], earlier)
    expect(hours(thirty).at(-1)).toBe(17.5)
    expect(thirty).toHaveLength(18)
  })

  it('blocks the slots that overlap an accepted request', () => {
    // Accepted 10:00-11:00. With a 60 min service, 9:30, 10:00 and 10:30 collide.
    const slots = slotsForDay(day, 60, [busy(at(10), at(11))], earlier)
    const blocked = slots.filter((s) => !s.available)

    expect(hours(blocked)).toEqual([9.5, 10, 10.5])
  })

  it('treats ranges as half-open: a slot that starts when another ends is free', () => {
    const slots = slotsForDay(day, 60, [busy(at(10), at(11))], earlier)

    expect(slots.find((s) => s.start.getTime() === at(9).getTime())?.available).toBe(true) // ends at 10:00
    expect(slots.find((s) => s.start.getTime() === at(11).getTime())?.available).toBe(true) // starts at 11:00
  })

  it('blocks according to the duration of the service being booked', () => {
    // Accepted 10:00-10:30. A 30 min service fits at 9:30 and 10:30, a 60 min one does not fit at 9:30.
    const accepted = [busy(at(10), at(10, 30))]
    const free = (minutes: number, h: number, m: number) =>
      slotsForDay(day, minutes, accepted, earlier).find((s) => s.start.getTime() === at(h, m).getTime())?.available

    expect(free(30, 9, 30)).toBe(true)
    expect(free(60, 9, 30)).toBe(false)
    expect(free(30, 10, 30)).toBe(true)
  })

  it('does not offer times that have already passed', () => {
    const slots = slotsForDay(day, 60, [], at(12, 15))

    expect(slots.filter((s) => s.available).map((s) => s.start.getHours() + s.start.getMinutes() / 60)[0]).toBe(12.5)
    expect(slots.find((s) => s.start.getTime() === at(12).getTime())?.available).toBe(false)
  })

  it('has no slots when the service is longer than the working day', () => {
    expect(slotsForDay(day, 10 * 60, [], earlier)).toEqual([])
  })
})

describe('isDayAvailable', () => {
  it('is false once every slot is taken', () => {
    expect(isDayAvailable(day, 60, [busy(at(9), at(18))], earlier)).toBe(false)
  })

  it('is true while at least one slot is free', () => {
    expect(isDayAvailable(day, 60, [busy(at(9), at(17))], earlier)).toBe(true)
  })

  it('is false for a day in the past and for today after the last slot', () => {
    expect(isDayAvailable(new Date(2026, 10, 10), 60, [], at(8))).toBe(false)
    expect(isDayAvailable(day, 60, [], at(17, 30))).toBe(false)
  })
})

describe('monthGrid', () => {
  it('starts on Monday and pads the first week', () => {
    const grid = monthGrid(new Date(2026, 10, 15)) // 1 Nov 2026 is a Sunday: 6 empty cells first
    expect(grid.slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(grid[6]).toEqual(new Date(2026, 10, 1))
    expect(grid).toHaveLength(6 + 30)
  })

  it('has no empty cells when the month starts on a Monday', () => {
    const grid = monthGrid(new Date(2026, 5, 1)) // 1 June 2026 is a Monday
    expect(grid[0]).toEqual(new Date(2026, 5, 1))
    expect(grid).toHaveLength(30)
  })
})

describe('isSameDay', () => {
  it('compares the calendar day, not the time', () => {
    expect(isSameDay(at(9), at(17))).toBe(true)
    expect(isSameDay(at(9), new Date(2026, 10, 21, 9))).toBe(false)
  })
})
