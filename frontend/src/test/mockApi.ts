import { vi } from 'vitest'

type Handler = (url: URL, init: RequestInit) => { status?: number; body: unknown }

// Replaces fetch with a fake API. Handlers are keyed by "METHOD /path".
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input))
    const key = `${init.method ?? 'GET'} ${url.pathname}`
    const handler = handlers[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    const { status = 200, body } = handler(url, init)
    return new Response(JSON.stringify(body), { status })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
