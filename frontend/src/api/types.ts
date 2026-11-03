// Shapes of the JSON returned by the Rails API (see the API section of the README).

export type Service = {
  id: number
  name: string
  price_cents: number
  duration_minutes: number
  city: string
  distance_km: number
}

export type Nutritionist = {
  id: number
  name: string
  license_number: string
  distance_km: number
  services: Service[]
}

export type City = { id: number; name: string }

export type SearchResponse = {
  location: { requested: string | null; resolved: string; fallback: boolean }
  meta: { page: number; per_page: number; total_count: number; total_pages: number }
  nutritionists: Nutritionist[]
}

export type AppointmentRequest = {
  id: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  guest_name: string
  guest_email: string
  starts_at: string
  ends_at: string
  service: { id: number; name: string; price_cents: number; duration_minutes: number; city: string }
  nutritionist: { id: number; name: string }
}

export type PendingResponse = {
  nutritionist: { id: number; name: string }
  appointment_requests: AppointmentRequest[]
}

export type NewAppointmentRequest = {
  service_id: number
  guest_name: string
  guest_email: string
  starts_at: string
}

// A time range already taken by an accepted request (no personal data).
export type BusySlot = { starts_at: string; ends_at: string }
