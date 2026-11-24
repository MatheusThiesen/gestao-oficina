import { useCallback, useEffect, useState } from 'react'

/** Mensagem curta de confirmação ("Cliente salvo.") que some sozinha. */
export function useFlash(ms = 2500): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), ms)
    return () => clearTimeout(timer)
  }, [message, ms])
  const show = useCallback((m: string) => setMessage(m), [])
  return [message, show]
}
