import { Archive, FolderOpen, HardDriveDownload, Upload } from 'lucide-react'
import { formatDate } from '@shared/format'
import { Flash, FormError } from '@/components/flash'
import { Button } from '@/components/ui/button'
import { useFlash } from '@/hooks/use-flash'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'

/** Seção "Backup" da tela Configurações. */
export function BackupPanel() {
  const { data: status, reload } = useIpcQuery(() => call('backup:status'), [])
  const submit = useSubmit()
  const [flash, showFlash] = useFlash(3500)

  async function backupNow() {
    if (await submit.run(() => call('backup:create'))) {
      showFlash('Backup feito.')
      reload()
    }
  }

  async function saveAs() {
    const saved = await submit.run(() => call('backup:saveAs'))
    if (saved) showFlash('Cópia salva.')
  }

  async function restore() {
    // Se confirmar, o programa reinicia com os dados importados.
    await submit.run(() => call('backup:restore'))
  }

  return (
    <div className="flex flex-col gap-4">
      <FormError message={submit.error} />
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-10 flex-none place-items-center rounded-lg bg-bg text-muted">
          <Archive size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0">
            {status?.lastBackupAt ? (
              <>
                Último backup: <strong>{formatDate(status.lastBackupAt)}</strong> às{' '}
                {new Date(status.lastBackupAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              'Nenhum backup ainda.'
            )}
          </p>
          <p className="m-0 truncate text-[12.5px] text-muted" title={status?.folder}>
            Automático todo dia, guardando os últimos 30, em {status?.folderLabel ?? '…'}
          </p>
        </div>
        <Flash message={flash} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={backupNow} disabled={submit.busy}>
          <Archive size={15} aria-hidden="true" />
          Fazer backup agora
        </Button>
        <Button onClick={saveAs} disabled={submit.busy} title="Para levar num pen drive ou guardar na nuvem">
          <HardDriveDownload size={15} aria-hidden="true" />
          Salvar cópia em…
        </Button>
        <Button onClick={() => void call('backup:openFolder')}>
          <FolderOpen size={15} aria-hidden="true" />
          Abrir pasta
        </Button>
      </div>

      <div className="rounded-md border border-line bg-bg/60 p-3">
        <p className="m-0 font-semibold">Trocando de computador?</p>
        <p className="mt-0.5 mb-2.5 text-[13px] text-muted">
          No computador antigo, use “Salvar cópia em…” e leve o arquivo. No novo, instale o programa e escolha
          “Importar backup” na primeira tela, ou use o botão abaixo. Os dados deste computador serão substituídos (uma
          cópia fica guardada).
        </p>
        <Button onClick={restore} disabled={submit.busy}>
          <Upload size={15} aria-hidden="true" />
          Restaurar backup…
        </Button>
      </div>
    </div>
  )
}
