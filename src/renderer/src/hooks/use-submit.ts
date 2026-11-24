import { useState } from 'react'
import { IpcError } from '@/lib/ipc'

interface SubmitState {
  busy: boolean
  error: string | null
  fields: Record<string, string>
  run: <T>(action: () => Promise<T>, onFieldErrors?: (fields: Record<string, string>) => void) => Promise<T | undefined>
  clear: () => void
}

/** Executa uma ação no main guardando erro geral e erros por campo para o formulário. */
export function useSubmit(): SubmitState {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  async function run<T>(
    action: () => Promise<T>,
    onFieldErrors?: (fields: Record<string, string>) => void
  ): Promise<T | undefined> {
    setBusy(true)
    setError(null)
    setFields({})
    try {
      return await action()
    } catch (err) {
      if (err instanceof IpcError) {
        setFields(err.fields)
        onFieldErrors?.(err.fields)
        setError(Object.keys(err.fields).length > 0 ? 'Corrija os campos destacados.' : err.message)
      } else setError(err instanceof Error ? err.message : String(err))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, fields, run, clear: () => (setError(null), setFields({})) }
}
