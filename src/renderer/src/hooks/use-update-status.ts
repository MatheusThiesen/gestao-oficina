import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/updates'
import { call } from '@/lib/ipc'

/** Status da atualização automática, ao vivo (o main avisa cada mudança). */
export function useUpdateStatus(): UpdateStatus | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  useEffect(() => {
    call('updates:status').then(setStatus, () => undefined)
    return window.api.on('updates:status', setStatus)
  }, [])
  return status
}
