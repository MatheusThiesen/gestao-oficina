import { useCallback, useEffect, useRef, useState } from 'react'

interface QueryState<T> {
  data: T | undefined
  error: string | null
  reload: () => void
}

/** Busca dados no main sempre que `deps` mudam; descarta respostas antigas fora de ordem. */
export function useIpcQuery<T>(fetcher: () => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    const id = ++requestId.current
    fetcherRef.current().then(
      (result) => {
        if (id !== requestId.current) return
        setData(result)
        setError(null)
      },
      (err: unknown) => {
        if (id !== requestId.current) return
        setError(err instanceof Error ? err.message : String(err))
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, reload }
}

/** Atrasa o valor (ex.: busca enquanto digita). */
export function useDebounced<T>(value: T, ms = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}
