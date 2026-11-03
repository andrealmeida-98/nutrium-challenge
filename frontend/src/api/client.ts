const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Error returned by the API: { "error": "...", "details": { field: ["message"] } }.
export class ApiError extends Error {
  status: number
  details: Record<string, string[]>

  constructor(status: number, message: string, details: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Could not reach the server. Is the API running?')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? 'Something went wrong', body?.details ?? {})
  }
  return body as T
}
