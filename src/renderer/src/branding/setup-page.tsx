import { useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'
import { useBranding } from './branding-context'
import { SetupWizard } from './setup-wizard'

/** Assistente em tela cheia na primeira abertura (não dá para pular). */
export function SetupPage() {
  const { branding, reload } = useBranding()
  const { data: settings } = useIpcQuery(() => call('settings:get'), [])
  if (!settings) return null
  return <SetupWizard settings={settings} branding={branding} onDone={reload} />
}
