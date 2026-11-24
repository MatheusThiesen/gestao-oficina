import { Link } from 'react-router-dom'
import type { KeyTagView } from '@shared/documents'
import { formatDocNumber, formatKeyTag } from '@shared/format'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'

export function KeysPage() {
  const { data: keys = [], error } = useIpcQuery(() => call('keyTags:list'), [])
  const inUse = keys.filter((k) => k.inUse).length

  return (
    <>
      <PageHeader
        title="Chaves"
        aside={
          <span className="text-[13px] text-muted">
            {keys.length - inUse} livres, {inUse} em uso
          </span>
        }
      />
      {error && <p className="text-brand-text">Não foi possível carregar as chaves: {error}</p>}
      <Panel>
        <PanelHeader>
          Chaveiros e tags de retrovisor
          <span className="flex items-center gap-4 text-[12.5px] font-normal text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-line-strong bg-white" /> Livre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-side" /> Em uso
            </span>
          </span>
        </PanelHeader>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 bg-bg/60 p-4">
          {keys.map((k) => (
            <KeyTagCard key={k.number} tag={k} />
          ))}
        </div>
      </Panel>
    </>
  )
}

function KeyTagCard({ tag }: { tag: KeyTagView }) {
  const label = formatKeyTag(tag.number)
  if (!tag.inUse) {
    return (
      <div className="keytag">
        <span className="kt-num">{label}</span>
        <span className="text-[12px] text-muted">Livre</span>
      </div>
    )
  }
  const { inUse } = tag
  return (
    <Link
      to={`/orcamentos/${inUse.quoteId}`}
      className={cn('keytag in-use hover:no-underline hover:ring-2 hover:ring-brand/60')}
      title={`OS ${formatDocNumber(inUse.workOrderNumber)} · ${inUse.customerName}`}
    >
      <span className="kt-num">{label}</span>
      <Plate plate={inUse.plate} className="scale-90" />
      <span className="max-w-full truncate text-[12px]">{inUse.customerName}</span>
      <span className={cn('tag', inUse.status === 'PRONTO' ? 't-pronto' : 't-execucao')}>
        {inUse.status === 'PRONTO' ? 'Pronto' : 'Em execução'}
      </span>
    </Link>
  )
}
