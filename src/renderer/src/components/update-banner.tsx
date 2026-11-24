import { Download, RefreshCw } from 'lucide-react'
import { useUpdateStatus } from '@/hooks/use-update-status'
import { call } from '@/lib/ipc'

/** Aviso no menu quando há versão nova baixando ou pronta para instalar. */
export function UpdateBanner() {
  const status = useUpdateStatus()
  if (!status || (status.state !== 'ready' && status.state !== 'downloading')) return null

  if (status.state === 'downloading') {
    return (
      <div className="mx-3 mb-3 flex items-center gap-2 rounded-md bg-side-hover px-3 py-2 text-[12.5px]">
        <Download size={14} aria-hidden="true" />
        Baixando versão {status.version} ({status.percent ?? 0}%)
      </div>
    )
  }
  return (
    <div className="mx-3 mb-3 rounded-md border border-brand bg-side-hover p-3 text-[12.5px]">
      <p className="m-0 mb-2 text-side-strong">Versão {status.version} pronta.</p>
      <button
        type="button"
        onClick={() => void call('updates:install')}
        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border-0 bg-brand font-semibold text-brand-fg hover:bg-brand-hover"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Reiniciar e atualizar
      </button>
      <p className="m-0 mt-1.5 text-side-foot">Ou ela é instalada ao fechar o programa.</p>
    </div>
  )
}
