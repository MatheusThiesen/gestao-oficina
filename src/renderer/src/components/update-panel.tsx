import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@shared/format'
import type { UpdateStatus } from '@shared/updates'
import { Button } from '@/components/ui/button'
import { useUpdateStatus } from '@/hooks/use-update-status'
import { call } from '@/lib/ipc'

function describe(s: UpdateStatus): string {
  switch (s.state) {
    case 'disabled':
      return 'Atualizações automáticas funcionam só no programa instalado.'
    case 'checking':
      return 'Verificando…'
    case 'up-to-date':
      return 'Você está na versão mais recente.'
    case 'downloading':
      return `Baixando a versão ${s.version} (${s.percent ?? 0}%).`
    case 'ready':
      return `Versão ${s.version} baixada. Reinicie para instalar.`
    case 'error':
      return s.error ?? 'Não foi possível verificar atualizações.'
    default:
      return 'O programa verifica sozinho ao abrir e a cada 4 horas.'
  }
}

/** Seção "Atualizações" da tela Configurações. */
export function UpdatePanel() {
  const status = useUpdateStatus()
  const [busy, setBusy] = useState(false)
  if (!status) return null

  async function check() {
    setBusy(true)
    await call('updates:check').catch(() => undefined)
    setBusy(false)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="m-0">
          Versão instalada: <strong>{status.currentVersion}</strong>
        </p>
        <p className={status.state === 'error' ? 'm-0 text-brand-text' : 'm-0 text-muted'}>
          {describe(status)}
          {status.checkedAt && status.state !== 'checking' && ` Última verificação: ${formatDate(status.checkedAt)}.`}
        </p>
      </div>
      {status.state === 'ready' ? (
        <Button variant="primary" onClick={() => void call('updates:install')}>
          <RefreshCw size={15} aria-hidden="true" />
          Reiniciar e atualizar
        </Button>
      ) : (
        <Button onClick={check} disabled={busy || status.state === 'disabled' || status.state === 'checking' || status.state === 'downloading'}>
          <RefreshCw size={15} aria-hidden="true" />
          Verificar agora
        </Button>
      )}
    </div>
  )
}
