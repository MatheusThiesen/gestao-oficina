import type { DocumentStatus } from './status'

export const DOCUMENT_FILTERS = [
  'TODOS',
  'RASCUNHO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'EM_EXECUCAO',
  'PRONTO',
  'ENTREGUE',
  'RECUSADO'
] as const
export type DocumentFilter = (typeof DOCUMENT_FILTERS)[number]

export interface DocumentListQuery {
  search?: string
  filter?: DocumentFilter
}

/** Linha da lista "Orçamentos e OS": a versão vigente do orçamento e a OS, se houver. */
export interface DocumentListItem {
  quoteId: number
  quoteNumber: number
  quoteVersion: number
  workOrderNumber: number | null
  date: string // ISO
  customerName: string
  plate: string
  vehicleLabel: string
  keyTagNumber: number | null
  status: DocumentStatus
  totalCents: number
}

export interface DocumentListResult {
  items: DocumentListItem[]
  counts: Record<DocumentFilter, number>
}

export interface KeyTagView {
  number: number
  inUse: {
    workOrderNumber: number
    quoteId: number
    plate: string
    customerName: string
    status: 'EM_EXECUCAO' | 'PRONTO'
  } | null
}
