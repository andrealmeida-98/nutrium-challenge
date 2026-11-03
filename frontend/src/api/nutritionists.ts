import { request } from './client'
import type { BusySlot, City, PendingResponse, SearchResponse } from './types'

export function searchNutritionists(
  params: { q: string; location: string; page: number; perPage?: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ page: String(params.page) })
  if (params.q) query.set('q', params.q)
  if (params.location) query.set('location', params.location)
  if (params.perPage) query.set('per_page', String(params.perPage))
  return request<SearchResponse>(`/nutritionists?${query}`, { signal })
}

export function fetchPendingRequests(nutritionistId: number | string, signal?: AbortSignal) {
  return request<PendingResponse>(`/nutritionists/${nutritionistId}/appointment_requests`, { signal })
}

// Times of the nutritionist that are already taken between `from` and `to`.
export function fetchBusySlots(nutritionistId: number | string, from: Date, to: Date, signal?: AbortSignal) {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  return request<{ busy_slots: BusySlot[] }>(`/nutritionists/${nutritionistId}/busy_slots?${query}`, { signal })
}

// Cities whose name contains `text`, for the location autocomplete.
export function fetchCities(text: string, signal?: AbortSignal) {
  return request<{ cities: City[] }>(`/cities?${new URLSearchParams({ q: text })}`, { signal })
}
