import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/ipc'
import { call } from '@/lib/ipc'

export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    call('app:info').then(setInfo, console.error)
  }, [])
  return info
}
