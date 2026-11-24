import { STATUS_LABEL, type DocumentStatus } from '@shared/status'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<DocumentStatus, string> = {
  RASCUNHO: 't-rascunho',
  AGUARDANDO_APROVACAO: 't-aguardando',
  APROVADO: 't-aprovado',
  RECUSADO: 't-recusado',
  EXPIRADO: 't-entregue',
  EM_EXECUCAO: 't-execucao',
  PRONTO: 't-pronto',
  ENTREGUE: 't-entregue',
  CANCELADA: 't-recusado'
}

export function StatusTag({ status, className }: { status: DocumentStatus; className?: string }) {
  return <span className={cn('tag', STATUS_CLASS[status], className)}>{STATUS_LABEL[status]}</span>
}

export function ItemTypeTag({ type }: { type: 'PECA' | 'MAO_DE_OBRA' }) {
  return type === 'PECA' ? <span className="tag t-peca">Peça</span> : <span className="tag t-mo">Mão de obra</span>
}
