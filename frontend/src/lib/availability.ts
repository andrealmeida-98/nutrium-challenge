import type { BusySlot } from '../api/types'

// There is no per-nutritionist schedule yet, so everyone works the same hours
// (browser time). The API does not enforce this: it only blocks accepted times.
export const WORKING_HOURS = { start: 9, end: 18 }
export const SLOT_STEP_MINUTES = 30

export type Slot = { start: Date; available: boolean }

// A slot is free when it is in the future and does not overlap an accepted request.
// Ranges are half-open, like in the API: 10:00-11:00 and 11:00-12:00 do not collide.
export function slotsForDay(day: Date, durationMinutes: number, busy: BusySlot[], now = new Date()): Slot[] {
  const year = day.getFullYear()
  const month = day.getMonth()
  const date = day.getDate()
  const dayEnd = new Date(year, month, date, WORKING_HOURS.end)
  const taken = busy.map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }))

  const slots: Slot[] = []
  for (let minutes = WORKING_HOURS.start * 60; ; minutes += SLOT_STEP_MINUTES) {
    const start = new Date(year, month, date, 0, minutes)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    if (end > dayEnd) break

    const overlaps = taken.some((t) => t.start < end && start < t.end)
    slots.push({ start, available: start > now && !overlaps })
  }
  return slots
}

export function isDayAvailable(day: Date, durationMinutes: number, busy: BusySlot[], now = new Date()): boolean {
  return slotsForDay(day, durationMinutes, busy, now).some((slot) => slot.available)
}

// Days to draw for a month, Monday first. `null` fills the empty cells before the 1st.
export function monthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const leading = (new Date(year, m, 1).getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, m + 1, 0).getDate()

  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, m, i + 1)),
  ]
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
