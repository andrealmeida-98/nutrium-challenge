import { useEffect, useState } from 'react'

type State<T> = { data: T | null; error: Error | null; loading: boolean }

// Loads data when `deps` change and cancels the request that is no longer needed.
// The previous data stays while the next one loads, so the page does not flash empty.
export function useFetch<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    load(controller.signal).then(
      (data) => setState({ data, error: null, loading: false }),
      (error: Error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }))
      },
    )
    return () => controller.abort()
    // `load` is redefined on every render; only `deps` and `version` decide when to fetch.
  }, [...deps, version])

  return {
    ...state,
    reload: () => setVersion((v) => v + 1),
    setData: (data: T) => setState({ data, error: null, loading: false }),
  }
}
